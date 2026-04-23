-- ============================================================
-- HOME FINANCES APP — LEDGER-MODEL REWRITE
-- Migration: 0015_ledger_rewrite.sql
-- ============================================================
-- This is a nuclear reset that drops the entire schema from
-- 0001-0014 and rebuilds it around the ledger model:
--
--   - A single `entries` table replaces `bill_instances` +
--     `one_off_expenses`. Recurring templates expand virtually
--     at query time; `entries` only stores exceptions (paid,
--     overridden, skipped) plus one-offs (template_id NULL).
--   - `months` is gone. A tiny `month_unlocks` side table holds
--     past-month unlock reasons; lock state is computed from
--     the current date and the presence of a row.
--   - `income_entries` and `savings_contributions` drop their
--     `month_id` in favor of a plain `date` column; the monthly
--     view filters by date range.
--   - Templates gain an optional `category` column for default
--     categorization of generated entries.
--
-- The "wipe data" decision makes this safe: no migration of
-- rows, just drop-and-recreate. The prose history of the 0001-
-- 0014 evolution lives in history.md.
--
-- In the follow-up cleanup commit, this file will be renamed
-- `0001_baseline.sql`, the DROP block will be removed (there's
-- nothing to drop on a fresh database), and 0001-0014 will be
-- deleted. For now, this coexists with them so `supabase db
-- reset` remains runnable.
-- ============================================================


-- ============================================================
-- SECTION 0 — DROP EVERYTHING FROM THE PRIOR MODEL
-- Order: dependents first, then the tables they reference.
-- CASCADE handles policies, indexes, and FK dependents.
-- ============================================================
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;

drop table if exists public.savings_contributions cascade;
drop table if exists public.savings_funds          cascade;
drop table if exists public.one_off_expenses       cascade;
drop table if exists public.bill_instances         cascade;
drop table if exists public.income_entries         cascade;
drop table if exists public.months                 cascade;
drop table if exists public.recurring_bill_templates cascade;
drop table if exists public.invitations            cascade;
drop table if exists public.space_members          cascade;
drop table if exists public.spaces                 cascade;

drop function if exists public.is_active_member(uuid)        cascade;
drop function if exists public.is_space_owner(uuid)          cascade;
drop function if exists public.can_read_space(uuid)          cascade;
drop function if exists public.is_space_creator(uuid)        cascade;
drop function if exists public.has_accepted_invitation(uuid) cascade;


-- ============================================================
-- SECTION 1 — TABLES
-- Order: spaces → space_members → invitations → templates →
--        entries / month_unlocks / income_entries /
--        savings_funds → savings_contributions
-- ============================================================

