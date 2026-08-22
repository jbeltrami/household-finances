// Route-local types. The domain row types live in @/helpers/taxonomy;
// this file holds shapes that are only meaningful to this screen.

import type { CategoryKind } from "@/helpers/taxonomy";

// The screen has three tabs but only two of them are Categorias. Modelling
// the tab as its own union rather than reusing CategoryKind keeps the
// Pagador tab from having to pretend it has a direction.
export type Tab = CategoryKind | "payers";

export const TABS: { tab: Tab; label: string }[] = [
  { tab: "outflow", label: "Saídas" },
  { tab: "income", label: "Receitas" },
  { tab: "payers", label: "Pagadores" },
];

export function parseTab(raw: string | undefined): Tab {
  if (raw === "income" || raw === "payers") return raw;
  return "outflow";
}
