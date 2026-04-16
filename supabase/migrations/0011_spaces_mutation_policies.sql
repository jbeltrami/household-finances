-- ============================================================
-- 0011 — INSERT and UPDATE policies for spaces + space_members
--
-- Until now, both tables had only SELECT policies — all writes
-- were handled by the `on_auth_user_created` trigger (which
-- runs as SECURITY DEFINER and bypasses RLS). Piece 8 Step 5
-- adds the "Create shared space" flow, which requires three
-- writes from the app layer:
--
--   1. INSERT into spaces    (create the shared space)
--   2. INSERT into space_members (add creator as owner)
--   3. UPDATE spaces         (link personal space via parent_space_id)
--
-- Later steps will layer on more policies as needed:
--   - Step 7 (invitation accept): a second INSERT policy on
--     space_members for invitees
--   - Step 6 (settings): may widen the UPDATE policy to let
--     co-owners rename shared spaces
-- ============================================================


-- --- spaces INSERT -----------------------------------------
-- An authenticated user can create a new shared space where
-- they are the creator. `type = 'shared'` prevents users from
-- creating personal spaces via the app (the trigger owns that).
-- `created_by = auth.uid()` prevents attribution forgery.
create policy "Users can create shared spaces"
  on public.spaces
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and type = 'shared'
  );


-- --- spaces UPDATE -----------------------------------------
-- A user can update any space they created. For Piece 8 this
-- covers two cases:
--   - Setting parent_space_id on their own personal space
--     (linking to a shared space on create or invite-accept)
--   - Renaming a shared space they created (Step 6)
--
-- This is intentionally narrower than "any active member can
-- update" — co-owner rename and membership changes are out of
-- scope for Piece 8 and can be widened later.
create policy "Creators can update their own spaces"
  on public.spaces
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());


-- --- HELPER — is_space_creator ------------------------------
-- Returns true if the calling user is the created_by of the
-- given space. SECURITY DEFINER so the lookup bypasses RLS on
-- the spaces table — without this, the space_members INSERT
-- policy's subquery would be blocked by the spaces SELECT
-- policy (can_read_space), which requires membership that
-- doesn't exist yet at insertion time. Same convention as
-- is_active_member and is_space_owner.
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


-- --- space_members INSERT ----------------------------------
-- The creator of a space can add themselves as its first member.
-- Uses is_space_creator (SECURITY DEFINER) instead of a raw
-- subquery so the check isn't blocked by the spaces SELECT
-- policy. A second INSERT policy for *invitees* (checking the
-- invitations table) will be added in Step 7.
create policy "Creators can add themselves to their spaces"
  on public.space_members
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_space_creator(space_id)
  );
