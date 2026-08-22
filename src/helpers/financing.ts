import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildSchedule,
  type AmortizationInput,
  type AmortizationSystem,
  type ExtraPaymentEffect,
  type ExtraPaymentInput,
  type RatePeriod,
  type Schedule,
} from "./amortization";
import { getMonthRange, todayYmd } from "./date";

// Stored financing parameters (the durable inputs — see
// supabase/migrations/0011_financing.sql). Everything else (payment,
// balance, remaining installments) is computed from these.
export type FinancingRow = {
  id: string;
  space_id: string;
  // Financiamento is a parallel ledger — its installments are computed from
  // these parameters rather than written to `entries` — so it needs its own
  // Categoria to be visible to spend reporting at all. Wiring it into the
  // aggregation totals belongs to the report piece.
  category_id: string | null;
  name: string;
  principal: number;
  interest_rate: number; // percent, as entered
  rate_period: RatePeriod;
  amortization_system: AmortizationSystem;
  start_date: string; // "YYYY-MM-DD"
  installments_total: number;
  active: boolean;
  created_at: string;
};

export type ExtraPaymentRow = {
  id: string;
  financing_id: string;
  date: string; // "YYYY-MM-DD"
  amount: number;
  effect: ExtraPaymentEffect;
  notes: string | null;
};

// A financing's monthly installment, surfaced as a "bill" in the monthly view.
export type MortgageBillItem = {
  financingId: string;
  financingName: string;
  installmentNumber: number;
  installmentsTotal: number; // effective term length (post extra payments)
  date: string;
  amount: number;
  paid: boolean;
};

// An extra payment, surfaced as an "expense" in the monthly view.
export type MortgageExpenseItem = {
  id: string;
  financingId: string;
  financingName: string;
  date: string;
  amount: number;
  effect: ExtraPaymentEffect;
};

export type FinancingSummary = {
  total: number; // effective number of installments
  paidCount: number;
  remaining: number;
  outstandingBalance: number;
  monthlyPayment: number; // the next unpaid installment's payment (0 if settled)
};

const FINANCING_COLUMNS =
  "id, space_id, name, principal, interest_rate, rate_period, amortization_system, start_date, installments_total, active, created_at, category_id";

function mapFinancing(r: Record<string, unknown>): FinancingRow {
  return {
    id: r.id as string,
    space_id: r.space_id as string,
    category_id: (r.category_id as string | null) ?? null,
    name: r.name as string,
    principal: Number(r.principal),
    interest_rate: Number(r.interest_rate),
    rate_period: r.rate_period as RatePeriod,
    amortization_system: r.amortization_system as AmortizationSystem,
    start_date: r.start_date as string,
    installments_total: Number(r.installments_total),
    active: r.active as boolean,
    created_at: r.created_at as string,
  };
}

function mapExtraPayment(r: Record<string, unknown>): ExtraPaymentRow {
  return {
    id: r.id as string,
    financing_id: r.financing_id as string,
    date: r.date as string,
    amount: Number(r.amount),
    effect: r.effect as ExtraPaymentEffect,
    notes: (r.notes as string | null) ?? null,
  };
}

// Translate a stored financing into the engine's input shape.
export function toAmortizationInput(f: FinancingRow): AmortizationInput {
  return {
    principal: f.principal,
    ratePercent: f.interest_rate,
    ratePeriod: f.rate_period,
    system: f.amortization_system,
    startDate: f.start_date,
    installments: f.installments_total,
  };
}

function toExtraInputs(extras: ExtraPaymentRow[]): ExtraPaymentInput[] {
  return extras.map((e) => ({ date: e.date, amount: e.amount, effect: e.effect }));
}

// Build the computed schedule for a stored financing + its extra payments.
export function buildFinancingSchedule(
  f: FinancingRow,
  extras: ExtraPaymentRow[]
): Schedule {
  return buildSchedule(toAmortizationInput(f), toExtraInputs(extras));
}

