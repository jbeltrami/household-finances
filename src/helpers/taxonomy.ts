// Reads for the user-managed Categoria and Pagador lists (migration 0012).
//
// Every Categoria read in the app goes through here. `kind` is a required
// positional argument rather than an optional filter on an options bag,
// which is the whole point: Postgres cannot enforce that an outflow row
// references an outflow Categoria (a CHECK cannot reach across tables), so
// the invariant has to live somewhere in code. Making it impossible to call
// `getCategories` without saying which direction you mean is the cheapest
// place to put it — a forgotten filter becomes a type error rather than an
// income Categoria quietly appearing in a Conta picker.

import type { SupabaseClient } from "@supabase/supabase-js";

export type CategoryKind = "income" | "outflow";

export type PayerRow = {
  id: string;
  name: string;
  color: string;
  active: boolean;
};

export type CategoryRow = {
  id: string;
  kind: CategoryKind;
  name: string;
  icon: string | null;
  color: string;
  active: boolean;
};

const CATEGORY_COLUMNS = "id, kind, name, icon, color, active";

// Portuguese Categoria names are accented ("Saúde", "Família"), and
// Postgres's default collation does not order them the way a reader
// expects. Sorting in JS with a pt-BR collator does.
const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });

function byName(a: CategoryRow, b: CategoryRow): number {
  return collator.compare(a.name, b.name);
}

export async function getCategories(
  supabase: SupabaseClient,
  spaceId: string,
  kind: CategoryKind,
  options?: { includeInactive?: boolean }
): Promise<CategoryRow[]> {
  let query = supabase
    .from("categories")
    .select(CATEGORY_COLUMNS)
    .eq("space_id", spaceId)
    .eq("kind", kind);

  if (!options?.includeInactive) query = query.eq("active", true);

  const { data, error } = await query;
  if (error) throw new Error(`Falha ao carregar categorias: ${error.message}`);

  return ((data ?? []) as CategoryRow[]).slice().sort(byName);
}

export async function getCategoryById(
  supabase: SupabaseClient,
  categoryId: string
): Promise<CategoryRow | null> {
  const { data } = await supabase
    .from("categories")
    .select(CATEGORY_COLUMNS)
    .eq("id", categoryId)
    .maybeSingle();
  return (data as CategoryRow) ?? null;
}

// Every table that can point at a Categoria, so "can I delete this?" is
// answered from one list rather than four scattered checks. Add to this
// array when a new table gains a `category_id`.
const REFERENCING_TABLES = [
  "entries",
  "recurring_bill_templates",
  "income_entries",
  "financings",
] as const;

// How many rows across the whole schema reference this Categoria.
// Deleting a referenced Categoria would silently drop that history into
// "Sem categoria" (the FK is ON DELETE SET NULL), so the delete action
// refuses and reports this number instead.
export async function countCategoryReferences(
  supabase: SupabaseClient,
  categoryId: string
): Promise<number> {
  const counts = await Promise.all(
    REFERENCING_TABLES.map(async (table) => {
      const { count, error } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("category_id", categoryId);
      if (error) {
        throw new Error(`Falha ao verificar uso da categoria: ${error.message}`);
      }
      return count ?? 0;
    })
  );

  return counts.reduce((sum, n) => sum + n, 0);
}

// --- Pagadores ------------------------------------------------
// Income-only by decision: on the outflow side the counterparty is already
// carried by the Conta's own name, so there is no direction to disambiguate
// and `getPayers` needs no equivalent of `kind`.

const PAYER_COLUMNS = "id, name, color, active";

export async function getPayers(
  supabase: SupabaseClient,
  spaceId: string,
  options?: { includeInactive?: boolean }
): Promise<PayerRow[]> {
  let query = supabase
    .from("payers")
    .select(PAYER_COLUMNS)
    .eq("space_id", spaceId);

  if (!options?.includeInactive) query = query.eq("active", true);

  const { data, error } = await query;
  if (error) throw new Error(`Falha ao carregar pagadores: ${error.message}`);

  return ((data ?? []) as PayerRow[])
    .slice()
    .sort((a, b) => collator.compare(a.name, b.name));
}

// Only income_entries can reference a Pagador, so this is a single count
// rather than the fan-out `countCategoryReferences` needs. It stays a
// separate function anyway: if Pagador ever grows onto the outflow side,
// the extra tables get added here and every caller inherits the fix.
export async function countPayerReferences(
  supabase: SupabaseClient,
  payerId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("income_entries")
    .select("id", { count: "exact", head: true })
    .eq("payer_id", payerId);

  if (error) {
    throw new Error(`Falha ao verificar uso do pagador: ${error.message}`);
  }
  return count ?? 0;
}

// Up to two letters, from the first and last word of the name — "Banco do
// Brasil" reads as BB, "Occam" as OC. Pagadores render as initials on a
// coloured chip because no icon set contains company logos, and picking
// from a generic set would leave every employer wearing the same glyph.
export function payerInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// --- The whole taxonomy in one read --------------------------
// A page almost never wants just one of these lists. It wants the active
// Categorias to offer in a picker AND a way to resolve one that has since
// been deactivated, so a row filed under a retired Categoria keeps showing
// it instead of reading as uncategorised — and then the same pair for
// Pagadores. Asking for each separately meant five reads of two tables on
// the monthly view, and three hand-built lookup maps on top.
//
// `kind` stays required at the picker level: Postgres cannot enforce that an
// outflow row points at an outflow Categoria, so `getCategories` refusing to
// be called without a direction is where that invariant lives. Handing back
// the two directions as separately named fields keeps it — there is no way
// to ask this for "categories" in general and get a mixed list.

export type CategoryLookup = {
  // Active only, sorted: what a picker may offer.
  active: CategoryRow[];
  // Every Categoria of this kind by id, deactivated ones included: what a
  // row already filed under one is labelled with.
  byId: Map<string, CategoryRow>;
};

export type PayerLookup = {
  active: PayerRow[];
  byId: Map<string, PayerRow>;
};

export type Taxonomy = {
  outflow: CategoryLookup;
  income: CategoryLookup;
  payers: PayerLookup;
};

function splitCategories(all: CategoryRow[], kind: CategoryKind): CategoryLookup {
  const ofKind = all.filter((c) => c.kind === kind);
  return {
    active: ofKind.filter((c) => c.active).sort(byName),
    byId: new Map(ofKind.map((c) => [c.id, c])),
  };
}

export async function getTaxonomy(
  supabase: SupabaseClient,
  spaceId: string
): Promise<Taxonomy> {
  const [categoriesRes, payersRes] = await Promise.all([
    supabase
      .from("categories")
      .select(CATEGORY_COLUMNS)
      .eq("space_id", spaceId),
    supabase.from("payers").select(PAYER_COLUMNS).eq("space_id", spaceId),
  ]);

  if (categoriesRes.error) {
    throw new Error(
      `Falha ao carregar categorias: ${categoriesRes.error.message}`
    );
  }
  if (payersRes.error) {
    throw new Error(`Falha ao carregar pagadores: ${payersRes.error.message}`);
  }

  const categories = (categoriesRes.data ?? []) as CategoryRow[];
  const payers = (payersRes.data ?? []) as PayerRow[];

  return {
    outflow: splitCategories(categories, "outflow"),
    income: splitCategories(categories, "income"),
    payers: {
      active: payers
        .filter((p) => p.active)
        .slice()
        .sort((a, b) => collator.compare(a.name, b.name)),
      byId: new Map(payers.map((p) => [p.id, p])),
    },
  };
}
