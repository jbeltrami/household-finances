// Monthly-view-specific helpers. Cross-route ledger logic lives in
// src/helpers/ledger.ts; lock helpers in src/helpers/lock.ts; pure
// date utilities in src/helpers/date.ts.

export type YearMonth = { year: number; month: number };

// Capitalize the first character of a string. Used for dropdown labels
// because CSS text-transform doesn't reliably apply to <option> elements
// across browsers.
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Build the merged, sorted list of months to show in the calendar strip
// dropdown. The rules:
//   - All months passed in `existing` (typically months where the
//     viewed space has materialized entries, an unlock row, or other
//     activity worth surfacing)
//   - Plus the next 6 months from today (inclusive of the current month)
//   - Plus the currently viewed month (keeps the dropdown in sync with
//     the URL even when viewing a far-past/future month)
// Deduped by (year, month), sorted ascending chronologically.
export function buildMonthOptions(
  existing: YearMonth[],
  currentView: YearMonth
): YearMonth[] {
  const seen = new Set<string>();
  const result: YearMonth[] = [];

  const add = (y: number, m: number) => {
    const key = `${y}-${m}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ year: y, month: m });
  };

  existing.forEach((em) => add(em.year, em.month));

  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    add(d.getFullYear(), d.getMonth() + 1);
  }

  add(currentView.year, currentView.month);

  result.sort((a, b) => a.year - b.year || a.month - b.month);
  return result;
}

// Compute the previous calendar month. January rolls back to December
// of the prior year.
export function prevMonth(
  year: number,
  month: number
): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

// Compute the next calendar month. December rolls forward to January
// of the next year.
export function nextMonth(
  year: number,
  month: number
): { year: number; month: number } {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}