-- --- spaces --------------------------------------------------
create table public.spaces (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  type            text not null check (type in ('personal', 'shared')),
  created_by      uuid not null references auth.users(id) on delete cascade,
  parent_space_id uuid references public.spaces(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- --- space_members -------------------------------------------
-- Rows are never hard deleted; left_at is set instead so past
-- attribution survives when a member leaves a shared space.
create table public.space_members (
  space_id   uuid not null references public.spaces(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('owner', 'member')),
  joined_at  timestamptz not null default now(),
  left_at    timestamptz,
  primary key (space_id, user_id)
);

-- --- invitations ---------------------------------------------
create table public.invitations (
  id             uuid primary key default gen_random_uuid(),
  space_id       uuid not null references public.spaces(id) on delete cascade,
  invited_email  text not null,
  invited_by     uuid not null references auth.users(id) on delete cascade,
  status         text not null default 'pending'
                   check (status in ('pending', 'accepted', 'declined')),
  created_at     timestamptz not null default now(),
  responded_at   timestamptz,
  unique (space_id, invited_email)
);

-- --- recurring_bill_templates --------------------------------
-- A template defines a recurrence rule. Actual occurrences are
-- expanded virtually at query time; exception rows only appear
-- in `entries` when the user paid, overrode, or skipped one.
create table public.recurring_bill_templates (
  id                        uuid primary key default gen_random_uuid(),
  space_id                  uuid not null references public.spaces(id) on delete cascade,
  name                      text not null,
  default_amount            numeric(12, 2) not null,
  currency                  text not null default 'BRL',
  category                  text,                         -- default category inherited by generated entries
  active                    boolean not null default true,
  cadence                   text not null default 'monthly'
                              check (cadence in ('monthly', 'weekly', 'biweekly')),
  due_day                   int check (due_day between 1 and 31),
  day_of_week               int,
  biweekly_anchor           date,
  installments_total        int,
  installments_start_month  date,
  created_at                timestamptz not null default now(),
  constraint bill_templates_cadence_check check (
    (cadence = 'monthly'  and day_of_week is null and biweekly_anchor is null) or
    (cadence = 'weekly'   and day_of_week is not null and day_of_week between 0 and 6 and biweekly_anchor is null) or
    (cadence = 'biweekly' and day_of_week is not null and day_of_week between 0 and 6 and biweekly_anchor is not null)
  ),
  constraint bill_templates_installments_check check (
    (installments_total is null and installments_start_month is null)
    or (
      installments_total is not null
      and installments_start_month is not null
      and installments_total > 0
      and extract(day from installments_start_month) = 1
      and cadence = 'monthly'
    )
  )
);

-- Active templates must have unique names per space
-- (case/whitespace-insensitive). Deactivated templates are
-- excluded so names can be reused after deactivation.
create unique index recurring_bill_templates_space_active_name_unique
  on public.recurring_bill_templates (space_id, lower(trim(name)))
  where active = true;

-- --- entries -------------------------------------------------
-- Unified ledger for money-out events: one-offs AND exceptions
-- to recurring templates.
--
--   template_id IS NULL     → one-off entry (freeform)
--   template_id IS NOT NULL → exception row for the occurrence
--                              on `date` of that template
--
-- Fields:
--   paid                  — user marked the entry paid
--   skipped               — user cancelled this occurrence (template rows only)
--   installments_covered  — for installment templates, how many
--                           bounded-series steps this one payment
--                           covers (default 1). The expansion
--                           helper uses sum(covered) for paid
--                           rows to know where the series ends.
create table public.entries (
  id                    uuid primary key default gen_random_uuid(),
  space_id              uuid not null references public.spaces(id) on delete cascade,
  date                  date not null,
  name                  text not null,
  amount                numeric(12, 2) not null,
  currency              text not null default 'BRL',
  category              text,
  notes                 text,
  paid                  boolean not null default false,
  skipped               boolean not null default false,
  template_id           uuid references public.recurring_bill_templates(id) on delete cascade,
  installments_covered  int not null default 1 check (installments_covered > 0),
  created_at            timestamptz not null default now(),
  constraint entries_skipped_requires_template check (
    skipped = false or template_id is not null
  ),
  constraint entries_skipped_not_paid check (
    skipped = false or paid = false
  ),
  constraint entries_installments_require_template check (
    installments_covered = 1 or template_id is not null
  )
);

-- At most one exception per (template, occurrence-date) pair.
-- Partial index so one-off entries (template_id IS NULL) are
-- unconstrained.
create unique index entries_template_date_unique
  on public.entries (template_id, date)
  where template_id is not null;

-- Supports "all entries for a date range" queries.
create index entries_space_date_idx
  on public.entries (space_id, date);

-- --- month_unlocks -------------------------------------------
-- Row exists only when a past month has been explicitly
-- unlocked. Lock state is computed: (year, month) strictly in
-- the past AND no row here.
create table public.month_unlocks (
  space_id      uuid not null references public.spaces(id) on delete cascade,
  year          int not null,
  month         int not null check (month between 1 and 12),
  reason        text not null,
  unlocked_at   timestamptz not null default now(),
  unlocked_by   uuid references auth.users(id) on delete set null,
  primary key (space_id, year, month)
);

-- --- income_entries ------------------------------------------
-- Date-keyed (expected_date NOT NULL). No month_id: the monthly
-- view filters by date range.
create table public.income_entries (
  id             uuid primary key default gen_random_uuid(),
  space_id       uuid not null references public.spaces(id) on delete cascade,
  expected_date  date not null,
  name           text not null,
  amount         numeric(12, 2) not null,
  currency       text not null default 'BRL',
  received       boolean not null default false,
  created_at     timestamptz not null default now()
);

create index income_entries_space_date_idx
  on public.income_entries (space_id, expected_date);

-- --- savings_funds -------------------------------------------
create table public.savings_funds (
  id               uuid primary key default gen_random_uuid(),
  space_id         uuid not null references public.spaces(id) on delete cascade,
  name             text not null,
  currency         text not null default 'BRL',
  starting_balance numeric(12, 2) not null default 0,
  created_at       timestamptz not null default now()
);

-- --- savings_contributions -----------------------------------
-- Date-keyed. Amount is signed: positive = deposit,
-- negative = withdrawal. No space_id of its own — access is
-- inherited from the parent fund via RLS subqueries below.
create table public.savings_contributions (
  id          uuid primary key default gen_random_uuid(),
  fund_id     uuid not null references public.savings_funds(id) on delete cascade,
  date        date not null,
  amount      numeric(12, 2) not null,
  notes       text,
  created_at  timestamptz not null default now()
);

create index savings_contributions_fund_date_idx
  on public.savings_contributions (fund_id, date);


-- ============================================================
-- SECTION 2 — RLS HELPER FUNCTIONS
-- All SECURITY DEFINER + STABLE + set search_path = public,
-- so they bypass the caller's RLS (avoiding recursion and
-- RLS-inside-subquery traps) and resist schema-shadow attacks.
-- ============================================================

-- Active direct membership.
create or replace function public.is_active_member(space_id_input uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.space_members
    where space_id = space_id_input
      and user_id = auth.uid()
      and left_at is null
  );
$$;

-- Active direct ownership.
create or replace function public.is_space_owner(space_id_input uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.space_members
    where space_id = space_id_input
      and user_id = auth.uid()
      and role = 'owner'
      and left_at is null
  );
$$;

-- Widened read predicate: direct membership OR indirect via
-- parent_space_id. One-step walk is sufficient because shared
-- spaces don't have parents.
create or replace function public.can_read_space(space_id_input uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.space_members
    where space_id = space_id_input
      and user_id = auth.uid()
      and left_at is null
  )
  or exists (
    select 1
    from public.spaces s
    join public.space_members m on m.space_id = s.parent_space_id
    where s.id = space_id_input
      and m.user_id = auth.uid()
      and m.left_at is null
  );
$$;

-- Am I the creator of a space? Used to bootstrap the first
-- membership row after creating a shared space.
create or replace function public.is_space_creator(space_id_input uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.spaces
    where id = space_id_input
      and created_by = auth.uid()
  );
$$;

-- Do I have an accepted invitation matching my JWT email?
-- Used to let invitees insert their own membership row.
create or replace function public.has_accepted_invitation(space_id_input uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.invitations
    where space_id = space_id_input
      and invited_email = (auth.jwt() ->> 'email')
      and status = 'accepted'
  );
$$;


-- ============================================================
-- SECTION 3 — ENABLE RLS
-- Safety baseline: no policies = no access from the client.
-- ============================================================
alter table public.spaces                   enable row level security;
alter table public.space_members            enable row level security;
alter table public.invitations              enable row level security;
alter table public.recurring_bill_templates enable row level security;
alter table public.entries                  enable row level security;
alter table public.month_unlocks            enable row level security;
alter table public.income_entries           enable row level security;
alter table public.savings_funds            enable row level security;
alter table public.savings_contributions    enable row level security;


-- ============================================================
-- SECTION 4 — POLICIES
-- Pattern for domain tables: SELECT via can_read_space
-- (aggregate-view friendly), writes via is_active_member
-- (narrow — shared-space members can't mutate another
-- member's personal-space entries from the shared view).
-- ============================================================

-- --- spaces --------------------------------------------------
create policy "Users can view their spaces"
  on public.spaces
  for select
  to authenticated
  using (public.can_read_space(id));

create policy "Users can create shared spaces"
  on public.spaces
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and type = 'shared'
  );

create policy "Creators can update their own spaces"
  on public.spaces
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- --- space_members -------------------------------------------
create policy "Users can view members of their spaces"
  on public.space_members
  for select
  to authenticated
  using (public.is_active_member(space_id));

create policy "Creators can add themselves to their spaces"
  on public.space_members
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_space_creator(space_id)
  );

