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
