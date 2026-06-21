// Report helpers — fetch the data shape needed to render a monthly
// PDF report and enumerate which past months have any data to report.

import type { SupabaseClient } from "@supabase/supabase-js";
import { addMonthsYm, getMonthRange, todayYmd } from "./date";
import { getEntriesForMonth } from "./ledger";
import { getFinancingReport, type FinancingReportRow } from "./financing";
import { renderMonthlyReportPdf } from "@/lib/pdf/MonthlyReportPdf";
import type { ResolvedEntry } from "./types";

const REPORTS_BUCKET = "monthly-reports";

export function reportStoragePath(
  spaceId: string,
  year: number,
  month: number
): string {
  return `${spaceId}/${year}-${String(month).padStart(2, "0")}.pdf`;
}

export type ReportIncomeRow = {
  id: string;
  name: string;
  amount: number;
  expected_date: string;
  received: boolean;
};

// A bill/expense line in the report. Lighter than ResolvedEntry so financing
// installments and extra payments can sit alongside ledger entries.
export type ReportEntryRow = {
  date: string;
  name: string;
  amount: number;
  paid: boolean;
};

export type MonthlyReportData = {
  spaceName: string;
  year: number;
  month: number;
  bills: ReportEntryRow[];
  expenses: ReportEntryRow[];
  income: ReportIncomeRow[];
  financings: FinancingReportRow[];
  totals: {
    totalBills: number;
    paidBills: number;
    remainingBills: number;
    totalIncome: number;
    receivedIncome: number;
    stillToReceive: number;
    totalExpenses: number;
    netExpected: number;
    netSoFar: number;
  };
};

// Fetch the full data needed to render a monthly report PDF for the
// given personal space + month. Returns null when the month has no
// data of any kind (no entries or income), which the caller treats
// as "skip — nothing to report".
export async function getMonthlyReportData(
  supabase: SupabaseClient,
  spaceId: string,
  year: number,
  month: number
): Promise<MonthlyReportData | null> {
  const { data: space } = await supabase
    .from("spaces")
    .select("name")
    .eq("id", spaceId)
    .single();
  if (!space) return null;

  // Reports are personal-space only — no shared-space aggregation.
  const resolved = await getEntriesForMonth(supabase, [spaceId], year, month);
  const resolvedBills = resolved.filter((e) => e.template_id != null);
  const resolvedExpenses = resolved.filter((e) => e.template_id == null);

  // Financings: the dedicated report section + the month's installment / extra
  // payments folded into bills/expenses so the report matches the monthly view.
  const fin = await getFinancingReport(supabase, spaceId, year, month);

  const toRow = (e: ResolvedEntry): ReportEntryRow => ({
    date: e.date,
    name: e.name,
    amount: e.amount,
    paid: e.paid,
  });
  const byDate = (a: ReportEntryRow, b: ReportEntryRow) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0;

  const bills: ReportEntryRow[] = [
    ...resolvedBills.map(toRow),
    ...fin.installmentRows,
  ].sort(byDate);
  const expenses: ReportEntryRow[] = [
    ...resolvedExpenses.map(toRow),
    ...fin.extraRows,
  ].sort(byDate);

  const { start, end } = getMonthRange(year, month);

  const { data: rawIncome } = await supabase
    .from("income_entries")
    .select("id, name, amount, expected_date, received")
    .eq("space_id", spaceId)
    .gte("expected_date", start)
    .lte("expected_date", end)
    .order("expected_date", { ascending: true });

  const income: ReportIncomeRow[] = (rawIncome ?? []).map((i) => ({
    id: i.id as string,
    name: i.name as string,
    amount: Number(i.amount),
    expected_date: i.expected_date as string,
    received: i.received as boolean,
  }));

  if (
    bills.length === 0 &&
    expenses.length === 0 &&
    income.length === 0 &&
    fin.financings.length === 0
  ) {
    return null;
  }

  const totalBills = bills.reduce((s, e) => s + e.amount, 0);
  const paidBills = bills
    .filter((e) => e.paid)
    .reduce((s, e) => s + e.amount, 0);
  const remainingBills = totalBills - paidBills;

  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
  const receivedIncome = income
    .filter((i) => i.received)
    .reduce((s, i) => s + i.amount, 0);
  const stillToReceive = totalIncome - receivedIncome;

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  // Mirror the monthly view's netSoFar formula. For past months this
  // collapses to received - totalBills - expenses since every unpaid
  // bill is overdue by definition.
  const today = todayYmd();
  const overdueUnpaidBills = bills
    .filter((e) => !e.paid && e.date <= today)
    .reduce((s, e) => s + e.amount, 0);

  const netExpected = totalIncome - totalBills - totalExpenses;
  const netSoFar =
    receivedIncome - paidBills - overdueUnpaidBills - totalExpenses;

  return {
    spaceName: space.name as string,
    year,
    month,
    bills,
    expenses,
    income,
    financings: fin.financings,
    totals: {
      totalBills,
      paidBills,
      remainingBills,
      totalIncome,
      receivedIncome,
      stillToReceive,
      totalExpenses,
      netExpected,
      netSoFar,
    },
  };
}

