// Category aggregation helpers — power future reports that group spend
// by the budget category each entry inherits from its icon.
//
// Kept in its own file (rather than added to `reports.ts`) so callers
// can import without dragging the @react-pdf/renderer chain in via
// the monthly-report machinery. See CLAUDE.md → "@react-pdf/renderer
// is server-only" for why that footgun matters.
//
// Note on what counts as "spend":
//   - One-off entries (template_id IS NULL):  always counted — they are
//     already-recorded events.
//   - Bill exceptions (template_id IS NOT NULL):  counted only when
//     paid = true. An unpaid override/virtual occurrence is still an
//     obligation, not money that left the account.
//   - Skipped rows are always excluded.
// Virtual (un-materialized) bill occurrences aren't in `entries` at all,
// so by construction they're absent from these totals — exactly what
// a "what I actually spent" report wants.

import type { SupabaseClient } from "@supabase/supabase-js";

export type CategorySpend = {
  category: string | null;   // null = entries created without an icon
  total: number;             // total + bills + expenses use BRL
  count: number;
  billsTotal: number;        // paid bill exceptions
  billsCount: number;
  expensesTotal: number;     // one-off entries
  expensesCount: number;
};

type EntryRow = {
  template_id: string | null;
  amount: number | string;
  paid: boolean;
  category: string | null;
};

// Per-category spend totals for a date range, sorted by `total` desc.
// `start` and `end` are inclusive "YYYY-MM-DD" strings.
export async function getCategorySpendForRange(
  supabase: SupabaseClient,
  spaceId: string,
  start: string,
  end: string
): Promise<CategorySpend[]> {
  const { data, error } = await supabase
    .from("entries")
    .select("template_id, amount, paid, category")
    .eq("space_id", spaceId)
    .eq("skipped", false)
    .gte("date", start)
    .lte("date", end);

  if (error) {
    throw new Error(`Falha ao agregar categorias: ${error.message}`);
  }

  const rows = (data ?? []) as EntryRow[];

  // Accumulate per category. The key is the literal string or the
  // sentinel "__NULL__" for entries with no category — a Map could
  // hold null directly but we'd lose type narrowing on the keys.
  const NULL_KEY = "__NULL__";
  const accum = new Map<string, CategorySpend>();

  for (const row of rows) {
    const isBill = row.template_id != null;
    // Bills count only when paid; one-offs always count.
    if (isBill && !row.paid) continue;

    const amount = Number(row.amount);
    if (!Number.isFinite(amount)) continue;

    const key = row.category ?? NULL_KEY;
    const existing = accum.get(key) ?? {
      category: row.category,
      total: 0,
      count: 0,
      billsTotal: 0,
      billsCount: 0,
      expensesTotal: 0,
      expensesCount: 0,
    };

    existing.total += amount;
    existing.count += 1;
    if (isBill) {
      existing.billsTotal += amount;
      existing.billsCount += 1;
    } else {
      existing.expensesTotal += amount;
      existing.expensesCount += 1;
    }
    accum.set(key, existing);
  }

  return Array.from(accum.values()).sort((a, b) => b.total - a.total);
}

// Convenience wrapper for the annual report case. Calendar year, not
// fiscal year — adjust the start/end strings if that ever needs to
// change.
export async function getCategorySpendForYear(
  supabase: SupabaseClient,
  spaceId: string,
  year: number
): Promise<CategorySpend[]> {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  return getCategorySpendForRange(supabase, spaceId, start, end);
}
