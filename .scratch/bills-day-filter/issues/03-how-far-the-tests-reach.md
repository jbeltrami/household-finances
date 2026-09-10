# 03: How far the tests reach

Type: grilling
Status: open
Blocked by: 01

## Question

The pure-helper decision makes the *arithmetic* testable: `month-summary.ts` has
a vitest suite with fixtures for Contas, parcelas, paid and Vencida
(`__tests__/month-summary.test.ts`, `__tests__/month-day-markers.test.ts`).
Whatever 01 produces lands beside them and gets covered.

The *behaviour* is a different matter. Hiding non-matching rows, the empty state
for a day with nothing due, and the clear affordance are all card behaviour, and
this repo has **no component test setup at all** — vitest only, no
testing-library, no jsdom environment, no e2e directory, and no existing test
touches `BillsSection` or `highlightedDay`.

Decide: does this effort add component testing, or does it accept that the card
stays untested behind a well-tested helper seam?

Adding it is a repo-wide investment that outlives this feature and wants its own
justification. Declining it is defensible — but the empty state is exactly the
kind of conditional render that regresses silently, and it is the first thing a
reader of this map will ask about. Say which, and say why, so the next session
does not reopen it.

## Narrowed by the redraw — 2026-09-10

The filtered Contas card was replaced by a front-end-only widget beneath Saldo
(see the map's Superseded block). This question survives the change but is
smaller than charted: the subject is now `DayTotalCard`, which renders a
heading, a count line and one figure, and shows or hides itself entirely.
