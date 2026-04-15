-- ============================================================
-- 0009 — Row Level Security policies for invitations
--
-- RLS was enabled on `invitations` in 0002 but no policies
-- exist yet, so the table has been fully locked since day one.
-- Piece 8's invite flow needs full CRUD scoped to ownership
-- and email match:
--
--   SELECT  — active members of the space, or the invitee
--             (matched by email on the JWT)
--   INSERT  — owners of the space only
--   UPDATE  — invitees only (accept / decline)
--   DELETE  — owners only (revoke a pending invite)
--
-- The owner restriction means we need a new helper function,
-- `is_space_owner(space_id)`, mirroring `is_active_member`
-- from 0002 but filtering by `role = 'owner'`.
--
-- The email match uses `auth.jwt() ->> 'email'`, the documented
-- Supabase pattern for reading the current user's email claim
-- from the JWT. This ties "can see / respond to this invite"
-- to the email the user actually signed in with.
-- ============================================================


-- ============================================================
-- 1. HELPER FUNCTION — is_space_owner
-- Returns true if the calling user is an active owner
-- (role = 'owner', left_at IS NULL) of the given space.
--
-- SECURITY DEFINER + search_path for the same reasons as
-- is_active_member in 0002: avoid RLS recursion when called
-- from policies on space_members, and lock down the search
-- path so the function can't be hijacked via a schema
-- shadowing attack.
-- ============================================================
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


-- ============================================================
-- 2. POLICIES — invitations
-- ============================================================

-- SELECT: any active member of the space can see its invites
-- (so owners can see what's pending), and any user whose email
-- matches `invited_email` can see the invite targeting them.
create policy "Users can view invitations for their spaces or their email"
  on public.invitations
  for select
  to authenticated
  using (
    public.is_active_member(space_id)
    or invited_email = (auth.jwt() ->> 'email')
  );

-- INSERT: only owners of the space, and only as themselves.
-- The `invited_by = auth.uid()` check enforces correct
-- attribution — a user can't insert a row claiming someone
-- else sent the invite.
create policy "Owners can create invitations"
  on public.invitations
  for insert
  to authenticated
  with check (
    public.is_space_owner(space_id)
    and invited_by = auth.uid()
  );

-- UPDATE: only the invitee (matched by JWT email) can update
-- their own invitation. This is how "accept" and "decline"
-- work — the action flips `status` and stamps `responded_at`.
-- The policy applies to both the row being updated (USING)
-- and the row after update (WITH CHECK), so a malicious client
-- can't rewrite `invited_email` to someone else's address
-- mid-update.
create policy "Invitees can respond to their own invitations"
  on public.invitations
  for update
  to authenticated
  using (invited_email = (auth.jwt() ->> 'email'))
  with check (invited_email = (auth.jwt() ->> 'email'));

-- DELETE: only owners of the space. Used to revoke a pending
-- invite. We chose DELETE over inventing a 4th status value
-- ('revoked') so the status enum stays minimal.
create policy "Owners can revoke invitations"
  on public.invitations
  for delete
  to authenticated
  using (public.is_space_owner(space_id));
