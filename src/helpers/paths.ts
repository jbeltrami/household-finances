// URL builders for space-scoped routes. Centralizing every
// `/spaces/${spaceId}/...` template literal in one place means
// future URL-shape changes happen in exactly one file, and the
// type checker enforces that no call site forgets the spaceId.
//
// Convention: every builder starts with `space` to make it
// obvious they produce space-prefixed paths. Plain (non-space)
// paths like `/login`, `/auth/callback`, and `/` stay inline at
// the call site — they're short and context-free.

export function spaceMonthUrl(
  spaceId: string,
  year: number,
  month: number
): string {
  return `/spaces/${spaceId}/months/${year}/${String(month).padStart(2, "0")}`;
}

export function spaceBillsUrl(spaceId: string): string {
  return `/spaces/${spaceId}/bills`;
}

export function spaceBillEditUrl(spaceId: string, billId: string): string {
  return `/spaces/${spaceId}/bills/${billId}/edit`;
}

export function spaceSavingsUrl(spaceId: string): string {
  return `/spaces/${spaceId}/savings`;
}

export function spaceFundUrl(spaceId: string, fundId: string): string {
  return `/spaces/${spaceId}/savings/${fundId}`;
}

export function spaceSettingsUrl(spaceId: string): string {
  return `/spaces/${spaceId}/settings`;
}
