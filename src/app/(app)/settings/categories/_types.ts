// Route-local types. The domain row type itself lives in
// @/helpers/taxonomy, so components import it from there rather than
// redeclaring it here — this file exists for shapes that are only
// meaningful to this screen.

import type { CategoryKind } from "@/helpers/taxonomy";

export const TABS: { kind: CategoryKind; label: string }[] = [
  { kind: "outflow", label: "Saídas" },
  { kind: "income", label: "Receitas" },
];

export function parseTab(raw: string | undefined): CategoryKind {
  return raw === "income" ? "income" : "outflow";
}
