-- --- ideal_budget_settings ---------------------------------
-- Per-space parameters for the financial-insights page. Each row
-- holds the multipliers behind the five benchmarks shown on
-- /insights. Absence of a row means "use the defaults" (the
-- default-on pattern, same as monthly_report_settings): a brand-new
-- user sees sensible numbers with zero setup, and a row only exists
-- once the user customizes their parameters.
--
--   savings_rate        monthly: recommended savings = income * rate
--   max_mortgage_rate   monthly: max housing payment = income * rate
--   max_fixed_rate      monthly: max fixed expenses  = income * rate
--   emergency_months    wealth:  emergency fund = monthly spend * months
--   freedom_annual_mult wealth:  financial freedom = annual spend * mult
--                                (the 4% rule => 25x annual spending)
create table public.ideal_budget_settings (
  space_id            uuid primary key references public.spaces(id) on delete cascade,
  savings_rate        numeric not null default 0.20,
  max_mortgage_rate   numeric not null default 0.30,
  max_fixed_rate      numeric not null default 0.50,
  emergency_months    numeric not null default 6,
  freedom_annual_mult numeric not null default 25,
  -- Guard against nonsensical values; rates are fractions of income,
  -- the wealth multipliers are positive counts.
  constraint ideal_budget_rates_nonneg check (
    savings_rate >= 0 and max_mortgage_rate >= 0 and max_fixed_rate >= 0
    and emergency_months >= 0 and freedom_annual_mult >= 0
  )
);

alter table public.ideal_budget_settings enable row level security;

create policy "Members can view ideal budget settings in their spaces"
  on public.ideal_budget_settings
  for select
  to authenticated
  using (public.is_active_member(space_id));

create policy "Members can create ideal budget settings in their spaces"
  on public.ideal_budget_settings
  for insert
  to authenticated
  with check (public.is_active_member(space_id));

create policy "Members can update ideal budget settings in their spaces"
  on public.ideal_budget_settings
  for update
  to authenticated
  using (public.is_active_member(space_id))
  with check (public.is_active_member(space_id));

-- No DELETE policy: resetting to defaults is an UPDATE back to the
-- default values, not a row delete.
