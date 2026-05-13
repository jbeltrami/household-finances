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
