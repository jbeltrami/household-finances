# 05: Announcing the filtered list

Type: research
Status: resolved
Blocked by: none

## Question

Selecting a day changes the contents of a card that sits rows away from the
control that changed it — on a phone, off-screen entirely. A sighted user gets
the affordance decided in charting. A screen reader user gets nothing unless
something announces it.

What is the authoritative accessible pattern for a control that filters a list
elsewhere on the page?

Specifically:

- The day buttons already carry `aria-pressed` (`CalendarStrip.tsx:159`). Is
  that the correct role for a filter toggle, or does it mis-describe one?
- Does the Contas card need a live region, and if so `aria-live="polite"` on
  what element — the count, the whole list, or a visually-hidden status line?
- How should the empty state be announced so it is not silence?
- Is there a documented pattern for the "clear filter" control itself?

Answer from primary sources — WAI-ARIA Authoring Practices, MDN, WCAG technique
notes — not blog posts. Record the findings with citations; the design decision
follows in a later ticket once the facts are known.

## Answer

Findings in full, with citations:
[`../research/05-announcing-the-filtered-list.md`](../research/05-announcing-the-filtered-list.md).

**1. `aria-pressed` is correct per button, but under-describes the set.** ARIA 1.2
defines it for exactly the press/release cycle `MonthlyViewClient.tsx:30-32`
implements, and the APG's one hard rule — the label must not change with state —
holds, since the label is the day number. What it cannot express is that only one
day is selected at a time. Neither alternative fits: `aria-selected` is
spec-restricted to `gridcell`/`option`/`row`/`tab`, and `aria-current`'s `date`
token means *today*, colliding with the existing `isToday` treatment.

**2. The live region goes on a short summary line, not the list.** Understanding
SC 4.1.3 is explicit that "the list of results obtained from a search are not
considered a status update", while "'18 results returned' or 'No results
returned' would be". So `role="status"` belongs on a brief summary line with an
explicit `aria-atomic="true"` (ARIA22 warns the implicit value is unreliable) —
never on the `<ul>`, the `<Card>` or the `<h2>`. ARIA22's test procedure requires
the container to exist *before* the message, so it must render on every path in
`BillsSection.tsx`: outside the `isEmpty` ternary at lines 103-134, and never
conditional on `highlightedDay !== null`.

**3. The empty state is the same region with different text.** WCAG names "No
results returned" as a status message. The text must be *swapped, never emptied*
— including when the filter is cleared. The existing `isEmpty` paragraph at
`BillsSection.tsx:104-110` does not serve: it means "the whole month is empty",
and as a freshly mounted element it would be silent anyway.

**4. There is no documented "clear filter" pattern.** Both APG indexes were
enumerated — 30 patterns, 7 practices, no Filter, Faceted Search, Chip, Tag or
Clear. Two constraints do apply: it is a plain command button and must not carry
`aria-pressed`; and if it unmounts on use, focus lands on `<body>`, which the
APG's keyboard practice names as a loss of focus. That is a live trap for the
affordance settled in map note 7.

**Where the sources are silent** (recorded, not smoothed over): no APG filter
pattern; no guidance on a mutually-exclusive set of `aria-pressed` buttons; no
ruling between visible and visually-hidden status text, both permitted; no
support claim for `aria-controls`; and nothing treats "control and effect far
apart or off-screen" as a distinct case.

**Scope note for the design ticket.** 4.1.3 "is not to force authors to generate
new status messages" — the obligation attaches only because map note 7 already
commits the card to visible filter text.

**Repo note.** Tailwind v4 is in use, so `sr-only` is available. There is
currently no `sr-only`, `aria-live` or `role="status"` anywhere in `src/`.
