-- ============================================================
-- 0014 — Bill installments
--
-- Adds a bounded-series variant of recurring bill templates:
--   - installments_total: how many monthly installments to pay
--   - installments_start_month: which month to start (day must be 1)
-- Both null = indefinite recurring (today's behavior).
-- Both set = generate instances for exactly N monthly installments.
-- Installments are restricted to monthly cadence — weekly/biweekly
-- stay indefinite.
--
-- Also adds installments_covered on bill_instances so a single
-- payment can represent multiple installments (prepayment). Default
-- is 1. For non-installment bills it's ignored.
-- ============================================================


-- --- Template-level installment fields ----------------------

alter table public.recurring_bill_templates
  add column installments_total int,
  add column installments_start_month date;

alter table public.recurring_bill_templates
  add constraint bill_templates_installments_check check (
    (installments_total is null and installments_start_month is null)
    or (
      installments_total is not null
      and installments_start_month is not null
      and installments_total > 0
      and extract(day from installments_start_month) = 1
      and cadence = 'monthly'
    )
  );


-- --- Instance-level coverage --------------------------------

alter table public.bill_instances
  add column installments_covered int not null default 1
  check (installments_covered > 0);
