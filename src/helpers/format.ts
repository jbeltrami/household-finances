export const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// Format dates in UTC so the stored `YYYY-MM-DD` calendar date is shown
// verbatim. Without `timeZone: "UTC"`, `new Date("2026-04-01")` parses
// as UTC midnight and, when formatted in a negative-offset timezone like
// Brazil (UTC-3), renders as the previous day (31/03).
export const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

// What to show as a Receita's headline.
//
// The name is optional now that Pagador and Categoria carry the structure it
// used to smuggle ("Freelance XYZ" was a Categoria and a Pagador crammed into
// one text field). When it is blank, compose the two structured fields —
// strictly more informative than the string most users would have typed. The
// final fallback exists because all three can legitimately be empty: an
// amount on a date is still a valid Receita.
//
// Lives here rather than in a route folder because both the monthly view and
// the emailed PDF report render Receitas, and a blank row in the PDF is the
// worse failure — nobody is around to notice it.
export function incomeDisplayLabel(entry: {
  name: string | null;
  payer: { name: string } | null;
  category: { name: string } | null;
}): string {
  if (entry.name) return entry.name;
  const parts = [entry.payer?.name, entry.category?.name].filter(Boolean);
  if (parts.length > 0) return parts.join(" · ");
  return "Receita sem descrição";
}