// Enumerate past calendar months that contain any data for the given
// personal space. "Data" = at least one materialized entry or income
// row in the month, OR an active recurring template whose virtual
// expansion covers the month. Sorted newest first so the reports
// page can render directly.
export async function listNonEmptyPastMonths(
  supabase: SupabaseClient,
  spaceId: string
): Promise<{ year: number; month: number }[]> {
  const { data: space } = await supabase
    .from("spaces")
    .select("created_at")
    .eq("id", spaceId)
    .single();
  if (!space) return [];

  const spaceStartYm = (space.created_at as string).slice(0, 7);
  const today = todayYmd();
  const currentYm = today.slice(0, 7);
  const endYm = addMonthsYm(currentYm, -1);

  if (spaceStartYm > endYm) return [];

  const startDate = `${spaceStartYm}-01`;
  const currentMonthFirst = `${currentYm}-01`;

  const yms = new Set<string>();

  const { data: entries } = await supabase
    .from("entries")
    .select("date")
    .eq("space_id", spaceId)
    .gte("date", startDate)
    .lt("date", currentMonthFirst);
  for (const r of entries ?? []) yms.add((r.date as string).slice(0, 7));

  const { data: income } = await supabase
    .from("income_entries")
    .select("expected_date")
    .eq("space_id", spaceId)
    .gte("expected_date", startDate)
    .lt("expected_date", currentMonthFirst);
  for (const r of income ?? [])
    yms.add((r.expected_date as string).slice(0, 7));

  // Active templates: every month their virtual expansion covers
  // counts as non-empty, since the report would include those rows.
  const { data: rawTemplates } = await supabase
    .from("recurring_bill_templates")
    .select("id, installments_total, installments_start_month")
    .eq("space_id", spaceId)
    .eq("active", true);

  const templates = (rawTemplates ?? []) as Array<{
    id: string;
    installments_total: number | null;
    installments_start_month: string | null;
  }>;

  const installmentTplIds = templates
    .filter((t) => t.installments_total != null)
    .map((t) => t.id);
  const paidCoveredByTpl = new Map<string, number>();
  const paidRowsByTpl = new Map<string, number>();
  if (installmentTplIds.length > 0) {
    const { data: paid } = await supabase
      .from("entries")
      .select("template_id, installments_covered")
      .in("template_id", installmentTplIds)
      .eq("paid", true);
    for (const r of paid ?? []) {
      const tid = r.template_id as string;
      const covered = (r.installments_covered as number) ?? 1;
      paidCoveredByTpl.set(tid, (paidCoveredByTpl.get(tid) ?? 0) + covered);
      paidRowsByTpl.set(tid, (paidRowsByTpl.get(tid) ?? 0) + 1);
    }
  }

  for (const tpl of templates) {
    let tplStartYm = spaceStartYm;
    let tplEndYm = endYm;

    if (tpl.installments_total != null && tpl.installments_start_month) {
      const startMonth = tpl.installments_start_month.slice(0, 7);
      tplStartYm = startMonth > spaceStartYm ? startMonth : spaceStartYm;

      const paidCovered = paidCoveredByTpl.get(tpl.id) ?? 0;
      const paidRows = paidRowsByTpl.get(tpl.id) ?? 0;
      const paidExtra = Math.max(0, paidCovered - paidRows);
      const offset = tpl.installments_total - 1 - paidExtra;
      const installEndYm = addMonthsYm(startMonth, Math.max(0, offset));
      if (installEndYm < tplEndYm) tplEndYm = installEndYm;
    }

    if (tplStartYm > tplEndYm) continue;

    let cursor = tplStartYm;
    while (cursor <= tplEndYm) {
      yms.add(cursor);
      cursor = addMonthsYm(cursor, 1);
    }
  }

  return Array.from(yms)
    .filter((ym) => ym >= spaceStartYm && ym <= endYm)
    .sort()
    .reverse()
    .map((ym) => {
      const [y, m] = ym.split("-").map(Number);
      return { year: y, month: m };
    });
}

// Render a PDF for the given month and persist it to storage + the
// monthly_reports table. Reused by the manual generate action, the
// "generate missing" loop, and (in Piece C) the cron handler.
//
// `dataSource` is the client used to read app data — typically a user-
// session client for manual flows (RLS-enforced) and the admin client
// for cron. `admin` is always the admin client; storage uploads and
// the monthly_reports upsert bypass RLS deliberately.
//
// Returns false when the month has no data to report (caller decides
// whether that's an error or an expected skip).
export async function performReportGeneration(
  dataSource: SupabaseClient,
  admin: SupabaseClient,
  spaceId: string,
  year: number,
  month: number
): Promise<{ generated: boolean }> {
  const data = await getMonthlyReportData(dataSource, spaceId, year, month);
  if (!data) return { generated: false };

  const pdf = await renderMonthlyReportPdf(data);
  const path = reportStoragePath(spaceId, year, month);

  const { error: uploadError } = await admin.storage
    .from(REPORTS_BUCKET)
    .upload(path, pdf, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // Upsert WITHOUT sent_at — preserves any prior send timestamp on
  // regenerate. Piece B's email action sets sent_at separately.
  const { error: dbError } = await admin.from("monthly_reports").upsert(
    {
      space_id: spaceId,
      year,
      month,
      storage_path: path,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "space_id,year,month" }
  );
  if (dbError) {
    throw new Error(`Failed to record report: ${dbError.message}`);
  }

  return { generated: true };
}
