// Category aggregation: how much was actually spent, grouped by Categoria.
//
// Kept in its own file (rather than added to `reports.ts`) so callers can
// import without dragging the @react-pdf/renderer chain in via the
// monthly-report machinery. @react-pdf/renderer is
// server-only" for why that footgun matters.
//
// Split into a thin fetch and a pure fold. Everything worth protecting is in
// the fold: it takes plain arrays and returns plain data, so its behaviour is
// testable without a database. The fetch on the other side is an uninteresting
// wrapper and is deliberately untested.
//
// What counts as "spend":
//   - One-off entries (template_id IS NULL):  always counted — they are
//     already-recorded events.
//   - Bill exceptions (template_id IS NOT NULL):  counted only when
//     paid = true. An unpaid override is still an obligation, not money that
//     left the account.
//   - Skipped rows are always excluded.
// Virtual (un-materialized) bill occurrences aren't in `entries` at all, so by
// construction they're absent — exactly what a "what I actually spent" report
// wants.
//
//   - Financiamento: paid installments count as Contas, amortizações
//     extraordinárias as Despesas, both under the Financiamento's own
//     Categoria. They live in a parallel ledger computed from loan
//     parameters rather than written to `entries`, so they are flattened
//     into the same SpendEntry shape by getFinancingSpendForRange before
//     reaching the fold — which therefore needs no knowledge of financing
//     at all. Without this the report would omit the largest single outflow
//     in most households while presenting a confident total.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResolvedCategory } from "./types";
import { resolveCategoryId } from "./ledger";
import { getCategories } from "./taxonomy";
import { getFinancingSpendForRange } from "./financing";

// One contributing row, kept so the report can show what makes a total up
// rather than only asserting it. `kind` is the Conta/Despesa distinction the
// glossary treats as fundamental — obligation vs discretionary — which the
// merged headline figure deliberately hides.
export type CategorySpendLine = {
  id: string;
  name: string;
  date: string; // "YYYY-MM-DD"
  amount: number;
  kind: "bill" | "expense";
};

export type CategorySpend = {
  // null is the "Sem categoria" bucket — money with no Categoria, kept as a
  // real row so the totals still reconcile rather than quietly shrinking.
  category: ResolvedCategory | null;
  total: number;
  count: number;
  billsTotal: number;   // paid bill exceptions
  billsCount: number;
  expensesTotal: number; // one-off entries
  expensesCount: number;
  // Every row that contributed, largest first. `lines.length` always equals
  // `count` — if they ever diverge, the totals are lying about their own
  // composition.
  lines: CategorySpendLine[];
};

// The slice of an entry the fold needs. Structural, not the full row type, so
// tests can construct one without inventing a dozen irrelevant fields.
export type SpendEntry = {
  id: string;
  name: string;
  date: string;
  // Which side of the obligation/discretionary split this row sits on.
  // Explicit rather than inferred from `template_id`, because the two
  // questions came apart once Financiamento spend joined: an installment is
  // an obligation with no template behind it to inherit from. Keeping them
  // as one column meant a financing row had to pretend to be template-bound
  // to be counted as a Conta.
  kind: "bill" | "expense";
  // Only for inheritance. NULL on a template-bound row means "take the
  // template's Categoria" (ADR 0001); NULL on anything else just means the
  // row has no template to inherit from.
  template_id: string | null;
  category_id: string | null;
  amount: number | string;
  // Contas count only once settled. Always true for rows that are already
  // events by nature — Despesas and recorded financing payments.
  paid: boolean;
  skipped: boolean;
};

export type SpendTemplate = {
  id: string;
  category_id: string | null;
};

const NULL_KEY = "__NULL__";

