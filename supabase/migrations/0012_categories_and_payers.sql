-- ============================================================
-- HOME FINANCES APP — CATEGORIES & PAYERS
-- Migration: 0012_categories_and_payers.sql
-- ============================================================
-- Replaces the hardcoded icon->category derivation (previously
-- src/lib/icons/bills.ts -> categoryFor()) with two user-managed,
-- space-scoped lists:
--
--   categories  — buckets grouping money by kind. Direction-scoped
--                 via `kind`: 'income' (Receitas) or 'outflow'
--                 (Contas, Despesas and Financiamentos alike).
--   payers      — the named institution behind a Receita.
--
-- Note on `kind`: the value is 'outflow', NOT 'expense'. CONTEXT.md
-- already binds "expense" to Despesas specifically, so 'expense'
-- would read as excluding Contas — the opposite of the intent.
--
-- Categories are REFERENCED, not snapshotted. On a template-bound
-- entry, category_id IS NULL means "inherit from the template",
-- not "uncategorised". See docs/adr/0001-categories-are-referenced-
-- not-snapshotted.md for why, and for the accepted limitations.
--
-- The old `category` text columns are populated and left in place
-- by this migration; they are dropped in 0013 once the backfill is
-- verified in production.
-- ============================================================


-- ============================================================
-- SECTION 1 — TABLES
-- ============================================================

-- --- categories ----------------------------------------------
-- `icon` and `color` are short string keys resolved by a registry
-- in application code, matching the convention set by 0007/0008:
-- the set of valid keys can grow without a schema migration, so
-- there is deliberately no CHECK on either column.
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.spaces(id) on delete cascade,
  kind        text not null check (kind in ('income', 'outflow')),
  name        text not null,
  icon        text,
  color       text not null default 'slate',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Mirrors the partial-unique pattern on recurring_bill_templates:
-- names collide only among ACTIVE rows, so a deactivated category
-- never blocks reusing its name. Scoped by kind so "Educação" can
-- exist independently on both sides of the ledger.
create unique index categories_space_kind_name_active_idx
  on public.categories (space_id, kind, lower(trim(name)))
  where active;

create index categories_space_kind_idx
  on public.categories (space_id, kind);

comment on column public.categories.kind is
  'income = Receitas; outflow = Contas, Despesas and Financiamentos.';
comment on column public.categories.icon is
  'Optional icon key (matches the registry in src/lib/icons/).';
comment on column public.categories.color is
  'Palette token key (matches the palette in application code), not a hex value.';

