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
//   - computeInsights: a pure function (no DB) mapping averages +
//     parameters to benchmark values. Trivial to unit-test.

import type { SupabaseClient } from "@supabase/supabase-js";
import { addMonthsYm, getMonthRange, yearMonthKey } from "./date";
import { getEntriesForMonth } from "./ledger";
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

  if (earliestDates.length === 0) {
    return { monthsUsed: 0, avgIncome: 0, avgBills: 0, avgExpenses: 0 };
  }

  const earliestYm = earliestDates.sort()[0].slice(0, 7);

  // Months available from earliest data to the window end, inclusive,
  // clamped to the requested window. `available` can be <= 0 when the
  // user's only data is the current (incomplete) month — there's no
  // complete-month history to average yet, so report no data.
  const available = monthIndex(endYm) - monthIndex(earliestYm) + 1;
  if (available <= 0) {
    return { monthsUsed: 0, avgIncome: 0, avgBills: 0, avgExpenses: 0 };
  }
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

  let billsTotal = 0;
  let expensesTotal = 0;
  for (let i = 0; i < monthsUsed; i++) {
    const ym = addMonthsYm(endYm, -i);
    const y = Number(ym.slice(0, 4));
    const m = Number(ym.slice(5, 7));
    const entries = await getEntriesForMonth(supabase, [spaceId], y, m);
    for (const e of entries) {
      if (e.template_id) billsTotal += e.amount;
      else expensesTotal += e.amount;
    }
  }

  return {
    monthsUsed,
    avgIncome: incomeTotal / monthsUsed,
    avgBills: billsTotal / monthsUsed,
    avgExpenses: expensesTotal / monthsUsed,
  };
}

// Pure mapping from averages + parameters to the five benchmarks.
// Monthly-flow cards (savings, fixed expenses) carry an actual to
// compare; the rest are target/reference figures (actual = null).
export function computeInsights(
  averages: BucketAverages,
  settings: IdealSettings
): Insight[] {
  const { avgIncome, avgBills, avgExpenses } = averages;
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
    { key: "maxMortgage", target: maxMortgage, actual: null, meets: null },
    { key: "emergencyFund", target: emergencyFund, actual: null, meets: null },
    {
      key: "financialFreedom",
      target: financialFreedom,
      actual: null,
      meets: null,
    },
  ];
}
