-- ============================================================
-- 0005 — Row Level Security policies for income_entries
--
-- The table had RLS enabled in 0002 but no policies, so it
-- was locked. Piece 5 needs full CRUD scoped to active
-- space membership.
--
-- DELETE is exposed (unlike bill_instances) because income
-- entries are created freely by the user, not generated from
-- templates, so deleting them is a normal operation. Lock
-- enforcement (no edits to past months) lives in server
-- actions, not in RLS — same approach as bill_instances.
-- ============================================================

create policy "Users can view income entries in their spaces"
  on public.income_entries
  for select
  to authenticated
  using (public.is_active_member(space_id));

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