create policy "Invitees can join spaces they were invited to"
  on public.space_members
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.has_accepted_invitation(space_id)
  );

-- --- invitations ---------------------------------------------
create policy "Users can view invitations for their spaces or their email"
  on public.invitations
  for select
  to authenticated
  using (
    public.is_active_member(space_id)
    or invited_email = (auth.jwt() ->> 'email')
  );

create policy "Owners can create invitations"
  on public.invitations
  for insert
  to authenticated
  with check (
    public.is_space_owner(space_id)
    and invited_by = auth.uid()
  );

create policy "Invitees can respond to their own invitations"
  on public.invitations
  for update
  to authenticated
  using (invited_email = (auth.jwt() ->> 'email'))
  with check (invited_email = (auth.jwt() ->> 'email'));

create policy "Owners can revoke invitations"
  on public.invitations
  for delete
  to authenticated
  using (public.is_space_owner(space_id));

-- --- recurring_bill_templates --------------------------------
create policy "Users can view templates in their spaces"
  on public.recurring_bill_templates
  for select
  to authenticated
  using (public.can_read_space(space_id));

create policy "Users can create templates in their spaces"
  on public.recurring_bill_templates
  for insert
  to authenticated
  with check (public.is_active_member(space_id));

create policy "Users can update templates in their spaces"
  on public.recurring_bill_templates
  for update
  to authenticated
  using (public.is_active_member(space_id))
  with check (public.is_active_member(space_id));

