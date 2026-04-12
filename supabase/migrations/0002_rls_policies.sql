-- ============================================================
-- 0002 — Row Level Security policies
--
-- Strategy:
--   1. Create a SECURITY DEFINER helper function that checks
--      space membership without triggering policy recursion.
--   2. Enable RLS on ALL tables as a safety baseline (no
--      policies = no access, which is the safe default).
--   3. Add policies for the tables needed by Piece 3 (bill
--      templates). More policies will be added as later
--      pieces are built.
-- ============================================================


-- ============================================================
-- 1. HELPER FUNCTION — is_active_member
-- Returns true if the calling user is an active member
-- (left_at IS NULL) of the given space.
--
-- SECURITY DEFINER runs the function with the privileges of
-- its owner (postgres), bypassing RLS internally. This lets
-- us query space_members from inside a policy on space_members
-- without causing infinite recursion.
--
-- STABLE tells Postgres the function returns the same result
-- for the same input within a query, so it can be cached.
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
    from public.space_members
    where space_id = space_id_input
      and user_id = auth.uid()
      and left_at is null
  );
$$;


-- ============================================================
-- 2. ENABLE RLS ON ALL TABLES
-- Safety baseline: any table without policies will reject
-- all reads and writes from non-superuser connections.
-- ============================================================
alter table public.spaces                   enable row level security;
alter table public.space_members            enable row level security;
alter table public.invitations              enable row level security;
alter table public.recurring_bill_templates enable row level security;
alter table public.months                   enable row level security;
alter table public.income_entries           enable row level security;
alter table public.bill_instances           enable row level security;
alter table public.one_off_expenses         enable row level security;
alter table public.savings_funds            enable row level security;
alter table public.savings_contributions    enable row level security;


-- ============================================================
-- 3. POLICIES — spaces
-- Users can view spaces they are active members of.
-- ============================================================
create policy "Users can view their spaces"
  on public.spaces
  for select
  to authenticated
  using (public.is_active_member(id));


-- ============================================================
-- 4. POLICIES — space_members
-- Users can view memberships for spaces they belong to.
-- This is needed so the app can list members of a shared
-- space the user is part of.
-- ============================================================
create policy "Users can view members of their spaces"
  on public.space_members
  for select
  to authenticated
  using (public.is_active_member(space_id));


-- ============================================================
-- 5. POLICIES — recurring_bill_templates
-- Full CRUD for active members of the template's space.
-- Deactivation uses UPDATE (set active = false), not DELETE.
-- ============================================================
create policy "Users can view templates in their spaces"
  on public.recurring_bill_templates
  for select
  to authenticated
  using (public.is_active_member(space_id));

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
