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

// Discriminated result type for the per-row edit checkers below.
// Successful checks return the row's space + month coordinates so
// the caller can build space-prefixed revalidatePath URLs without a
// second lookup; failures return an error message suitable for
// inline form display.
export type EditCheckResult =
  | { ok: false; error: string }
  | { ok: true; spaceId: string; year: number; month: number };

// Given a bill_instance id, look up its month and check whether that
// month is locked. Used by mutation server actions as the server-side
// defence against edits to locked months. Non-throwing so each caller
// can decide whether to throw (for use without useActionState) or
// return the error as form state.
export async function checkBillInstanceEditable(
  supabase: SupabaseClient,
  instanceId: string
): Promise<EditCheckResult> {
  const { data } = await supabase
    .from("bill_instances")
    .select("space_id, months!inner(year, month, unlock_reason)")
    .eq("id", instanceId)
    .single();

  if (!data) return { ok: false, error: "Bill not found" };

  const row = data as unknown as {
    space_id: string;
    months: { year: number; month: number; unlock_reason: string | null };
  };

  if (isMonthLocked(row.months)) {
    return {
      ok: false,
      error: "This month is locked. Unlock it before editing.",
    };
  }

  return {
    ok: true,
    spaceId: row.space_id,
    year: row.months.year,
    month: row.months.month,
  };
}

// Same shape as checkBillInstanceEditable, but for income entries.
// Kept as a parallel function rather than generalized so each table's
// lookup is explicit and grep-able. If a third table needs this we
// can extract a shared helper.
export async function checkIncomeEntryEditable(
  supabase: SupabaseClient,
  entryId: string
): Promise<EditCheckResult> {
  const { data } = await supabase
    .from("income_entries")
    .select("space_id, months!inner(year, month, unlock_reason)")
    .eq("id", entryId)
    .single();

  if (!data) return { ok: false, error: "Income entry not found" };

  const row = data as unknown as {
    space_id: string;
    months: { year: number; month: number; unlock_reason: string | null };
  };

  if (isMonthLocked(row.months)) {
    return {
      ok: false,
      error: "This month is locked. Unlock it before editing.",
    };
  }

  return {
    ok: true,
    spaceId: row.space_id,
    year: row.months.year,
    month: row.months.month,
  };
}

// Same shape again for one-off expenses. Three almost-identical helpers
// is mildly repetitive but each one is straightforward to read on its
// own and the table name is explicit at the call site.
export async function checkOneOffExpenseEditable(
  supabase: SupabaseClient,
  expenseId: string
): Promise<EditCheckResult> {
  const { data } = await supabase
    .from("one_off_expenses")
    .select("space_id, months!inner(year, month, unlock_reason)")
    .eq("id", expenseId)
    .single();

  if (!data) return { ok: false, error: "Expense not found" };

  const row = data as unknown as {
    space_id: string;
    months: { year: number; month: number; unlock_reason: string | null };
  };

  if (isMonthLocked(row.months)) {
    return {
      ok: false,
      error: "This month is locked. Unlock it before editing.",
    };
  }

  return {
    ok: true,
    spaceId: row.space_id,
    year: row.months.year,
    month: row.months.month,
  };
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

// Idempotent bill-instance sync. Ensures every active template in the
// space has a matching `bill_instances` row in the given month, without
// touching rows that already exist.
//
// Called on every read of a month (via getOrCreateMonth) so that a
// template created AFTER a month was first visited still shows up the
// next time the user opens that month. Handles three edge cases that
// the one-shot "generate at creation time" approach missed:
//   - Template created after the month row exists
//   - Template deactivated then reactivated
//   - Month unlocked after being locked, allowing new activity
//
// Race handling: if a concurrent request inserts the same missing rows
// between our SELECT and our INSERT, the (month_id, template_id) unique
// constraint on bill_instances will make our INSERT fail with 23505.
// We swallow that specific error because the winning request already
// did the work we were about to do — the outcome is the same.
async function syncBillInstances(
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

  const { data: existingInstances } = await supabase
    .from("bill_instances")
    .select("template_id")
    .eq("month_id", monthId);

  const existingTemplateIds = new Set(
    (existingInstances ?? []).map((i) => i.template_id as string)
  );

  const missing = templates.filter(
    (t) => !existingTemplateIds.has(t.id as string)
  );

  if (missing.length === 0) return;

  const newInstances = missing.map((t) => ({
    month_id: monthId,
    template_id: t.id as string,
    space_id: spaceId,
    amount: t.default_amount,
    due_date: dueDateFor(year, month, t.due_day as number | null),
    paid: false,
  }));

  const { error } = await supabase
    .from("bill_instances")
    .insert(newInstances);

  if (error && error.code !== UNIQUE_VIOLATION) {
    throw new Error(`Failed to sync bill instances: ${error.message}`);
  }
}

// Returns the existing month if there is one, otherwise creates the
// month row. In both cases, runs syncBillInstances to backfill any
// missing bill_instances from templates active in the space.
//
// Race handling for the create path: two concurrent requests for the
// same brand-new month will both pass the SELECT and try to INSERT.
// The unique constraint on (space_id, year, month) makes one of them
// fail with code 23505; the loser re-fetches and returns the row that
// the winner created. Both paths then run syncBillInstances, which is
// itself idempotent — safe to call twice.
export async function getOrCreateMonth(
  supabase: SupabaseClient,
  spaceId: string,
  year: number,
  month: number
): Promise<MonthRow> {
  const existing = await fetchMonth(supabase, spaceId, year, month);
  if (existing) {
    await syncBillInstances(supabase, existing.id, spaceId, year, month);
    return existing;
  }

  const { data: created, error } = await supabase
    .from("months")
    .insert({ space_id: spaceId, year, month })
    .select("id, space_id, year, month, unlock_reason")
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      const retry = await fetchMonth(supabase, spaceId, year, month);
      if (retry) {
        await syncBillInstances(supabase, retry.id, spaceId, year, month);
        return retry;
      }
    }
    throw new Error(`Failed to create month: ${error.message}`);
  }

  await syncBillInstances(supabase, created.id, spaceId, year, month);
  return created;
}
