-- Add an optional icon key to recurring bill templates so the monthly
-- view and bills page can render a per-bill icon. The value is a short
-- string key (e.g. "home", "building", "stethoscope") that maps to a
-- lucide-react icon in the app's icon registry. NULL = no icon picked
-- (UI falls back to a default Receipt icon).
--
-- No schema validation here — the registry of valid keys lives in
-- application code and can grow without a migration. RLS policies are
-- unchanged; the column inherits the existing template row policies.

ALTER TABLE recurring_bill_templates
  ADD COLUMN icon text;

COMMENT ON COLUMN recurring_bill_templates.icon IS
  'Optional icon key (matches a lucide-react icon name in src/lib/icons/bills.ts).';
