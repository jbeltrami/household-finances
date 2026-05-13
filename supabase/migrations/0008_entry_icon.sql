-- Add an optional icon key to one-off entries (Despesas). Bills inherit
-- their icon from their template via the join in `getEntriesForMonth`,
-- so this column is only meaningful when `template_id IS NULL`. NULL
-- means no icon picked (UI falls back to a default Receipt icon).
--
-- No validation here — the registry of valid keys lives in application
-- code (src/lib/icons/bills.ts) so it can grow without a migration.

ALTER TABLE entries
  ADD COLUMN icon text;

COMMENT ON COLUMN entries.icon IS
  'Optional icon key for one-off entries (template_id IS NULL). For template-bound rows, the icon is sourced from the template at query time.';
