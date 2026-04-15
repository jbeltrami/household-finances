-- ============================================================
-- 0007 — Row Level Security policies for savings_funds
-- and savings_contributions
--
-- Both tables had RLS enabled in 0002 but no policies, so they
-- were locked. Piece 7 needs full CRUD scoped to active space
-- membership.
--
-- Savings funds live at the space level: a fund in a personal
-- space is private to that user; a fund in a household space
-- (Piece 8) is shared by every active household member, which
-- is exactly what `is_active_member(space_id)` expresses.
--
-- Contributions don't carry a space_id of their own — they
-- inherit access from their parent fund. The policies walk the
-- FK to savings_funds and reuse `is_active_member` there.
--
-- DELETE is exposed on both tables: funds because the user
-- should be able to remove a mistake, contributions because
-- they're free-form entries (same rationale as income_entries
-- and one_off_expenses). Month-lock enforcement for
-- contributions lives in server actions, not RLS — same
-- approach as the other mutation tables.
-- ============================================================

-- --- savings_funds ------------------------------------------

create policy "Users can view savings funds in their spaces"
  on public.savings_funds
  for select
  to authenticated
  using (public.is_active_member(space_id));

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

-- --- savings_contributions ----------------------------------
-- Access is inherited from the parent fund via a subquery.

create policy "Users can view contributions for their funds"
  on public.savings_contributions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.savings_funds f
      where f.id = savings_contributions.fund_id
        and public.is_active_member(f.space_id)
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
