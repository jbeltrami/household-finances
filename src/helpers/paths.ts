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

export function settingsCategoriesUrl(): string {
  return "/settings/categories";
}

export function reportsUrl(): string {
  return "/reports";
}

export function insightsUrl(): string {
  return "/insights";
}

export function financingUrl(): string {
  return "/financing";
}

export function financingNewUrl(): string {
  return "/financing/new";
}

export function financingDetailUrl(id: string): string {
  return `/financing/${id}`;
}

// The absolute origin to build links against, from an inbound request's
// headers. Emails carry absolute URLs, so every sender needs this and each
// one was deriving it again — with the copies already disagreeing about the
// fallback protocol.
//
// Returns null rather than throwing on a missing host: a cron answers that
// with a 400 and a server action with an inline error, and the difference
// belongs to them.
export function baseUrlFrom(
  host: string | null,
  forwardedProto: string | null
): string | null {
  if (!host) return null;
  const proto =
    forwardedProto ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
