// Ledger helpers — the heart of the ledger-model data layer.
//
// Recurring bill templates are NOT materialized into per-month rows
// any more. Instead, occurrences are expanded virtually at query time
// via `expandTemplateForMonth`. A row only appears in the `entries`
// table when the user does something to a specific occurrence:
//   - pays it              (paid = true)
//   - overrides the amount (amount != template default)
//   - skips it             (skipped = true)
// One-off entries also live in `entries`, distinguished by a NULL
// `template_id`.
//
// `getEntriesForMonth` unifies virtual and materialized occurrences
// into a single `ResolvedEntry[]` that the monthly view and dashboard
// consume without caring about the distinction.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addMonthsYm,
  dueDateFor,
  formatDateYmd,
  getMonthRange,
  yearMonthKey,
} from "./date";

// ============================================================
// TYPES
// ============================================================

export type TemplateRecurrence = {
  id: string;
  space_id: string;
  name: string;
  default_amount: number;
  currency: string;
  category: string | null;
  cadence: "monthly" | "weekly" | "biweekly";
  due_day: number | null;
  day_of_week: number | null;
  biweekly_anchor: string | null;
  installments_total: number | null;
  installments_start_month: string | null;
};

export type InstallmentProgress = {
  paid: number;        // sum of installments_covered on paid entries
  total: number;       // installments_total
  remaining: number;   // total - paid
  defaultAmount: number;
};

// Unified shape the UI consumes. When `id` is null, this is a virtual
// occurrence with no materialized row yet; any mutation on it has to
// insert a row first. When `id` is set, it's a real row in `entries`.
export type ResolvedEntry = {
  id: string | null;
  space_id: string;
  template_id: string | null;
  date: string;                  // "YYYY-MM-DD"
  name: string;
  amount: number;
  currency: string;
  category: string | null;
  notes: string | null;
  paid: boolean;
  installments_covered: number;
  installmentProgress: InstallmentProgress | null;
};

// ============================================================
// CADENCE EXPANSION
// ============================================================

// Every occurrence of a specific weekday in a given month.
// dayOfWeek: 0 = Sun, ..., 6 = Sat. Returns 4-5 "YYYY-MM-DD" strings.
function weeklyDatesInMonth(
  year: number,
  month: number,
  dayOfWeek: number
): string[] {
  const dates: string[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getDay() !== dayOfWeek) {
    d.setDate(d.getDate() + 1);
  }
  while (d.getMonth() === month - 1) {
    dates.push(formatDateYmd(d));
    d.setDate(d.getDate() + 7);
  }
  return dates;
}

