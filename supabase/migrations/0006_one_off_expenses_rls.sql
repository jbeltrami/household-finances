-- ============================================================
-- 0006 — Row Level Security policies for one_off_expenses
--
-- The table had RLS enabled in 0002 but no policies, so it
-- was locked. Piece 6 needs full CRUD scoped to active
-- space membership.
--
-- DELETE is exposed (like income_entries, unlike bill_instances)
-- because one-off expenses are created freely by the user, not
-- generated from templates, so deleting them is a normal
-- operation. Lock enforcement (no edits to past months) lives
-- in server actions, not in RLS — same approach as the other
-- mutation tables.
-- ============================================================

create policy "Users can view one-off expenses in their spaces"
  on public.one_off_expenses
  for select
  to authenticated
  using (public.is_active_member(space_id));

create policy "Users can create one-off expenses in their spaces"
  on public.one_off_expenses
  for insert
  to authenticated
  with check (public.is_active_member(space_id));

create policy "Users can update one-off expenses in their spaces"
  on public.one_off_expenses
  for update
  to authenticated
  using (public.is_active_member(space_id))
  with check (public.is_active_member(space_id));

create policy "Users can delete one-off expenses in their spaces"
  on public.one_off_expenses
  for delete
  to authenticated
  using (public.is_active_member(space_id));