// Active financings for a space, newest first.
export async function getFinancings(
  supabase: SupabaseClient,
  spaceId: string
): Promise<FinancingRow[]> {
  const { data } = await supabase
    .from("financings")
    .select(FINANCING_COLUMNS)
    .eq("space_id", spaceId)
    .eq("active", true)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapFinancing);
}

// One financing by id (RLS scopes it to the caller's space). Returns null
// if not found / not visible / inactive-but-requested handled by caller.
export async function getFinancingById(
  supabase: SupabaseClient,
  financingId: string
): Promise<FinancingRow | null> {
  const { data } = await supabase
    .from("financings")
    .select(FINANCING_COLUMNS)
    .eq("id", financingId)
    .maybeSingle();
  return data ? mapFinancing(data) : null;
}

export async function getExtraPayments(
  supabase: SupabaseClient,
  financingId: string
): Promise<ExtraPaymentRow[]> {
  const { data } = await supabase
    .from("financing_extra_payments")
    .select("id, financing_id, date, amount, effect, notes")
    .eq("financing_id", financingId)
    .order("date", { ascending: true });
  return (data ?? []).map(mapExtraPayment);
}

// Set of paid installment numbers for a financing.
export async function getPaidInstallments(
  supabase: SupabaseClient,
  financingId: string
): Promise<Set<number>> {
  const { data } = await supabase
    .from("financing_installment_payments")
    .select("installment_number")
    .eq("financing_id", financingId);
  return new Set((data ?? []).map((r) => Number(r.installment_number)));
}

// Progress + outstanding balance.
//
// Outstanding balance is what's still owed *today*: the original principal
// minus the ordinary principal amortized by paid installments, minus every
// extra payment already made (dated on/before today). Anchoring it to the
// principal actually paid — rather than to the balance at the last paid
// installment — means a recorded amortização extraordinária reduces the
// balance immediately, even before any installment is marked paid.
export function summarizeFinancing(
  schedule: Schedule,
  paidNumbers: Set<number>,
  extras: ExtraPaymentRow[] = []
): FinancingSummary {
  const total = schedule.rows.length;
  const today = todayYmd();

  let paidCount = 0;
  let amortizedByPaid = 0; // ordinary principal from paid installments
  for (const row of schedule.rows) {
    if (paidNumbers.has(row.number)) {
      paidCount += 1;
      amortizedByPaid += row.amortization;
    }
  }

  let extrasPaid = 0; // extraordinary principal already paid
  for (const e of extras) {
    if (e.date <= today) extrasPaid += e.amount;
  }

  const outstandingBalance = Math.max(
    0,
    Math.round(
      (schedule.totals.principal - amortizedByPaid - extrasPaid) * 100
    ) / 100
  );

  // Next unpaid installment drives the "current monthly payment" figure.
  const nextUnpaid = schedule.rows.find((r) => !paidNumbers.has(r.number));
  const monthlyPayment = nextUnpaid ? nextUnpaid.payment : 0;

  return {
    total,
    paidCount,
    remaining: total - paidCount,
    outstandingBalance,
    monthlyPayment,
  };
}

// Per-financing standing for a monthly report, computed AS OF the report
// month-end (a historical snapshot, consistent with the rest of the report).
export type FinancingReportRow = {
  name: string;
  system: AmortizationSystem;
  ratePercent: number;
  ratePeriod: RatePeriod;
  installmentNumber: number | null; // parcela do mês (null if none this month)
  installmentAmount: number | null;
  installmentPaid: boolean;
  paidCount: number; // installments paid as of month-end
  totalInstallments: number; // effective term (schedule length)
  percentComplete: number; // 0–100
  outstandingBalance: number; // as of month-end
  payoffDate: string; // projected last installment date ("YYYY-MM-DD")
};

