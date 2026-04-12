// Helpers for the monthly view route. Synchronous utilities and the
// on-demand month/instance creation logic. NOT a "use server" file —
// this module exports plain functions that the page imports directly.

import type { SupabaseClient } from "@supabase/supabase-js";

const UNIQUE_VIOLATION = "23505";

export type MonthRow = {
  id: string;
  space_id: string;
  year: number;
  month: number;
  unlock_reason: string | null;
};

export type YearMonth = { year: number; month: number };

// Capitalize the first character of a string. Used for dropdown labels
// because CSS text-transform doesn't reliably apply to <option> elements
// across browsers.
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Build the merged, sorted list of months to show in the calendar strip
// dropdown. The rules (from the Piece 4b plan):
//   - All months that already have a DB row in the user's personal space
//   - Plus the next 6 months from today (inclusive of the current month)
//   - Plus the currently viewed month (in case it's far future/past and
//     wouldn't otherwise appear — keeps the dropdown consistent with the URL)
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

  // Next 6 months from today, starting with the current month.
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    add(d.getFullYear(), d.getMonth() + 1);
  }

  add(currentView.year, currentView.month);

  result.sort((a, b) => a.year - b.year || a.month - b.month);
  return result;
}

// Check-on-read locking. A month is effectively locked if:
//   - (year, month) is strictly before the current year/month, AND
//   - unlock_reason is null (nobody has unlocked it for editing)
// Current and future months are always editable.
export function isMonthLocked(args: {
  year: number;
  month: number;
  unlock_reason: string | null;
}): boolean {
  if (args.unlock_reason) return false;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (args.year < currentYear) return true;
  if (args.year === currentYear && args.month < currentMonth) return true;
  return false;
}

// Given a bill_instance id, look up its month and check whether that
// month is locked. Returns null if editable, or an error message if
// locked / not found. Used by mutation server actions as the server-side
// defence against edits to locked months. Non-throwing so each caller
// can decide whether to throw (for use without useActionState) or
// return the error as form state.
export async function checkBillInstanceEditable(
  supabase: SupabaseClient,
  instanceId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("bill_instances")
    .select("months!inner(year, month, unlock_reason)")
    .eq("id", instanceId)
    .single();

  if (!data) return "Bill not found";

  const m = (data as unknown as {
    months: { year: number; month: number; unlock_reason: string | null };
  }).months;

  if (isMonthLocked(m)) {
    return "This month is locked. Unlock it before editing.";
  }

  return null;
}

// Same shape as checkBillInstanceEditable, but for income entries.
// Kept as a parallel function rather than generalized so each table's
// lookup is explicit and grep-able. If a third table needs this we
// can extract a shared helper.
export async function checkIncomeEntryEditable(
  supabase: SupabaseClient,
  entryId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("income_entries")
    .select("months!inner(year, month, unlock_reason)")
    .eq("id", entryId)
    .single();

  if (!data) return "Income entry not found";

  const m = (data as unknown as {
    months: { year: number; month: number; unlock_reason: string | null };
  }).months;

  if (isMonthLocked(m)) {
    return "This month is locked. Unlock it before editing.";
  }

  return null;
}

// Same shape again for one-off expenses. Three almost-identical helpers
// is mildly repetitive but each one is straightforward to read on its
// own and the table name is explicit at the call site.
export async function checkOneOffExpenseEditable(
  supabase: SupabaseClient,
  expenseId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("one_off_expenses")
    .select("months!inner(year, month, unlock_reason)")
    .eq("id", expenseId)
    .single();

  if (!data) return "Expense not found";

  const m = (data as unknown as {
    months: { year: number; month: number; unlock_reason: string | null };
  }).months;

  if (isMonthLocked(m)) {
    return "This month is locked. Unlock it before editing.";
  }

  return null;
}

// Format a year/month as a zero-padded URL segment: "/months/2026/04".
export function monthUrl(year: number, month: number): string {
  return `/months/${year}/${String(month).padStart(2, "0")}`;
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

// Format a year/month into a "YYYY-MM-DD" string, clamping the day to
// the last day of the month if it's larger (e.g. dueDay 31 in February
// becomes the 28th or 29th).
export function dueDateFor(
  year: number,
  month: number,
  dueDay: number | null
): string | null {
  if (dueDay == null) return null;

  // `new Date(year, month, 0)` returns the last day of the previous month
  // because the day argument is 1-based. Since JS months are 0-indexed,
  // passing our 1-indexed month directly with day=0 gives us the last day
  // of OUR month. Example: dueDateFor(2026, 2, 31) → daysInMonth = 28.
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = Math.min(dueDay, daysInMonth);

  const yyyy = String(year).padStart(4, "0");
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Format a year/month as a human-readable Brazilian Portuguese label,
// e.g. (2026, 4) → "abril de 2026".
export function formatMonthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

async function fetchMonth(
  supabase: SupabaseClient,
  spaceId: string,
  year: number,
  month: number
): Promise<MonthRow | null> {
  const { data } = await supabase
    .from("months")
    .select("id, space_id, year, month, unlock_reason")
    .eq("space_id", spaceId)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();
  return data ?? null;
}

async function generateBillInstances(
  supabase: SupabaseClient,
  monthId: string,
  spaceId: string,
  year: number,
  month: number
) {
  const { data: templates } = await supabase
    .from("recurring_bill_templates")
    .select("id, default_amount, due_day")
    .eq("space_id", spaceId)
    .eq("active", true);

  if (!templates || templates.length === 0) return;

  const instances = templates.map((t) => ({
    month_id: monthId,
    template_id: t.id as string,
    space_id: spaceId,
    amount: t.default_amount,
    due_date: dueDateFor(year, month, t.due_day as number | null),
    paid: false,
  }));

  await supabase.from("bill_instances").insert(instances);
}

// Idempotent: returns the existing month if there is one, otherwise
// creates the month + a bill_instance per active template.
//
// Race handling: two concurrent requests for the same brand-new month
// will both pass the SELECT and try to INSERT. The unique constraint
// on (space_id, year, month) makes one of them fail with code 23505;
// the loser re-fetches and returns the row that the winner created.
// The loser does NOT regenerate instances (the winner already did).
export async function getOrCreateMonth(
  supabase: SupabaseClient,
  spaceId: string,
  year: number,
  month: number
): Promise<MonthRow> {
  const existing = await fetchMonth(supabase, spaceId, year, month);
  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("months")
    .insert({ space_id: spaceId, year, month })
    .select("id, space_id, year, month, unlock_reason")
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      const retry = await fetchMonth(supabase, spaceId, year, month);
      if (retry) return retry;
    }
    throw new Error(`Failed to create month: ${error.message}`);
  }

  await generateBillInstances(supabase, created.id, spaceId, year, month);
  return created;
}
