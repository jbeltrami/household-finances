// Insights helpers — compute averaged monthly figures over a trailing
// window and turn them into the five financial-health benchmarks shown
// on /insights.
//
// Two pieces:
//   - getBucketAveragesForRange: walks complete months and averages
//     income / bills / expenses. Reuses the ledger resolver per month
//     so virtual occurrences and installment math stay correct for
//     free. N <= 12 month-loops per page view is negligible for a
//     personal app; if this ever needs to scale, replace the loop with
//     a single range query + in-memory expansion.
//   - averageBuckets: the pure division at the end of that walk, split out
//     so the arithmetic can be tested without a database.
//   - computeInsights: a pure function (no DB) mapping averages +
//     parameters to benchmark values. Trivial to unit-test.

import type { SupabaseClient } from "@supabase/supabase-js";
import { addMonthsYm, getMonthRange, todayYmd, yearMonthKey } from "./date";
import { getEntriesForMonth } from "./ledger";
import { buildMonthItems, getFinancingLedger } from "./financing";
import { summarizeMonth } from "./month-summary";
import type { BucketAverages, IdealSettings, Insight } from "./types";

// The default scenario — applied when a space has no
// ideal_budget_settings row yet. Kept here (not in the table only) so
// the page and the reset-to-default flow share one source of truth.
export const DEFAULT_IDEAL_SETTINGS: IdealSettings = {
  savings_rate: 0.2,
  max_mortgage_rate: 0.3,
  max_fixed_rate: 0.5,
  emergency_months: 6,
  freedom_annual_mult: 25,
};

// Allowed averaging windows (in complete months) offered on the page.
export const WINDOW_OPTIONS = [3, 6, 12] as const;
export const DEFAULT_WINDOW = 6;

const NO_DATA: BucketAverages = {
  monthsUsed: 0,
  avgIncome: 0,
  avgBills: 0,
  avgExpenses: 0,
  avgMortgage: 0,
};

// Absolute month index for a "YYYY-MM" string, for cheap month math.
function monthIndex(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
}