type ReportFoldRow = { date: string; name: string; amount: number; paid: boolean };

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Report data for all active financings of a space, as of the given month.
// Returns the per-financing rows for the dedicated report section, plus the
// month's installments and extra payments mapped as bill/expense rows to fold
// into the report totals (so the PDF matches the on-screen monthly view).
//
// Everything is computed AS OF month-end: only extra payments dated on/before
// the month-end shape the schedule, and only installments due by then count
// as paid — so a report for a past month reflects that month, not today.
export async function getFinancingReport(
  supabase: SupabaseClient,
  spaceId: string,
  year: number,
  month: number
): Promise<{
  financings: FinancingReportRow[];
  installmentRows: ReportFoldRow[];
  extraRows: ReportFoldRow[];
}> {
  const { data: finData } = await supabase
    .from("financings")
    .select(FINANCING_COLUMNS)
    .eq("space_id", spaceId)
    .eq("active", true);

  const financings = (finData ?? []).map(mapFinancing);
  if (financings.length === 0) {
    return { financings: [], installmentRows: [], extraRows: [] };
  }

  const ids = financings.map((f) => f.id);
  const ym = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
  const { start, end } = getMonthRange(year, month);
  const monthEnd = end;

  const [extrasRes, paidRes] = await Promise.all([
    supabase
      .from("financing_extra_payments")
      .select("id, financing_id, date, amount, effect, notes")
      .in("financing_id", ids),
    supabase
      .from("financing_installment_payments")
      .select("financing_id, installment_number")
      .in("financing_id", ids),
  ]);

  const extrasByFin = new Map<string, ExtraPaymentRow[]>();
  for (const r of extrasRes.data ?? []) {
    const e = mapExtraPayment(r);
    const list = extrasByFin.get(e.financing_id) ?? [];
    list.push(e);
    extrasByFin.set(e.financing_id, list);
  }
  const paidByFin = new Map<string, Set<number>>();
  for (const r of paidRes.data ?? []) {
    const fid = r.financing_id as string;
    const set = paidByFin.get(fid) ?? new Set<number>();
    set.add(Number(r.installment_number));
    paidByFin.set(fid, set);
  }

  const out: FinancingReportRow[] = [];
  const installmentRows: ReportFoldRow[] = [];
  const extraRows: ReportFoldRow[] = [];

  for (const f of financings) {
    // Financings that hadn't started by the report month don't belong in it.
    if (f.start_date > monthEnd) continue;

    const allExtras = extrasByFin.get(f.id) ?? [];
    const extrasAsOf = allExtras.filter((e) => e.date <= monthEnd);
    const schedule = buildFinancingSchedule(f, extrasAsOf);
    const paidSet = paidByFin.get(f.id) ?? new Set<number>();
    const total = schedule.rows.length;

    // Paid as of month-end = paid installments whose scheduled date <= month-end.
    let paidCount = 0;
    let amortizedByPaid = 0;
    for (const row of schedule.rows) {
      if (paidSet.has(row.number) && row.date <= monthEnd) {
        paidCount += 1;
        amortizedByPaid += row.amortization;
      }
    }
    const extrasPaidSum = extrasAsOf.reduce((s, e) => s + e.amount, 0);
    const outstanding = Math.max(
      0,
      round2(schedule.totals.principal - amortizedByPaid - extrasPaidSum)
    );

    const monthRow = schedule.rows.find((r) => r.date.slice(0, 7) === ym);

    // Skip financings already settled before this month (no installment now
    // and nothing left owed) — they'd just be noise in later reports.
    if (!monthRow && outstanding <= 0.005) continue;

    let installmentNumber: number | null = null;
    let installmentAmount: number | null = null;
    let installmentPaid = false;
    if (monthRow) {
      installmentNumber = monthRow.number;
      installmentAmount = monthRow.payment;
      installmentPaid = paidSet.has(monthRow.number);
      installmentRows.push({
        date: monthRow.date,
        name: `Financiamento ${f.name} (${monthRow.number}/${total})`,
        amount: monthRow.payment,
        paid: installmentPaid,
      });
    }

    for (const e of allExtras) {
      if (e.date >= start && e.date <= end) {
        extraRows.push({
          date: e.date,
          name: `Amortização — ${f.name}`,
          amount: e.amount,
          paid: true,
        });
      }
    }

    out.push({
      name: f.name,
      system: f.amortization_system,
      ratePercent: f.interest_rate,
      ratePeriod: f.rate_period,
      installmentNumber,
      installmentAmount,
      installmentPaid,
      paidCount,
      totalInstallments: total,
      percentComplete: total > 0 ? Math.round((paidCount / total) * 100) : 0,
      outstandingBalance: outstanding,
      payoffDate: schedule.rows[total - 1]?.date ?? f.start_date,
    });
  }

  return { financings: out, installmentRows, extraRows };
}

