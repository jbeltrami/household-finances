// Curated colour palette for Categorias and Pagadores.
//
// The DB stores a short token key (e.g. "sky"); this registry resolves it
// to Tailwind classes at render time. Same convention as the icon registry
// in src/lib/icons/bills.ts — the set of valid keys lives in application
// code and grows without a schema migration, which is why `categories.color`
// carries no CHECK constraint.
//
// A fixed palette rather than a free hex picker: contrast and dark-mode
// behaviour stay under our control instead of the user's, and a Categoria
// keeps the same colour across every render of a report.

type PaletteEntry = {
  label: string;  // Portuguese label shown in the picker
  swatch: string; // solid fill, for the picker's colour dots
  chip: string;   // tinted background + readable text, for the icon chip
};

// Class strings are written out in full (never interpolated) so Tailwind's
// scanner can see them.
export const CATEGORY_COLORS: Record<string, PaletteEntry> = {
  slate: {
    label: "Cinza",
    swatch: "bg-slate-500",
    chip: "bg-slate-500/12 text-slate-600 dark:text-slate-300",
  },
  sky: {
    label: "Azul",
    swatch: "bg-sky-500",
    chip: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
  },
  violet: {
    label: "Violeta",
    swatch: "bg-violet-500",
    chip: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
  },
  amber: {
    label: "Âmbar",
    swatch: "bg-amber-500",
    chip: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  },
  rose: {
    label: "Rosa",
    swatch: "bg-rose-500",
    chip: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
  },
  emerald: {
    label: "Verde",
    swatch: "bg-emerald-500",
    chip: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  },
  teal: {
    label: "Turquesa",
    swatch: "bg-teal-500",
    chip: "bg-teal-500/12 text-teal-600 dark:text-teal-400",
  },
  indigo: {
    label: "Índigo",
    swatch: "bg-indigo-500",
    chip: "bg-indigo-500/12 text-indigo-600 dark:text-indigo-400",
  },
  orange: {
    label: "Laranja",
    swatch: "bg-orange-500",
    chip: "bg-orange-500/12 text-orange-600 dark:text-orange-400",
  },
};

export type CategoryColorKey = keyof typeof CATEGORY_COLORS;

// Matches the column default in migration 0012.
export const DEFAULT_CATEGORY_COLOR = "slate";

export function isCategoryColor(s: unknown): s is CategoryColorKey {
  return typeof s === "string" && s in CATEGORY_COLORS;
}

// Resolves a stored token to its palette entry, falling back to the default
// so an unknown key (a token retired from the registry, say) renders as
// something neutral rather than crashing the page.
export function colorFor(key: string | null | undefined): PaletteEntry {
  if (key && key in CATEGORY_COLORS) return CATEGORY_COLORS[key];
  return CATEGORY_COLORS[DEFAULT_CATEGORY_COLOR];
}

export function getColorOptions(): { key: CategoryColorKey; label: string; swatch: string }[] {
  return Object.entries(CATEGORY_COLORS).map(([key, entry]) => ({
    key,
    label: entry.label,
    swatch: entry.swatch,
  }));
}
