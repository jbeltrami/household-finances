-- ============================================================
-- HOME FINANCES APP — FINANCING (mortgage) feature
-- Migration: 0011_financing.sql
-- ============================================================
-- Adds housing/financing tracking. A financing is NOT a recurring
-- bill template: its amortization schedule (principal/interest split,
-- payment, balance) is computed from a few stored parameters plus any
-- recorded extra payments. We store only the durable inputs; the
-- schedule itself is computed at query time (see src/helpers/
-- amortization.ts), mirroring the virtual-expansion model used for
-- bill templates.
--
--   financings                       — the stored parameters (5 form fields + name)
--   financing_extra_payments         — amortizações extraordinárias
--   financing_installment_payments   — "this installment is paid" marks
--
-- All three are space-scoped with RLS gated on is_active_member
-- (== direct ownership after the 0010 cleanup).
-- ============================================================


-- ============================================================
-- SECTION 1 — TABLES
-- ============================================================

-- --- financings ----------------------------------------------
-- Durable parameters only. interest_rate is stored as entered
-- (a percentage) together with rate_period; the monthly fraction
-- is derived in code. Everything else about the loan (payment,
-- balance, remaining installments) is computed, never stored.
create table public.financings (
  id                   uuid primary key default gen_random_uuid(),
  space_id             uuid not null references public.spaces(id) on delete cascade,
  name                 text not null,
  principal            numeric(14, 2) not null check (principal > 0),
  interest_rate        numeric(9, 6) not null check (interest_rate >= 0),  -- percent, as entered
  rate_period          text not null check (rate_period in ('monthly', 'annual')),
  amortization_system  text not null check (amortization_system in ('sac', 'price')),
  start_date           date not null,
  installments_total   int not null check (installments_total > 0),
  active               boolean not null default true,
  created_at           timestamptz not null default now()
);

create index financings_space_idx
  on public.financings (space_id);

-- --- financing_extra_payments --------------------------------
-- Amortização extraordinária. `effect` decides how the remaining
-- schedule is reshaped: reduce_term keeps the payment and ends the
-- loan earlier; reduce_installment lowers the payment over the
-- remaining installments.
create table public.financing_extra_payments (
  id            uuid primary key default gen_random_uuid(),
  space_id      uuid not null references public.spaces(id) on delete cascade,
  financing_id  uuid not null references public.financings(id) on delete cascade,
  date          date not null,
  amount        numeric(14, 2) not null check (amount > 0),
  effect        text not null check (effect in ('reduce_term', 'reduce_installment')),
  notes         text,
  created_at    timestamptz not null default now()
);

create index financing_extra_payments_fin_date_idx
  on public.financing_extra_payments (financing_id, date);

-- --- financing_installment_payments --------------------------
-- A row marks installment N of a financing as paid. Installment ↔
-- date is stable (start-date day, N-1 months later), so keying by
-- number survives schedule reshaping from extra payments.
create table public.financing_installment_payments (
  id                  uuid primary key default gen_random_uuid(),
  space_id            uuid not null references public.spaces(id) on delete cascade,
  financing_id        uuid not null references public.financings(id) on delete cascade,
  installment_number  int not null check (installment_number > 0),
  paid_on             date,
  created_at          timestamptz not null default now(),
  unique (financing_id, installment_number)
);

create index financing_installment_payments_fin_idx
  on public.financing_installment_payments (financing_id);


-- ============================================================
-- SECTION 2 — ENABLE RLS
-- ============================================================
alter table public.financings                     enable row level security;
alter table public.financing_extra_payments       enable row level security;
alter table public.financing_installment_payments enable row level security;


-- ============================================================
-- SECTION 3 — POLICIES
-- Each table carries its own space_id, so all four verbs gate
-- directly on is_active_member(space_id) — the sole access
-- predicate after the 0010 shared-spaces cleanup.
-- ============================================================

-- --- financings ----------------------------------------------
create policy "Users can view financings in their spaces"
  on public.financings
  for select
  to authenticated
  using (public.is_active_member(space_id));

create policy "Users can create financings in their spaces"
  on public.financings
  for insert
  to authenticated
  with check (public.is_active_member(space_id));

create policy "Users can update financings in their spaces"
  on public.financings
  for update
  to authenticated
  using (public.is_active_member(space_id))
  with check (public.is_active_member(space_id));

create policy "Users can delete financings in their spaces"
  on public.financings
  for delete
  to authenticated
  using (public.is_active_member(space_id));

-- --- financing_extra_payments --------------------------------
create policy "Users can view extra payments in their spaces"
  on public.financing_extra_payments
  for select
  to authenticated
  using (public.is_active_member(space_id));

create policy "Users can create extra payments in their spaces"
  on public.financing_extra_payments
  for insert
  to authenticated
  with check (public.is_active_member(space_id));

create policy "Users can update extra payments in their spaces"
  on public.financing_extra_payments
  for update
  to authenticated
  using (public.is_active_member(space_id))
  with check (public.is_active_member(space_id));

create policy "Users can delete extra payments in their spaces"
  on public.financing_extra_payments
  for delete
  to authenticated
  using (public.is_active_member(space_id));

-- --- financing_installment_payments --------------------------
create policy "Users can view installment payments in their spaces"
  on public.financing_installment_payments
  for select
  to authenticated
  using (public.is_active_member(space_id));

create policy "Users can create installment payments in their spaces"
  on public.financing_installment_payments
  for insert
  to authenticated
  with check (public.is_active_member(space_id));

create policy "Users can update installment payments in their spaces"
  on public.financing_installment_payments
  for update
  to authenticated
  using (public.is_active_member(space_id))
  with check (public.is_active_member(space_id));

create policy "Users can delete installment payments in their spaces"
  on public.financing_installment_payments
  for delete
  to authenticated
  using (public.is_active_member(space_id));