// Average income / bills / expenses over the last `windowMonths`
// COMPLETE months ending at (endYear, endMonth) inclusive. The window
// shrinks automatically to however many months of history the space
// actually has: we find the earliest dated row and never average over
// months before it. Returns all-zero averages with monthsUsed=0 when
// the space has no data at all.
export async function getBucketAveragesForRange(
  supabase: SupabaseClient,
  spaceId: string,
  endYear: number,
  endMonth: number,
  windowMonths: number
): Promise<BucketAverages> {
  const endYm = yearMonthKey(endYear, endMonth);

  // Earliest month with any activity: min over entries.date and
  // income_entries.expected_date. Both come back as "YYYY-MM-DD".
  const [entryMinRes, incomeMinRes] = await Promise.all([
    supabase
      .from("entries")
      .select("date")
      .eq("space_id", spaceId)
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("income_entries")
      .select("expected_date")
      .eq("space_id", spaceId)
      .order("expected_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const earliestDates = [
    entryMinRes.data?.date,
    incomeMinRes.data?.expected_date,
  ].filter((d): d is string => !!d);

  if (earliestDates.length === 0) return NO_DATA;

  const earliestYm = earliestDates.sort()[0].slice(0, 7);

  // Months available from earliest data to the window end, inclusive,
  // clamped to the requested window. `available` can be <= 0 when the
  // user's only data is the current (incomplete) month — there's no
  // complete-month history to average yet, so report no data.
  const available = monthIndex(endYm) - monthIndex(earliestYm) + 1;
  if (available <= 0) return NO_DATA;
  const monthsUsed = Math.min(windowMonths, available);

  // Income summed across the whole range in one query (no virtual
  // expansion needed for income). Bills/expenses need per-month
  // resolution for virtual occurrences, so we loop those.
  const startYm = addMonthsYm(endYm, -(monthsUsed - 1));
  const rangeStart = getMonthRange(
    Number(startYm.slice(0, 4)),
    Number(startYm.slice(5, 7))
  ).start;
  const rangeEnd = getMonthRange(endYear, endMonth).end;

  const incomeRes = await supabase
    .from("income_entries")
    .select("amount")
    .eq("space_id", spaceId)
    .gte("expected_date", rangeStart)
    .lte("expected_date", rangeEnd);

  const incomeTotal = (incomeRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0
  );

  const today = todayYmd();

  // Hydrated once for the whole window; each month is a pure projection over
  // it, so a twelve-month window costs the same three queries as a three.
  const financingLedger = await getFinancingLedger(supabase, spaceId);

  const months: MonthlyBuckets[] = [];
  for (let i = 0; i < monthsUsed; i++) {
    const ym = addMonthsYm(endYm, -i);
    const y = Number(ym.slice(0, 4));
    const m = Number(ym.slice(5, 7));

    const entries = await getEntriesForMonth(supabase, [spaceId], y, m);
    const parcelas = buildMonthItems(financingLedger, y, m).bills;

    const totals = summarizeMonth({
      bills: entries.filter((e) => e.template_id != null),
      expenses: entries.filter((e) => e.template_id == null),
      // Receitas are summed across the whole range in one query above; no
      // virtual expansion is involved, so there is nothing to fold per month.
      income: [],
      financing: {
        // The parcela is a recurring obligation like any other Conta.
        bills: parcelas,
        // Amortizações extraordinárias are not. They happen once, and
        // averaging one across a window either flatters or damns every
        // month in it depending on where it landed.
        expenses: [],
      },
      today,
    });

    months.push({
      bills: totals.bills.total,
      expenses: totals.expenses.total,
      mortgage: parcelas.reduce((sum, p) => sum + p.amount, 0),
    });
  }

  return averageBuckets({ monthsUsed, incomeTotal, months });
}

// What one month contributed to the window.
export type MonthlyBuckets = {
  bills: number;
  expenses: number;
  // Part of `bills`, tracked separately so the housing benchmark has an
  // actual. A month the loan had not started in contributes zero, which is
  // what makes a window straddling its start average correctly.
  mortgage: number;
};

// The division at the end of the walk. Pure, so the arithmetic that decides
// what a user is told they spend can be checked without a database.
export function averageBuckets(input: {
  monthsUsed: number;
  incomeTotal: number;
  months: MonthlyBuckets[];
}): BucketAverages {
  const { monthsUsed, incomeTotal, months } = input;
  if (monthsUsed <= 0) return NO_DATA;

  const total = (pick: (m: MonthlyBuckets) => number) =>
    months.reduce((sum, m) => sum + pick(m), 0);

  return {
    monthsUsed,
    avgIncome: incomeTotal / monthsUsed,
    avgBills: total((m) => m.bills) / monthsUsed,
    avgExpenses: total((m) => m.expenses) / monthsUsed,
    avgMortgage: total((m) => m.mortgage) / monthsUsed,
  };
}

// Pure mapping from averages + parameters to the five benchmarks.
// Monthly-flow cards (savings, fixed expenses) carry an actual to
// compare; the rest are target/reference figures (actual = null).
export function computeInsights(
  averages: BucketAverages,
  settings: IdealSettings
): Insight[] {
  const { avgIncome, avgBills, avgExpenses, avgMortgage } = averages;
  const monthlySpend = avgBills + avgExpenses;
  const leftover = avgIncome - monthlySpend;

  const recommendedSavings = avgIncome * settings.savings_rate;
  const maxFixedExpenses = avgIncome * settings.max_fixed_rate;
  const maxMortgage = avgIncome * settings.max_mortgage_rate;
  const emergencyFund = monthlySpend * settings.emergency_months;
  const financialFreedom = monthlySpend * 12 * settings.freedom_annual_mult;

  return [
    {
      key: "recommendedSavings",
      target: recommendedSavings,
      actual: leftover,
      // Floor: you want to save AT LEAST this much.
      meets: leftover >= recommendedSavings,
    },
    {
      key: "maxFixedExpenses",
      target: maxFixedExpenses,
      actual: avgBills,
      // Cap: your fixed expenses should stay AT OR BELOW this.
      meets: avgBills <= maxFixedExpenses,
    },
    {
      key: "maxMortgage",
      target: maxMortgage,
      // The Financiamento parcela, which is also counted inside avgBills
      // above — shown separately here because this card is the one asking
      // specifically about housing.
      actual: avgMortgage,
      // Cap: the parcela should stay AT OR BELOW this.
      meets: avgMortgage <= maxMortgage,
    },
    { key: "emergencyFund", target: emergencyFund, actual: null, meets: null },
    {
      key: "financialFreedom",
      target: financialFreedom,
      actual: null,
      meets: null,
    },
  ];
}
