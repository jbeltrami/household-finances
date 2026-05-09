-- --- Drop savings ------------------------------------------
-- The savings feature is being removed from the app. We're
-- dropping the tables outright (destructive); RLS policies and
-- the FK index go with them via CASCADE.
--
-- Order matters: savings_contributions has an FK to savings_funds,
-- so it must come down first. The `cascade` on each drop is a
-- safety net for any policy/trigger/grant we don't see here.

drop table if exists public.savings_contributions cascade;
drop table if exists public.savings_funds cascade;
