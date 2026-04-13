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
