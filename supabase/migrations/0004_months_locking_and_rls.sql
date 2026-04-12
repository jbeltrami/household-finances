-- ============================================================
-- 0004 — Months locking schema cleanup + RLS for monthly view
--
-- Two changes:
--   1. Drop the `locked` and `locked_at` columns from `months`.
--      The check-on-read approach makes them redundant: a month
--      is effectively locked when (year, month) is in the past
--      AND `unlock_reason IS NULL`. Keeping a separate boolean
--      would be a second source of truth and invite drift.
--   2. Add RLS policies for `months` and `bill_instances`. These
--      tables had RLS enabled in 0002 but no policies, so they
--      were locked. Piece 4a needs to read/write both, so we
--      add SELECT/INSERT/UPDATE policies scoped to active
--      space membership.
-- ============================================================


-- ============================================================
-- 1. SCHEMA — drop redundant locked columns
-- ============================================================
alter table public.months drop column if exists locked;
alter table public.months drop column if exists locked_at;


-- ============================================================
-- 2. POLICIES — months
-- Members of a space can read, create, and update its months.
-- DELETE is not exposed: months are created lazily and never
-- meant to be removed manually.
-- ============================================================
create policy "Users can view months in their spaces"
  on public.months
  for select
  to authenticated
  using (public.is_active_member(space_id));

create policy "Users can create months in their spaces"
  on public.months
  for insert
  to authenticated
  with check (public.is_active_member(space_id));

create policy "Users can update months in their spaces"
  on public.months
  for update
  to authenticated
  using (public.is_active_member(space_id))
  with check (public.is_active_member(space_id));


-- ============================================================
-- 3. POLICIES — bill_instances
-- Members of a space can read, create, and update its bill
-- instances. Creation happens during on-demand month
-- generation (one row per active template). Updates cover
-- paid toggling, per-instance amount overrides, and the
-- cascade from template edits.
-- ============================================================
create policy "Users can view bill instances in their spaces"
  on public.bill_instances
  for select
  to authenticated
  using (public.is_active_member(space_id));

create policy "Users can create bill instances in their spaces"
  on public.bill_instances
  for insert
  to authenticated
  with check (public.is_active_member(space_id));

create policy "Users can update bill instances in their spaces"
  on public.bill_instances
  for update
  to authenticated
  using (public.is_active_member(space_id))
  with check (public.is_active_member(space_id));