// Biweekly occurrences in a given month, keyed off the anchor date
// (which fixes both the weekday and the phase). Returns 0-3 dates.
function biweeklyDatesInMonth(
  year: number,
  month: number,
  anchorStr: string
): string[] {
  const anchor = new Date(anchorStr + "T12:00:00");
  const monthStart = new Date(year, month - 1, 1, 12);
  const monthEnd = new Date(year, month, 0, 12);

  const msPerDay = 86400000;
  const diffDays = Math.round(
    (monthStart.getTime() - anchor.getTime()) / msPerDay
  );
  let remainder = diffDays % 14;
  if (remainder < 0) remainder += 14;

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

// Compute the inclusive [startYm, endYm] window ("YYYY-MM" strings)
// during which an installment template emits occurrences.
// The effective end shifts earlier by `paidExtra` months, where
// `paidExtra = sum(installments_covered - 1) across paid entries`, so
// the series always covers exactly `installments_total` installments
// no matter how much the user prepaid. Returns null for non-
// installment templates (always active).
function installmentActiveRange(
  template: TemplateRecurrence,
  paidExtra: number
): { startYm: string; endYm: string } | null {
  if (template.installments_total == null) return null;
  if (!template.installments_start_month) {
    return { startYm: "9999-99", endYm: "0000-00" };
  }
  const startYm = template.installments_start_month.slice(0, 7);
  const endOffset = template.installments_total - 1 - paidExtra;
  const endYm = addMonthsYm(startYm, Math.max(0, endOffset));
  return { startYm, endYm };
}

// Expand a single template's occurrences that fall within the given
// calendar month. Returns "YYYY-MM-DD" strings. The caller decides
// whether each date has a materialized row or is a pure-virtual entry.
//
// `paidCoveredForTemplate` and `paidRowsForTemplate` together compute
// the "extra" installments absorbed by prepayments:
//   paidExtra = paidCoveredForTemplate - paidRowsForTemplate
// which is the amount to shift the effective end earlier by.
export function expandTemplateForMonth(
  template: TemplateRecurrence,
  year: number,
  month: number,
  paidCoveredForTemplate: number,
  paidRowsForTemplate: number
): string[] {
  // Installment window check (monthly cadence only by schema CHECK).
  const paidExtra = Math.max(
    0,
    paidCoveredForTemplate - paidRowsForTemplate
  );
  const range = installmentActiveRange(template, paidExtra);
  if (range) {
    const currentYm = yearMonthKey(year, month);
    if (currentYm < range.startYm || currentYm > range.endYm) return [];
  }

  switch (template.cadence) {
    case "weekly":
      return template.day_of_week != null
        ? weeklyDatesInMonth(year, month, template.day_of_week)
        : [];
    case "biweekly":
      return template.biweekly_anchor
        ? biweeklyDatesInMonth(year, month, template.biweekly_anchor)
        : [];
    default: {
      const due = dueDateFor(year, month, template.due_day);
      return due ? [due] : [];
    }
  }
}

// ============================================================
// INSTALLMENT PROGRESS
// ============================================================

export function computeInstallmentProgress(
  template: TemplateRecurrence,
  paidCovered: number
): InstallmentProgress | null {
  if (template.installments_total == null) return null;
  return {
    paid: paidCovered,
    total: template.installments_total,
    remaining: template.installments_total - paidCovered,
    defaultAmount: template.default_amount,
  };
}

// ============================================================
// DB SHAPES
// ============================================================

type EntryRow = {
  id: string;
  space_id: string;
  template_id: string | null;
  date: string;
  name: string;
  amount: number | string;
  currency: string;
  category: string | null;
  notes: string | null;
  paid: boolean;
  skipped: boolean;
  installments_covered: number;
};

type TemplateRow = {
  id: string;
  space_id: string;
  name: string;
  default_amount: number | string;
  currency: string;
  category: string | null;
  active: boolean;
  cadence: string;
  due_day: number | null;
  day_of_week: number | null;
  biweekly_anchor: string | null;
  installments_total: number | null;
  installments_start_month: string | null;
};

function normalizeTemplate(row: TemplateRow): TemplateRecurrence {
  return {
    id: row.id,
    space_id: row.space_id,
    name: row.name,
    default_amount: Number(row.default_amount),
    currency: row.currency,
    category: row.category,
    cadence: row.cadence as TemplateRecurrence["cadence"],
    due_day: row.due_day,
    day_of_week: row.day_of_week,
    biweekly_anchor: row.biweekly_anchor,
    installments_total: row.installments_total,
    installments_start_month: row.installments_start_month,
  };
}

// ============================================================
// MAIN RESOLVER
// ============================================================

// Fetch all entries (materialized + virtual) for the given spaces in
// the given calendar month. Used by the monthly view page and the
// dashboard's current-month summaries.
//
// Virtual entries (id = null) are emitted for template occurrences
// that don't yet have a materialized row. Materialized rows are
// emitted as-is, except skipped ones which are dropped. Sorted by
// date, then by name, stable.
export async function getEntriesForMonth(
  supabase: SupabaseClient,
  spaceIds: string[],
  year: number,
  month: number
): Promise<ResolvedEntry[]> {
  if (spaceIds.length === 0) return [];

  const { start, end } = getMonthRange(year, month);

  // 1. Materialized entries in this month's date range.
  const materializedRes = await supabase
    .from("entries")
    .select(
      "id, space_id, template_id, date, name, amount, currency, category, notes, paid, skipped, installments_covered"
    )
    .in("space_id", spaceIds)
    .gte("date", start)
    .lte("date", end);

  const materialized = (materializedRes.data ?? []) as EntryRow[];

  // 2. Active templates for these spaces (virtual expansion source).
  //    Inactive templates are excluded from NEW virtual occurrences,
  //    but materialized rows that reference them (historical paid
  //    rows) still render via the join below.
  const activeTemplatesRes = await supabase
    .from("recurring_bill_templates")
    .select(
      "id, space_id, name, default_amount, currency, category, active, cadence, due_day, day_of_week, biweekly_anchor, installments_total, installments_start_month"
    )
    .in("space_id", spaceIds)
    .eq("active", true);

  const activeTemplates = (activeTemplatesRes.data ?? []).map((t) =>
    normalizeTemplate(t as TemplateRow)
  );

  // 3. Fetch every template referenced by a materialized row in this
  //    month (active OR inactive) so we can resolve its name/category
  //    for display and compute installment progress.
  const referencedTemplateIds = Array.from(
    new Set(
      materialized.map((e) => e.template_id).filter((id): id is string => !!id)
    )
  );

  const missingTemplateIds = referencedTemplateIds.filter(
    (id) => !activeTemplates.some((t) => t.id === id)
  );

  let templates = activeTemplates;
  if (missingTemplateIds.length > 0) {
    const inactiveRes = await supabase
      .from("recurring_bill_templates")
      .select(
        "id, space_id, name, default_amount, currency, category, active, cadence, due_day, day_of_week, biweekly_anchor, installments_total, installments_start_month"
      )
      .in("id", missingTemplateIds);
    templates = [
      ...activeTemplates,
      ...(inactiveRes.data ?? []).map((t) =>
        normalizeTemplate(t as TemplateRow)
      ),
    ];
  }

  const templateById = new Map<string, TemplateRecurrence>(
    templates.map((t) => [t.id, t])
  );

  // 4. Compute total paid coverage per installment template. Needed
  //    for the effective-end calculation AND for installment progress
  //    in the UI. We walk every paid entry for these templates across
  //    all time — a prepayment in an earlier month shifts the window.
  const installmentTemplateIds = templates
    .filter((t) => t.installments_total != null)
    .map((t) => t.id);

  const paidCoveredByTemplate = new Map<string, number>();
  const paidRowsByTemplate = new Map<string, number>();
  if (installmentTemplateIds.length > 0) {
    const paidRes = await supabase
      .from("entries")
      .select("template_id, installments_covered")
      .in("template_id", installmentTemplateIds)
      .eq("paid", true);

    for (const row of paidRes.data ?? []) {
      const tid = row.template_id as string;
      const covered = (row.installments_covered as number) ?? 1;
      paidCoveredByTemplate.set(
        tid,
        (paidCoveredByTemplate.get(tid) ?? 0) + covered
      );
      paidRowsByTemplate.set(
        tid,
        (paidRowsByTemplate.get(tid) ?? 0) + 1
      );
    }
  }

  // 5. Build exception map so virtual expansion skips already-
  //    materialized occurrences.
  const exceptionKeys = new Set<string>();
  for (const row of materialized) {
    if (row.template_id) exceptionKeys.add(`${row.template_id}|${row.date}`);
  }

  // 6. Emit virtual entries for every active-template occurrence not
  //    already materialized.
  const virtual: ResolvedEntry[] = [];
  for (const template of activeTemplates) {
    const occurrences = expandTemplateForMonth(
      template,
      year,
      month,
      paidCoveredByTemplate.get(template.id) ?? 0,
      paidRowsByTemplate.get(template.id) ?? 0
    );
    for (const date of occurrences) {
      if (exceptionKeys.has(`${template.id}|${date}`)) continue;
      virtual.push({
        id: null,
        space_id: template.space_id,
        template_id: template.id,
        date,
        name: template.name,
        amount: template.default_amount,
        currency: template.currency,
        category: template.category,
        notes: null,
        paid: false,
        installments_covered: 1,
        installmentProgress: computeInstallmentProgress(
          template,
          paidCoveredByTemplate.get(template.id) ?? 0
        ),
      });
    }
  }

  // 7. Emit materialized rows (filter out skipped).
  const fromMaterialized: ResolvedEntry[] = [];
  for (const row of materialized) {
    if (row.skipped) continue;
    const template = row.template_id
      ? templateById.get(row.template_id) ?? null
      : null;
    fromMaterialized.push({
      id: row.id,
      space_id: row.space_id,
      template_id: row.template_id,
      date: row.date,
      name: row.name,
      amount: Number(row.amount),
      currency: row.currency,
      category: row.category,
      notes: row.notes,
      paid: row.paid,
      installments_covered: row.installments_covered,
      installmentProgress: template
        ? computeInstallmentProgress(
            template,
            paidCoveredByTemplate.get(template.id) ?? 0
          )
        : null,
    });
  }

  // 8. Merge and sort by date, then name. Stable sort preserves any
  //    incoming order within a tied (date, name) key.
  return [...virtual, ...fromMaterialized].sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    return a.name.localeCompare(b.name);
  });
}
