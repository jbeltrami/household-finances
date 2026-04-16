-- ============================================================
-- 0013 — Bill template recurrence (weekly / biweekly cadence)
--
-- Extends recurring_bill_templates with cadence support:
--   - 'monthly' (default): one instance per month on due_day
--   - 'weekly': one instance per occurrence of day_of_week
--     in the month (4-5 instances)
--   - 'biweekly': every other occurrence of the anchor's
--     weekday (2-3 instances per month)
--
-- Also changes the bill_instances unique constraint from
-- (month_id, template_id) to (month_id, template_id, due_date)
-- so that weekly/biweekly templates can have multiple instances
-- in a single month, one per due date.
-- ============================================================


-- --- New columns on recurring_bill_templates ----------------

alter table public.recurring_bill_templates
  add column cadence text not null default 'monthly',
  add column day_of_week int,
  add column biweekly_anchor date;

-- Enforce valid column combinations per cadence:
--   monthly:  day_of_week and biweekly_anchor must be NULL
--   weekly:   day_of_week required (0=Sun..6=Sat), no anchor
--   biweekly: day_of_week required, anchor required
alter table public.recurring_bill_templates
  add constraint bill_templates_cadence_check check (
    (cadence = 'monthly'  and day_of_week is null and biweekly_anchor is null) or
    (cadence = 'weekly'   and day_of_week is not null and day_of_week between 0 and 6 and biweekly_anchor is null) or
    (cadence = 'biweekly' and day_of_week is not null and day_of_week between 0 and 6 and biweekly_anchor is not null)
  );

-- Also restrict cadence to the three allowed values.
alter table public.recurring_bill_templates
  add constraint bill_templates_cadence_values check (
    cadence in ('monthly', 'weekly', 'biweekly')
  );


-- --- Change unique constraint on bill_instances -------------
-- Old: (month_id, template_id) — one instance per template per month
-- New: needs to allow multiple instances per template per month
-- (for weekly/biweekly), one per due date.
--
-- Postgres treats NULLs as distinct in unique constraints, so a
-- simple (month_id, template_id, due_date) would let multiple
-- rows with due_date=NULL slip through. We use two partial unique
-- indexes instead: one for rows WITH a due date (the weekly/
-- biweekly case), one for rows WITHOUT (monthly templates with no
-- due_day). Together they cover all cases correctly.

alter table public.bill_instances
  drop constraint bill_instances_month_id_template_id_key;

-- One instance per template per due_date per month (non-null dates)
create unique index bill_instances_month_template_date_key
  on public.bill_instances (month_id, template_id, due_date)
  where due_date is not null;

-- One instance per template per month when due_date is null
create unique index bill_instances_month_template_null_date_key
  on public.bill_instances (month_id, template_id)
  where due_date is null;