-- --- payers --------------------------------------------------
-- Income-only by decision: on the outflow side the counterparty is
-- already carried by the Conta's own name. Payers render as initials
-- on a coloured chip, so there is no icon column.
create table public.payers (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.spaces(id) on delete cascade,
  name        text not null,
  color       text not null default 'slate',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create unique index payers_space_name_active_idx
  on public.payers (space_id, lower(trim(name)))
  where active;

create index payers_space_idx
  on public.payers (space_id);


-- ============================================================
-- SECTION 2 — ENABLE RLS
-- ============================================================
alter table public.categories enable row level security;
alter table public.payers     enable row level security;


-- ============================================================
-- SECTION 3 — POLICIES
-- Both tables carry their own space_id, so all four verbs gate
-- directly on is_active_member(space_id).
-- ============================================================

-- --- categories ----------------------------------------------
create policy "Users can view categories in their spaces"
  on public.categories
  for select
  to authenticated
  using (public.is_active_member(space_id));

create policy "Users can create categories in their spaces"
  on public.categories
  for insert
  to authenticated
  with check (public.is_active_member(space_id));

create policy "Users can update categories in their spaces"
  on public.categories
  for update
  to authenticated
  using (public.is_active_member(space_id))
  with check (public.is_active_member(space_id));

create policy "Users can delete categories in their spaces"
  on public.categories
  for delete
  to authenticated
  using (public.is_active_member(space_id));

-- --- payers --------------------------------------------------
create policy "Users can view payers in their spaces"
  on public.payers
  for select
  to authenticated
  using (public.is_active_member(space_id));

create policy "Users can create payers in their spaces"
  on public.payers
  for insert
  to authenticated
  with check (public.is_active_member(space_id));

create policy "Users can update payers in their spaces"
  on public.payers
  for update
  to authenticated
  using (public.is_active_member(space_id))
  with check (public.is_active_member(space_id));

create policy "Users can delete payers in their spaces"
  on public.payers
  for delete
  to authenticated
  using (public.is_active_member(space_id));


-- ============================================================
-- SECTION 4 — DEFAULT SEED
-- Every space starts with a usable taxonomy so no code path ever
-- has to handle "user has zero categories". Payers are inherently
-- personal (your employer, your clients) and are NOT seeded.
--
-- The outflow seven are the icon-group names the old derivation
-- produced, each carrying that group's representative icon — which
-- is what makes the backfill in SECTION 6 a straight name match.
--
-- Idempotent: bare ON CONFLICT DO NOTHING absorbs the partial
-- unique index, so re-running against a seeded space is a no-op.
-- ============================================================
create or replace function public.seed_default_taxonomy(target_space_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (space_id, kind, name, icon, color)
  values
    (target_space_id, 'outflow', 'Moradia',       'home',        'sky'),
    (target_space_id, 'outflow', 'Saúde',         'heart',       'rose'),
    (target_space_id, 'outflow', 'Transporte',    'car',         'amber'),
    (target_space_id, 'outflow', 'Consumo',       'utensils',    'violet'),
    (target_space_id, 'outflow', 'Família',       'baby',        'teal'),
    (target_space_id, 'outflow', 'Lazer',         'music',       'indigo'),
    (target_space_id, 'outflow', 'Financeiro',    'credit-card', 'emerald'),
    (target_space_id, 'income',  'Salário',       'banknote',    'emerald'),
    (target_space_id, 'income',  'Freelance',     'laptop',      'sky'),
    (target_space_id, 'income',  'Restituição',   'landmark',    'violet'),
    (target_space_id, 'income',  'Vendas',        'tag',         'amber'),
    (target_space_id, 'income',  'Investimentos', 'trending-up', 'teal'),
    (target_space_id, 'income',  'Reembolso',     'rotate-ccw',  'orange')
  on conflict do nothing;
end;
$$;

-- New spaces seed themselves. Kept as its own trigger on `spaces`
-- rather than folded into handle_new_user() so the seeding is
-- decoupled from the auth flow — a space created any other way
-- still gets its taxonomy.
create or replace function public.handle_new_space()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_default_taxonomy(new.id);
  return new;
end;
$$;

create trigger on_space_created
  after insert on public.spaces
  for each row execute procedure public.handle_new_space();

-- Both are SECURITY DEFINER, so they bypass RLS. seed_default_taxonomy
-- takes a space_id and WRITES — left callable it would let any signed-in
-- user seed categories into someone else's space via a PostgREST RPC.
-- Same lockdown 0010 applied to handle_new_user().
revoke execute on function public.seed_default_taxonomy(uuid) from public;
revoke execute on function public.seed_default_taxonomy(uuid) from anon, authenticated;
revoke execute on function public.handle_new_space() from public;
revoke execute on function public.handle_new_space() from anon, authenticated;

-- Existing spaces predate the trigger.
do $$
declare
  s record;
begin
  for s in select id from public.spaces loop
    perform public.seed_default_taxonomy(s.id);
  end loop;
end;
$$;


-- ============================================================
-- SECTION 5 — REFERENCING COLUMNS
-- All nullable, all ON DELETE SET NULL: deleting a category drops
-- its rows into the "Sem categoria" bucket rather than cascading
-- away real financial history.
--
-- Two invariants Postgres cannot express here and which application
-- code must therefore uphold:
--   * a category referenced by an outflow row must have kind =
--     'outflow' (and 'income' for income_entries). Enforced by
--     always reading the list through a kind-filtered helper.
--   * the referenced category must belong to the same space. RLS
--     makes cross-space rows unreachable in practice.
-- Every FK column gets an index — unindexed FKs are both a delete-
-- time scan and a Supabase linter finding (see 0010).
-- ============================================================
alter table public.recurring_bill_templates
  add column category_id uuid references public.categories(id) on delete set null;

alter table public.entries
  add column category_id uuid references public.categories(id) on delete set null;

alter table public.financings
  add column category_id uuid references public.categories(id) on delete set null;

alter table public.income_entries
  add column category_id uuid references public.categories(id) on delete set null,
  add column payer_id    uuid references public.payers(id)     on delete set null;

create index recurring_bill_templates_category_idx on public.recurring_bill_templates (category_id);
create index entries_category_idx                  on public.entries (category_id);
create index financings_category_idx               on public.financings (category_id);
create index income_entries_category_idx           on public.income_entries (category_id);
create index income_entries_payer_idx              on public.income_entries (payer_id);

comment on column public.entries.category_id is
  'NULL on a template-bound row (template_id IS NOT NULL) means "inherit from the template"; NULL on a one-off means "uncategorised". See docs/adr/0001.';

-- `income_entries.name` used to carry both the payer and the kind of
-- income crammed into one string ("Freelance XYZ"). With both now
-- modelled, the name becomes an optional free-text annotation; a
-- blank name renders as "Pagador · Categoria".
alter table public.income_entries
  alter column name drop not null;


-- ============================================================
-- SECTION 6 — BACKFILL
-- The old `category` text was always one of the seven icon-group
-- names, so a case-insensitive name match against the freshly
-- seeded rows resolves it exactly. Anything that fails to match
-- stays NULL and shows up as "Sem categoria" — the text column
-- survives until 0013 precisely so a mismatch can be diagnosed.
-- ============================================================
update public.recurring_bill_templates t
   set category_id = c.id
  from public.categories c
 where c.space_id = t.space_id
   and c.kind = 'outflow'
   and lower(trim(c.name)) = lower(trim(t.category))
   and t.category is not null
   and t.category_id is null;

-- One-off entries ONLY. Template-bound rows are deliberately left
-- NULL so they inherit from the template they belong to; writing a
-- value here would freeze their classification and defeat ADR 0001.
update public.entries e
   set category_id = c.id
  from public.categories c
 where c.space_id = e.space_id
   and c.kind = 'outflow'
   and lower(trim(c.name)) = lower(trim(e.category))
   and e.template_id is null
   and e.category is not null
   and e.category_id is null;