// Per-Categoria totals, sorted by total descending with the uncategorised
// bucket pinned last — it is a residue, not a category competing for
// attention, and letting it float to the top of a mostly-untagged month
// buries the real answer.
//
// Pure: no Supabase, no clock, no ambient state. Everything it needs arrives
// as arguments.
export function foldCategorySpend(
  entries: SpendEntry[],
  templates: SpendTemplate[],
  categories: ResolvedCategory[]
): CategorySpend[] {
  const templateCategoryById = new Map(
    templates.map((t) => [t.id, t.category_id])
  );
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const accum = new Map<string, CategorySpend>();

  for (const row of entries) {
    if (row.skipped) continue;

    const isBill = row.kind === "bill";
    // Contas count only when paid; Despesas always count.
    if (isBill && !row.paid) continue;

    const amount = Number(row.amount);
    if (!Number.isFinite(amount)) continue;

    // A template-bound row with no Categoria of its own inherits its
    // template's. See ADR 0001 — this is the join the decision pays for, and
    // reintroducing a copy onto the row to avoid it re-fragments history.
    const categoryId = resolveCategoryId(
      row.category_id,
      row.template_id != null
        ? templateCategoryById.get(row.template_id)
        : undefined
    );

    // A Categoria that has since been deactivated is still resolved: it must
    // keep labelling the history filed under it, or retiring one would
    // silently move months of spend into "Sem categoria".
    const category = categoryId ? categoryById.get(categoryId) ?? null : null;
    const key = category ? category.id : NULL_KEY;

    const existing = accum.get(key) ?? {
      category,
      total: 0,
      count: 0,
      billsTotal: 0,
      billsCount: 0,
      expensesTotal: 0,
      expensesCount: 0,
      lines: [] as CategorySpendLine[],
    };

    existing.total += amount;
    existing.count += 1;
    existing.lines.push({
      id: row.id,
      name: row.name,
      date: row.date,
      amount,
      kind: row.kind,
    });
    if (isBill) {
      existing.billsTotal += amount;
      existing.billsCount += 1;
    } else {
      existing.expensesTotal += amount;
      existing.expensesCount += 1;
    }
    accum.set(key, existing);
  }

  // Largest contributor first within each Categoria: expanding a row asks
  // "what is driving this number", and the answer is at the top rather than
  // somewhere down a chronological list.
  for (const bucket of accum.values()) {
    bucket.lines.sort((a, b) => b.amount - a.amount);
  }

  return Array.from(accum.values()).sort((a, b) => {
    if (a.category == null) return 1;
    if (b.category == null) return -1;
    return b.total - a.total;
  });
}

// Fetch half: pulls the three inputs and hands them to the fold.
// `start` and `end` are inclusive "YYYY-MM-DD" strings.
export async function getCategorySpendForRange(
  supabase: SupabaseClient,
  spaceId: string,
  start: string,
  end: string
): Promise<CategorySpend[]> {
  const [{ data, error }, financingRows] = await Promise.all([
    supabase
      .from("entries")
      .select("id, name, date, template_id, category_id, amount, paid, skipped")
      .eq("space_id", spaceId)
      .gte("date", start)
      .lte("date", end),
    getFinancingSpendForRange(supabase, spaceId, start, end),
  ]);

  if (error) {
    throw new Error(`Falha ao agregar categorias: ${error.message}`);
  }

  // `kind` is derived here, at the boundary, rather than inside the fold:
  // for an `entries` row it is exactly "does it have a template", but that
  // equivalence does not hold for financing, which is why the fold takes it
  // as a field instead of working it out.
  const entries: SpendEntry[] = (data ?? []).map((row) => ({
    ...(row as Omit<SpendEntry, "kind">),
    kind: row.template_id != null ? ("bill" as const) : ("expense" as const),
  }));

  // Only the templates actually referenced in the range, so a space with
  // years of retired Contas doesn't pay for all of them on every report.
  const templateIds = Array.from(
    new Set(entries.map((e) => e.template_id).filter((id): id is string => !!id))
  );

  const [templatesRes, categories] = await Promise.all([
    templateIds.length > 0
      ? supabase
          .from("recurring_bill_templates")
          .select("id, category_id")
          .in("id", templateIds)
      : Promise.resolve({ data: [] as SpendTemplate[] }),
    // includeInactive: retired Categorias must still label their history.
    getCategories(supabase, spaceId, "outflow", { includeInactive: true }),
  ]);

  return foldCategorySpend(
    [...entries, ...financingRows],
    (templatesRes.data ?? []) as SpendTemplate[],
    categories
  );
}

// Convenience wrapper for the annual case. Calendar year, not fiscal year.
export async function getCategorySpendForYear(
  supabase: SupabaseClient,
  spaceId: string,
  year: number
): Promise<CategorySpend[]> {
  return getCategorySpendForRange(supabase, spaceId, `${year}-01-01`, `${year}-12-31`);
}
