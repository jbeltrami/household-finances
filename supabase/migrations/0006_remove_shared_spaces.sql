-- --- Remove shared spaces -----------------------------------
-- Collapses the multi-space model down to one personal space per
-- user. This is destructive: invitations and space_members are
-- dropped outright (the user has confirmed no shared-space data
-- exists in production). After this migration:
--
--   * `spaces` keeps only personal-space rows, with `type` and
--     `parent_space_id` columns dropped. The owner is recorded
--     in `spaces.created_by` (already present).
--   * `space_members` and `invitations` tables are gone.
--   * Helper functions collapse to one — `is_active_member` —
--     redefined as a one-liner against `spaces.created_by`.
--     `is_space_owner`, `can_read_space`, `is_space_creator`,
--     `has_accepted_invitation` are dropped.
--   * Every SELECT policy that previously used `can_read_space`
--     is recreated using `is_active_member` (which is now the
--     same as direct ownership).
--   * The on_auth_user_created trigger no longer touches
--     `space_members` — it just inserts the personal space row.

-- ============================================================
-- Section 1: Drop policies that reference soon-to-be-dropped
-- helpers, columns, or tables. The remaining write policies on
-- domain tables (templates, entries, month_unlocks, income,
-- monthly_reports*, whatsapp_notification*) all use
-- `is_active_member`, which we keep — they don't need rewriting.
-- ============================================================

drop policy if exists "Users can view their spaces" on public.spaces;
drop policy if exists "Users can create shared spaces" on public.spaces;

drop policy if exists "Users can view members of their spaces"
  on public.space_members;
drop policy if exists "Creators can add themselves to their spaces"
  on public.space_members;
drop policy if exists "Invitees can join spaces they were invited to"
  on public.space_members;

drop policy if exists "Users can view invitations for their spaces or their email"
  on public.invitations;
drop policy if exists "Owners can create invitations" on public.invitations;
drop policy if exists "Invitees can respond to their own invitations"
  on public.invitations;
drop policy if exists "Owners can revoke invitations" on public.invitations;

drop policy if exists "Users can view templates in their spaces"
  on public.recurring_bill_templates;
drop policy if exists "Users can view entries in their spaces" on public.entries;
drop policy if exists "Users can view month unlocks in their spaces"
  on public.month_unlocks;
drop policy if exists "Users can view income entries in their spaces"
  on public.income_entries;

-- ============================================================
-- Section 2: Drop helper functions that are no longer used.
-- `is_active_member` stays — we'll redefine it below.
-- ============================================================

drop function if exists public.is_space_owner(uuid);
drop function if exists public.can_read_space(uuid);
drop function if exists public.is_space_creator(uuid);
drop function if exists public.has_accepted_invitation(uuid);

-- ============================================================
-- Section 3: Drop the no-longer-needed tables. CASCADE handles
-- any remaining FK references and policies we missed.
-- ============================================================

drop table if exists public.invitations cascade;
drop table if exists public.space_members cascade;

-- ============================================================
-- Section 4: Drop the shared-space columns on `spaces`. The
-- CHECK constraint on `type` goes with the column.
-- ============================================================

alter table public.spaces drop column if exists parent_space_id;
alter table public.spaces drop column if exists type;

-- ============================================================
-- Section 5: Redefine `is_active_member` as a one-liner against
-- `spaces.created_by`. Same name and signature so all the
-- write policies that already reference it keep working
-- without rewrites.
-- ============================================================

create or replace function public.is_active_member(space_id_input uuid)
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

-- ============================================================
-- Section 6: Recreate the SELECT policies we dropped in
-- Section 1, this time gated on `is_active_member` (which is
-- now equivalent to direct ownership).
-- ============================================================

create policy "Users can view their spaces"
  on public.spaces
  for select
  to authenticated
  using (created_by = auth.uid());

create policy "Users can view templates in their spaces"
  on public.recurring_bill_templates
  for select
  to authenticated
  using (public.is_active_member(space_id));

create policy "Users can view entries in their spaces"
  on public.entries
  for select
  to authenticated
  using (public.is_active_member(space_id));

create policy "Users can view month unlocks in their spaces"
  on public.month_unlocks
  for select
  to authenticated
  using (public.is_active_member(space_id));

create policy "Users can view income entries in their spaces"
  on public.income_entries
  for select
  to authenticated
  using (public.is_active_member(space_id));

-- ============================================================
-- Section 7: Simplify `handle_new_user` so it no longer
-- touches `space_members`. The `on_auth_user_created` trigger
-- (already attached to auth.users) automatically picks up the
-- new function body on its next firing.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.spaces (name, created_by)
  values (
    coalesce(new.raw_user_meta_data->>'full_name', 'My Space'),
    new.id
  );

  return new;
end;
$$ language plpgsql security definer;
