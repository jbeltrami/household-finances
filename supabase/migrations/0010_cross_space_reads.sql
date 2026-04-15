-- ============================================================
-- 0010 — Cross-space read policies (can_read_space helper)
--
-- Audit finding from Piece 8, Step 2: every existing SELECT
-- policy on a domain table uses `is_active_member(space_id)`,
-- which only returns true for *direct* membership. This breaks
-- the shared-space aggregate view as soon as Piece 8 ships:
--
--   Example: I'm active in shared space S. S has linked
--   personal spaces P1 (mine), P2 (Maria's), P3 (João's).
--   The shared-space query does
--     space_id IN (S, P1, P2, P3)
--   RLS lets me read rows from S and P1 (direct member), but
--   silently drops rows from P2 and P3 (not a direct member).
--   The shared view would miss half the entries — no error,
--   just missing data.
--
-- The fix: widen SELECT policies to allow reads from any space
-- whose `parent_space_id` points at a shared space I'm an
-- active member of. Writes (INSERT/UPDATE/DELETE) stay narrow:
-- a shared-space member must NOT be able to mutate another
-- member's personal-space entries from the shared view. Reads
-- are widened, writes stay locked to direct membership.
--
-- Implementation:
--   1. A new helper `can_read_space(space_id)` that checks
--      direct active membership OR indirect membership via
--      parent_space_id (one-step parent walk — shared spaces
--      don't have parents, so one step is enough).
--   2. ALTER POLICY on every SELECT policy that currently uses
--      is_active_member, swapping to can_read_space.
--
-- Not touched:
--   - space_members SELECT (cross-space membership listings
--     aren't needed; the shared-space view labels members via
--     spaces.created_by, not a cross-space member scan)
--   - invitations SELECT (personal spaces don't have invites;
--     widening would grant nothing useful)
--   - any INSERT/UPDATE/DELETE policy (intentional — writes
--     stay narrow)
-- ============================================================


-- ============================================================
-- 1. HELPER FUNCTION — can_read_space
-- Returns true if the calling user can SELECT rows scoped to
-- the given space_id, either because they're an active member
-- or because the space is linked (via parent_space_id) to a
-- shared space they're an active member of.
--
-- SECURITY DEFINER + stable search_path for the same reasons
-- as is_active_member / is_space_owner — avoid policy recursion
-- and schema-shadowing risk.
-- ============================================================
create or replace function public.can_read_space(space_id_input uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    -- Direct active membership in the space itself.
    select 1
    from public.space_members
    where space_id = space_id_input
      and user_id = auth.uid()
      and left_at is null
  )
  or exists (
    -- Indirect: the space is a child (parent_space_id points
    -- at something) AND I'm an active member of that parent.
    -- One-step walk because shared spaces don't have parents.
    select 1
    from public.spaces s
    join public.space_members m on m.space_id = s.parent_space_id
    where s.id = space_id_input
      and m.user_id = auth.uid()
      and m.left_at is null
  );
$$;


-- ============================================================
-- 2. ALTER SELECT POLICIES
-- Each of these was originally using `is_active_member` or its
-- FK-walking equivalent. We swap to `can_read_space` so the
-- read path follows the shared-space aggregate rules.
-- ============================================================

alter policy "Users can view their spaces"
  on public.spaces
  using (public.can_read_space(id));

alter policy "Users can view templates in their spaces"
  on public.recurring_bill_templates
  using (public.can_read_space(space_id));

alter policy "Users can view months in their spaces"
  on public.months
  using (public.can_read_space(space_id));

alter policy "Users can view bill instances in their spaces"
  on public.bill_instances
  using (public.can_read_space(space_id));

alter policy "Users can view income entries in their spaces"
  on public.income_entries
  using (public.can_read_space(space_id));

alter policy "Users can view one-off expenses in their spaces"
  on public.one_off_expenses
  using (public.can_read_space(space_id));

alter policy "Users can view savings funds in their spaces"
  on public.savings_funds
  using (public.can_read_space(space_id));

-- savings_contributions is special: it has no space_id of its
-- own and walks the FK to savings_funds. The shape of the
-- subquery stays the same; only the membership check swaps.
alter policy "Users can view contributions for their funds"
  on public.savings_contributions
  using (
    exists (
      select 1
      from public.savings_funds f
      where f.id = savings_contributions.fund_id
        and public.can_read_space(f.space_id)
    )
  );
