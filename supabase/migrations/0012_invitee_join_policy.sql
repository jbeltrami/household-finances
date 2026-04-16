-- ============================================================
-- 0012 — space_members INSERT policy for invitees
--
-- Step 5's migration (0011) added an INSERT policy for space
-- *creators*. Step 7 adds the companion policy for *invitees*:
-- a user can add themselves to a space if they have an accepted
-- invitation for that space matching their email.
--
-- The check uses a SECURITY DEFINER helper to avoid the RLS-
-- inside-RLS trap where the subquery on invitations would be
-- blocked by the invitations SELECT policy. We've been burned
-- by this pattern twice already (spaces SELECT blocking
-- space_members INSERT, and the RETURNING clause issue).
-- ============================================================

create or replace function public.has_accepted_invitation(space_id_input uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.invitations
    where space_id = space_id_input
      and invited_email = (auth.jwt() ->> 'email')
      and status = 'accepted'
  );
$$;

create policy "Invitees can join spaces they were invited to"
  on public.space_members
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.has_accepted_invitation(space_id)
  );
