-- ============================================================
-- HOME FINANCES APP — DROP THE LEGACY CATEGORY TEXT
-- Migration: 0013_drop_category_text.sql
-- ============================================================
-- Migration 0012 replaced the denormalised `category` text columns with
-- `category_id` foreign keys, but deliberately left the text in place:
-- the backfill matched it against freshly seeded Categoria names, and if
-- that mapping misfired the text was the only record of what a row used
-- to say. It is dropped here now that it has served that purpose.
--
-- It did earn its keep. 0012 assumed the old text was always one of the
-- seven icon-group names the derivation produced. Production disagreed —
-- several templates carried free-text predating the derivation ("House",
-- "Occam", "Contas básicas", "Health", "Music") and resolved to NULL. All
-- of those values are recorded in git (docs/specs, the ticket files, and
-- the 0012 commit message) whether or not they live in Postgres, and
-- their owners can assign real Categorias whenever they like.
--
-- Nothing reads these columns any more: the ledger, the aggregation, and
-- every form moved to `category_id` in tickets 03, 04 and 07, and the
-- application-side `categoryFor(icon)` derivation that used to write them
-- is deleted.
--
-- No data loss beyond the text itself. `category_id` is untouched, and
-- rows that never resolved simply remain uncategorised — which the UI
-- already renders as "Sem categoria" and the aggregation already
-- accumulates into its own bucket.
-- ============================================================

alter table public.entries
  drop column if exists category;

alter table public.recurring_bill_templates
  drop column if exists category;