create policy "Users can delete templates in their spaces"
  on public.recurring_bill_templates
  for delete
  to authenticated
  using (public.is_active_member(space_id));

-- --- entries -------------------------------------------------
create policy "Users can view entries in their spaces"
  on public.entries
  for select
  to authenticated
  using (public.can_read_space(space_id));

create policy "Users can create entries in their spaces"
  on public.entries
  for insert
  to authenticated
  with check (public.is_active_member(space_id));

create policy "Users can update entries in their spaces"
  on public.entries
  for update
  to authenticated
  using (public.is_active_member(space_id))
  with check (public.is_active_member(space_id));

create policy "Users can delete entries in their spaces"
  on public.entries
  for delete
  to authenticated
  using (public.is_active_member(space_id));

-- --- month_unlocks -------------------------------------------
create policy "Users can view month unlocks in their spaces"
  on public.month_unlocks
  for select
  to authenticated
  using (public.can_read_space(space_id));

create policy "Users can create month unlocks in their spaces"
  on public.month_unlocks
  for insert
  to authenticated
  with check (public.is_active_member(space_id));

create policy "Users can delete month unlocks in their spaces"
  on public.month_unlocks
  for delete
  to authenticated
  using (public.is_active_member(space_id));

-- --- income_entries ------------------------------------------
create policy "Users can view income entries in their spaces"
  on public.income_entries
  for select
  to authenticated
  using (public.can_read_space(space_id));

create policy "Users can create income entries in their spaces"
  on public.income_entries
  for insert
  to authenticated
  with check (public.is_active_member(space_id));

create policy "Users can update income entries in their spaces"
  on public.income_entries
  for update
  to authenticated
  using (public.is_active_member(space_id))
  with check (public.is_active_member(space_id));

create policy "Users can delete income entries in their spaces"
  on public.income_entries
  for delete
  to authenticated
  using (public.is_active_member(space_id));

-- --- savings_funds -------------------------------------------
create policy "Users can view savings funds in their spaces"
  on public.savings_funds
  for select
  to authenticated
  using (public.can_read_space(space_id));

create policy "Users can create savings funds in their spaces"
  on public.savings_funds
  for insert
  to authenticated
  with check (public.is_active_member(space_id));

create policy "Users can update savings funds in their spaces"
  on public.savings_funds
  for update
  to authenticated
  using (public.is_active_member(space_id))
  with check (public.is_active_member(space_id));

create policy "Users can delete savings funds in their spaces"
  on public.savings_funds
  for delete
  to authenticated
  using (public.is_active_member(space_id));

-- --- savings_contributions -----------------------------------
-- Access inherited from the parent fund. Reads use
-- can_read_space (aggregate-view friendly); writes use
-- is_active_member (narrow).
create policy "Users can view contributions for their funds"
  on public.savings_contributions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.savings_funds f
      where f.id = savings_contributions.fund_id
        and public.can_read_space(f.space_id)
    )
  );

create policy "Users can create contributions for their funds"
  on public.savings_contributions
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.savings_funds f
      where f.id = savings_contributions.fund_id
        and public.is_active_member(f.space_id)
    )
  );

create policy "Users can update contributions for their funds"
  on public.savings_contributions
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.savings_funds f
      where f.id = savings_contributions.fund_id
        and public.is_active_member(f.space_id)
    )
  )
  with check (
    exists (
      select 1
      from public.savings_funds f
      where f.id = savings_contributions.fund_id
        and public.is_active_member(f.space_id)
    )
  );

create policy "Users can delete contributions for their funds"
  on public.savings_contributions
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.savings_funds f
      where f.id = savings_contributions.fund_id
        and public.is_active_member(f.space_id)
    )
  );


-- ============================================================
-- SECTION 5 — AUTH TRIGGER
-- On first Google login, Supabase inserts into auth.users.
-- The trigger auto-creates a personal space named after the
-- user's Google display name and adds them as its owner.
-- Runs as SECURITY DEFINER so it bypasses RLS during signup.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_space_id uuid;
begin
  insert into public.spaces (name, type, created_by)
  values (
    coalesce(new.raw_user_meta_data->>'full_name', 'My Space'),
    'personal',
    new.id
  )
  returning id into new_space_id;

  insert into public.space_members (space_id, user_id, role)
  values (new_space_id, new.id, 'owner');

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
