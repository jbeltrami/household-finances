-- ============================================================
-- 0008 — Drop `household` from the spaces.type CHECK constraint
--
-- The original schema (0001) allowed
--   type in ('personal', 'household', 'shared')
--
-- Piece 8 settles on "shared space" as the single term for any
-- collaborative budget context (couples, roommates, households,
-- any multi-person group). "Household" was one motivating use
-- case, not a distinct type, and keeping it as a valid value
-- only creates ambiguity in future code and data.
--
-- This migration tightens the constraint to
--   type in ('personal', 'shared')
--
-- Safe to run: no rows with type = 'household' have ever been
-- created (the app has no code path that inserts one — Piece 8
-- is still being built), so the new constraint has nothing to
-- reject. If a future audit finds any, this migration would
-- error cleanly before touching the schema.
-- ============================================================

alter table public.spaces
  drop constraint spaces_type_check;

alter table public.spaces
  add constraint spaces_type_check
  check (type in ('personal', 'shared'));
