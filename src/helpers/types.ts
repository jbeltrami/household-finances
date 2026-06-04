// Shared types for the helpers module. Kept out of the individual
// helper files so the helpers stay focused on behavior and the
// type vocabulary lives in one grep-able place.

// --- Ledger -------------------------------------------------

// Normalized shape of a recurring_bill_templates row as the ledger
// helpers want to consume it (numeric fields coerced to number,
// cadence narrowed to the three valid literals).
export type TemplateRecurrence = {
  id: string;
  space_id: string;
  name: string;
  default_amount: number;
  currency: string;
  category: string | null;
  icon: string | null;
  cadence: "monthly" | "weekly" | "biweekly";
  due_day: number | null;
  day_of_week: number | null;
  biweekly_anchor: string | null;
  installments_total: number | null;
  installments_start_month: string | null;
};

// Progress badge data for installment templates. `paid` is the sum
// of installments_covered across paid entries; `remaining` is the
// simple difference `total - paid`.
export type InstallmentProgress = {
  paid: number;
  total: number;
  remaining: number;
  defaultAmount: number;
};

// Unified shape the UI consumes. When `id` is null, this is a virtual
// template occurrence with no materialized row yet; any mutation on
// it must insert a row first. When `id` is set, it's a real row in
// the `entries` table.
export type ResolvedEntry = {
  id: string | null;
  space_id: string;
  template_id: string | null;
  date: string;              // "YYYY-MM-DD"
  name: string;
  amount: number;
  currency: string;
  category: string | null;
  notes: string | null;
  paid: boolean;
  installments_covered: number;
  installmentProgress: InstallmentProgress | null;
  icon: string | null;       // template's icon key (null for one-off entries)
};

// --- Ledger DB shapes ---------------------------------------
// Raw Supabase row shapes, before coercion. Kept separate from
// `TemplateRecurrence` because numeric columns come back as
// `number | string` depending on client settings and we want the
// boundary to be explicit.

export type EntryRow = {
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
  icon: string | null;       // one-off icon; bill exceptions usually leave null and inherit from template
};

export type TemplateRow = {
  id: string;
  space_id: string;
  name: string;
  default_amount: number | string;
  currency: string;
  category: string | null;
  icon: string | null;
  active: boolean;
  cadence: string;
  due_day: number | null;
  day_of_week: number | null;
  biweekly_anchor: string | null;
  installments_total: number | null;
  installments_start_month: string | null;
};

// --- Lock ---------------------------------------------------

// Discriminated result of an edit-check on an existing row. On
// success we hand back the row's space + year/month so callers can
// build revalidatePath URLs without a second lookup.
export type EditCheckResult =
  | { ok: false; error: string }
  | { ok: true; spaceId: string; year: number; month: number };

// --- Insights -----------------------------------------------

// The five editable parameters behind the /insights benchmarks.
// Mirrors the ideal_budget_settings table columns. Rates are
// fractions of monthly income; emergency_months and
// freedom_annual_mult are multipliers applied to spending.
export type IdealSettings = {
  savings_rate: number;        // recommended savings  = income * rate
  max_mortgage_rate: number;   // max housing payment  = income * rate
  max_fixed_rate: number;      // max fixed expenses   = income * rate
  emergency_months: number;    // emergency fund       = monthly spend * months
  freedom_annual_mult: number; // financial freedom    = annual spend * mult
};

// Averaged monthly figures over the selected window. `monthsUsed` is
// how many complete months actually contributed — it adjusts down
// when a user has less history than the requested window.
export type BucketAverages = {
  monthsUsed: number;
  avgIncome: number;
  avgBills: number;     // recurring obligations (template_id IS NOT NULL)
  avgExpenses: number;  // one-off spending      (template_id IS NULL)
};

// A single benchmark card. `actual` and `meets` are present only for
// the two cards we can compare against real averages (recommended
// savings, max fixed expenses); the rest are reference/target figures.
export type Insight = {
  key:
    | "recommendedSavings"
    | "maxFixedExpenses"
    | "maxMortgage"
    | "emergencyFund"
    | "financialFreedom";
  target: number;
  actual: number | null;
  // For "floor" cards (savings) meets = actual >= target; for "cap"
  // cards (fixed expenses) meets = actual <= target. null when there's
  // no actual to compare.
  meets: boolean | null;
};
