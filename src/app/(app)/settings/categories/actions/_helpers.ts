// Shared parsing for the Categoria server actions. Not a "use server"
// file — exports synchronous utilities and constants.

import { isIconKey } from "@/lib/icons/bills";
import { isCategoryColor, DEFAULT_CATEGORY_COLOR } from "@/lib/colors/palette";
import type { CategoryKind } from "@/helpers/taxonomy";

// Postgres unique_violation, raised by the partial unique index on
// (space_id, kind, lower(trim(name))) WHERE active.
export const UNIQUE_VIOLATION = "23505";

export type CategoryFields = {
  name: string;
  icon: string | null;
  color: string;
};

export function parseKind(raw: unknown): CategoryKind {
  if (raw === "income" || raw === "outflow") return raw;
  throw new Error("Direção inválida");
}

export function parseCategoryFields(formData: FormData): CategoryFields {
  const name = formData.get("name")?.toString().trim();
  if (!name) throw new Error("O nome é obrigatório");
  if (name.length < 2) {
    throw new Error("O nome precisa ter pelo menos 2 caracteres");
  }

  // Both registries are optional-but-validated: an unregistered key would
  // render as the fallback icon, so storing it just hides the mistake.
  const iconRaw = formData.get("icon")?.toString().trim();
  let icon: string | null = null;
  if (iconRaw) {
    if (!isIconKey(iconRaw)) throw new Error("Ícone inválido");
    icon = iconRaw;
  }

  const colorRaw = formData.get("color")?.toString().trim();
  const color =
    colorRaw && isCategoryColor(colorRaw) ? colorRaw : DEFAULT_CATEGORY_COLOR;

  return { name, icon, color };
}

// The two directions read differently in Portuguese, and the duplicate-name
// message is the one place a user meets the distinction head-on.
export function kindLabel(kind: CategoryKind): string {
  return kind === "income" ? "de receita" : "de saída";
}

// --- Pagadores ------------------------------------------------

export type PayerFields = {
  name: string;
  color: string;
};

export function parsePayerFields(formData: FormData): PayerFields {
  const name = formData.get("name")?.toString().trim();
  if (!name) throw new Error("O nome é obrigatório");
  if (name.length < 2) {
    throw new Error("O nome precisa ter pelo menos 2 caracteres");
  }

  const colorRaw = formData.get("color")?.toString().trim();
  const color =
    colorRaw && isCategoryColor(colorRaw) ? colorRaw : DEFAULT_CATEGORY_COLOR;

  return { name, color };
}
