-- --- Cleanup: shared-spaces leftovers + performance/security lints ---
-- Bundles two things:
--   1. The body of migration 0006_remove_shared_spaces.sql, which was
--      written to the repo but never executed against production (the
--      pre-CLI workflow only ran additive changes by hand). The Supabase
--      database linter as of 2026-06-07 still flags space_members,
--      invitations, spaces.parent_space_id, and the old helper functions
--      as present.
--   2. Performance and security lint fixes surfaced by the same report:
--      indexes on actively-queried FKs, an RLS policy rewrite to wrap
--      auth.uid() in a subquery, and search_path / EXECUTE hardening
--      on the SECURITY DEFINER trigger functions.
--
-- Skipped (intentionally): revoking EXECUTE on public.is_active_member.
-- That function is called from every RLS policy on the domain tables;
-- revoking EXECUTE from authenticated would block users from reading
-- their own data. The right long-term fix is to move it to a private
-- schema PostgREST does not expose — out of scope for this cleanup.

-- ============================================================
-- PART 1 — Shared-spaces removal (verbatim body of 0006)
-- ============================================================

-- 1.1 Drop policies that reference soon-to-be-dropped helpers,
-- columns, or tables. The remaining write policies on domain
-- tables already use is_active_member, which we keep.

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

-- 1.2 Drop helper functions no longer used. is_active_member stays
-- and is redefined below.

drop function if exists public.is_space_owner(uuid);
drop function if exists public.can_read_space(uuid);
drop function if exists public.is_space_creator(uuid);
drop function if exists public.has_accepted_invitation(uuid);

-- 1.3 Drop the no-longer-needed tables. CASCADE handles any
-- remaining FK references or policies we missed.

drop table if exists public.invitations cascade;
drop table if exists public.space_members cascade;

-- 1.4 Drop shared-space columns on spaces. The CHECK constraint on
-- `type` goes with the column.

alter table public.spaces drop column if exists parent_space_id;
alter table public.spaces drop column if exists type;

-- 1.5 Redefine is_active_member as a one-liner against
-- spaces.created_by. Same name and signature so the write policies
-- that already reference it keep working.

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

-- 1.6 Recreate SELECT policies dropped in 1.1, gated on
-- is_active_member (now equivalent to direct ownership).

create policy "Users can view their spaces"
  on public.spaces
  for select
  to authenticated
  using (created_by = (select auth.uid()));

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

-- 1.7 Simplify handle_new_user so it no longer touches space_members.
-- search_path is locked here too (also covered in part 3 below, but
-- redundant declarations are harmless and keep this block self-contained).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.spaces (name, created_by)
  values (
    coalesce(new.raw_user_meta_data->>'full_name', 'My Space'),
    new.id
  );

  return new;
end;
$$;

-- ============================================================
-- PART 2 — Performance lint fixes
-- ============================================================

-- 2.1 Index actively-queried foreign keys. spaces(created_by) is
-- the lookup behind every RLS check on spaces; the whatsapp FKs
-- are read by the daily cron's idempotency check.

create index if not exists spaces_created_by_idx
  on public.spaces (created_by);

create index if not exists whatsapp_notifications_sent_entry_id_idx
  on public.whatsapp_notifications_sent (entry_id);

create index if not exists whatsapp_notifications_sent_template_id_idx
  on public.whatsapp_notifications_sent (template_id);

-- 2.2 Wrap auth.uid() in a subquery on the "Creators can update their
-- own spaces" policy so Postgres evaluates it once per query instead
-- of per row. (Lint: auth_rls_initplan.)

drop policy if exists "Creators can update their own spaces" on public.spaces;
create policy "Creators can update their own spaces"
  on public.spaces
  for update
  to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

-- ============================================================
-- PART 3 — Security lint fixes
-- ============================================================

-- 3.1 Revoke EXECUTE on SECURITY DEFINER functions that are
-- reachable via the REST RPC interface but should never be called
-- by clients. handle_new_user is the auth-trigger function (runs
-- as the trigger context, not via RPC). rls_auto_enable is an
-- internal helper. Triggers run under the table owner role, so
-- revoking from public/anon/authenticated does not break trigger
-- firing.

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon, authenticated;

-- rls_auto_enable is flagged by the linter but isn't defined in any
-- migration file in this repo — it was likely created by hand via
-- the SQL editor at some point. Guard the REVOKE in a DO block so
-- this migration succeeds whether or not the function exists.
do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'rls_auto_enable'
      and pronamespace = 'public'::regnamespace
  ) then
    revoke execute on function public.rls_auto_enable() from public;
    revoke execute on function public.rls_auto_enable() from anon, authenticated;
  end if;
end $$;
