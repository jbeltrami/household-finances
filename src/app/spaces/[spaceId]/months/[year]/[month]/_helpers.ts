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

// Offset a "YYYY-MM" string by N months, returning a "YYYY-MM" string.
// Used for installment window math — we keep everything in string form
// to dodge the timezone pitfalls that plague Date arithmetic on dates
// stored as "YYYY-MM-DD" in Postgres.
export function addMonthsYm(ym: string, offset: number): string {
  const [y, m] = ym.split("-").map(Number);
  const absolute = y * 12 + (m - 1) + offset;
  const year = Math.floor(absolute / 12);
  const month = (absolute % 12) + 1;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
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

// Format a Date as "YYYY-MM-DD" without going through UTC parsing.
function formatDateYmd(d: Date): string {
  const yyyy = String(d.getFullYear()).padStart(4, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Every occurrence of a specific weekday in a given month.
// dayOfWeek: 0=Sun, 1=Mon, ..., 6=Sat. Returns 4-5 "YYYY-MM-DD" strings.
function weeklyDatesInMonth(
  year: number,
  month: number,
  dayOfWeek: number
): string[] {
  const dates: string[] = [];
  // Start from day 1 of the month (JS months are 0-indexed)
  const d = new Date(year, month - 1, 1);
  // Advance to the first occurrence of dayOfWeek
  while (d.getDay() !== dayOfWeek) {
    d.setDate(d.getDate() + 1);
  }
  // Walk through the month in 7-day steps
  while (d.getMonth() === month - 1) {
    dates.push(formatDateYmd(d));
    d.setDate(d.getDate() + 7);
  }
  return dates;
}

// Biweekly occurrences of the anchor's weekday in a given month.
// The anchor determines both the day-of-week and the phase (which
// alternating weeks are "on"). Returns 0-3 "YYYY-MM-DD" strings.
function biweeklyDatesInMonth(
  year: number,
  month: number,
  anchorStr: string
): string[] {
  const anchor = new Date(anchorStr + "T12:00:00"); // noon to avoid DST edge
  const monthStart = new Date(year, month - 1, 1, 12);
  const monthEnd = new Date(year, month, 0, 12); // last day of month

  // Compute the offset from the anchor to monthStart in whole days,
  // then find how many days past a billing day monthStart falls.
  const msPerDay = 86400000;
  const diffDays = Math.round(
    (monthStart.getTime() - anchor.getTime()) / msPerDay
  );
  let remainder = diffDays % 14;
  if (remainder < 0) remainder += 14;

  // First billing day on or after monthStart
  const first = new Date(monthStart);
  if (remainder !== 0) {
    first.setDate(first.getDate() + (14 - remainder));
  }

  const dates: string[] = [];
  const d = new Date(first);
  while (d <= monthEnd) {
    if (d >= monthStart) {
      dates.push(formatDateYmd(d));
    }
    d.setDate(d.getDate() + 14);
  }
  return dates;
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
// space has matching `bill_instances` rows in the given month — one row
// for monthly templates, 4-5 for weekly, 2-3 for biweekly — without
// touching rows that already exist.
//
// Called on every read of a month (via getOrCreateMonth) so that a
// template created AFTER a month was first visited still shows up the
// next time the user opens that month. Also handles template
// deactivation/reactivation, post-unlock editing, and cadence changes.
//
// Race handling: the partial unique indexes on bill_instances
// (month_id, template_id, due_date) make concurrent duplicate INSERTs
// fail with 23505. We swallow that error because the winning request
// already did the work — the outcome is identical.
async function syncBillInstances(
  supabase: SupabaseClient,
  monthId: string,
  spaceId: string,
  year: number,
  month: number
) {
  const { data: templates } = await supabase
    .from("recurring_bill_templates")
    .select(
      "id, default_amount, due_day, cadence, day_of_week, biweekly_anchor, installments_total, installments_start_month"
    )
    .eq("space_id", spaceId)
    .eq("active", true);

  if (!templates || templates.length === 0) return;

  // For installment templates, compute how much "extra coverage" already
  // got paid in other months. Each paid instance with covered>1 represents
  // one month that absorbed multiple installments, which shifts the
  // effective end month earlier. extra = sum(covered - 1) across paid
  // instances. If it ends up zero (no prepayments yet), the effective end
  // is just start + (total - 1) months.
  const installmentTemplateIds = templates
    .filter((t) => (t.installments_total as number | null) != null)
    .map((t) => t.id as string);

  const extraByTemplate = new Map<string, number>();
  if (installmentTemplateIds.length > 0) {
    const { data: paidInstances } = await supabase
      .from("bill_instances")
      .select("template_id, installments_covered")
      .in("template_id", installmentTemplateIds)
      .eq("paid", true);

    for (const row of paidInstances ?? []) {
      const tid = row.template_id as string;
      const extra = ((row.installments_covered as number) ?? 1) - 1;
      extraByTemplate.set(tid, (extraByTemplate.get(tid) ?? 0) + extra);
    }
  }

  // Skip installment templates that fall outside their window for this
  // month. Non-installment templates always generate.
  const currentYm = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;

  const eligibleTemplates = templates.filter((t) => {
    const total = t.installments_total as number | null;
    if (total == null) return true;

    const startYm = (t.installments_start_month as string).slice(0, 7);
    if (currentYm < startYm) return false;

    const extra = extraByTemplate.get(t.id as string) ?? 0;
    const endYm = addMonthsYm(startYm, total - 1 - extra);
    if (currentYm > endYm) return false;

    return true;
  });

  if (eligibleTemplates.length === 0) return;

  // Existing instances: track (template_id, due_date) pairs since
  // weekly/biweekly templates can have multiple per month.
  const { data: existingInstances } = await supabase
    .from("bill_instances")
    .select("template_id, due_date")
    .eq("month_id", monthId);

  const existingKeys = new Set(
    (existingInstances ?? []).map(
      (i) => `${i.template_id}|${i.due_date ?? ""}`
    )
  );

  type NewInstance = {
    month_id: string;
    template_id: string;
    space_id: string;
    amount: number;
    due_date: string | null;
    paid: boolean;
  };

  const newInstances: NewInstance[] = [];

  for (const t of eligibleTemplates) {
    // Compute the set of due dates for this template in this month.
    let dueDates: (string | null)[];
    const cadence = (t.cadence as string) ?? "monthly";

    switch (cadence) {
      case "weekly":
        dueDates =
          t.day_of_week != null
            ? weeklyDatesInMonth(year, month, t.day_of_week as number)
            : [null];
        break;
      case "biweekly":
        dueDates = t.biweekly_anchor
          ? biweeklyDatesInMonth(
              year,
              month,
              t.biweekly_anchor as string
            )
          : [null];
        break;
      default:
        // monthly — one instance on due_day (or null if no due_day)
        dueDates = [dueDateFor(year, month, t.due_day as number | null)];
    }

    for (const dueDate of dueDates) {
      const key = `${t.id}|${dueDate ?? ""}`;
      if (!existingKeys.has(key)) {
        newInstances.push({
          month_id: monthId,
          template_id: t.id as string,
          space_id: spaceId,
          amount: t.default_amount as number,
          due_date: dueDate,
          paid: false,
        });
      }
    }
  }

  if (newInstances.length === 0) return;

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