// Monthly-view items: for each active financing, the installment falling in
// the viewed month (a "bill") and any extra payments made that month
// (each an "expense"). Schedules are built with each financing's recorded
// extra payments so amounts/balances reflect reality.
export async function getFinancingMonthItems(
  supabase: SupabaseClient,
  spaceIds: string[],
  year: number,
  month: number
): Promise<{ bills: MortgageBillItem[]; expenses: MortgageExpenseItem[] }> {
  const { data: finData } = await supabase
    .from("financings")
    .select(FINANCING_COLUMNS)
    .in("space_id", spaceIds)
    .eq("active", true);

  const financings = (finData ?? []).map(mapFinancing);
  if (financings.length === 0) return { bills: [], expenses: [] };

  const ids = financings.map((f) => f.id);
  const ym = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
  const { start, end } = getMonthRange(year, month);

  const [extrasRes, paidRes] = await Promise.all([
    supabase
      .from("financing_extra_payments")
      .select("id, financing_id, date, amount, effect, notes")
      .in("financing_id", ids),
    supabase
      .from("financing_installment_payments")
      .select("financing_id, installment_number")
      .in("financing_id", ids),
  ]);

  const extrasByFin = new Map<string, ExtraPaymentRow[]>();
  for (const r of extrasRes.data ?? []) {
    const e = mapExtraPayment(r);
    const list = extrasByFin.get(e.financing_id) ?? [];
    list.push(e);
    extrasByFin.set(e.financing_id, list);
  }

  const paidByFin = new Map<string, Set<number>>();
  for (const r of paidRes.data ?? []) {
    const fid = r.financing_id as string;
    const set = paidByFin.get(fid) ?? new Set<number>();
    set.add(Number(r.installment_number));
    paidByFin.set(fid, set);
  }

  const bills: MortgageBillItem[] = [];
  const expenses: MortgageExpenseItem[] = [];

  for (const f of financings) {
    const extras = extrasByFin.get(f.id) ?? [];
    const schedule = buildSchedule(toAmortizationInput(f), toExtraInputs(extras));
    const paidSet = paidByFin.get(f.id) ?? new Set<number>();

    // The installment whose date lands in the viewed month (at most one
    // for a monthly schedule).
    const row = schedule.rows.find((r) => r.date.slice(0, 7) === ym);
    if (row) {
      bills.push({
        financingId: f.id,
        financingName: f.name,
        installmentNumber: row.number,
        installmentsTotal: schedule.rows.length,
        date: row.date,
        amount: row.payment,
        paid: paidSet.has(row.number),
      });
    }

    // Extra payments made within the viewed month → expenses.
    for (const e of extras) {
      if (e.date >= start && e.date <= end) {
        expenses.push({
          id: e.id,
          financingId: f.id,
          financingName: f.name,
          date: e.date,
          amount: e.amount,
          effect: e.effect,
        });
      }
    }
  }

  return { bills, expenses };
}
