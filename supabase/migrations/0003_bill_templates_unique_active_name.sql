-- ============================================================
-- 0003 — Partial unique index on recurring_bill_templates
--
-- Prevents two ACTIVE templates with the same name in the
-- same space. Deactivated templates don't count, so a user
-- can deactivate "Claro" and create a new active "Claro"
-- with different values.
--
-- The index uses lower(trim(name)) so it's case- and
-- whitespace-insensitive: "Claro", "claro ", and " CLARO"
-- all collide while the original casing is preserved in
-- the column.
-- ============================================================
create unique index recurring_bill_templates_space_active_name_unique
  on public.recurring_bill_templates (space_id, lower(trim(name)))
  where active = true;
