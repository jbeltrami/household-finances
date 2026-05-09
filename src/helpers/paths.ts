// URL builders for the app's routes. With one space per user the
// `[id]` segment was redundant (always derivable from auth), so the
// builders no longer take `spaceId`. Centralizing every template
// literal here means future URL-shape changes happen in exactly
// one file, and the type checker enforces that no call site
// fabricates URLs by hand.

export function monthUrl(year: number, month: number): string {
  return `/months/${year}/${String(month).padStart(2, "0")}`;
}

export function billsUrl(): string {
  return "/bills";
}

export function billEditUrl(billId: string): string {
  return `/bills/${billId}/edit`;
}

export function settingsUrl(): string {
  return "/settings";
}

export function reportsUrl(): string {
  return "/reports";
}
