# 06: How the filtered card announces itself

Type: grilling
Status: resolved
Blocked by: none

## Question

Graduated from the fog by [Announcing the filtered
list](05-announcing-the-filtered-list.md), which established the facts. The
facts leave four choices open, and none of them are settled by WCAG or the APG —
the sources are genuinely silent on this shape of UI.

1. **Visible or visually-hidden status text?** SC 4.1.3 permits either. Map note
   7 already commits the card to a *visible* "filter is active" affordance, so
   the real question is whether the `role="status"` region reuses that visible
   text or adds a separate `sr-only` line. This decides whether the copy ticket
   writes one string or two.
2. **What the status line actually reports.** WCAG's own examples are counts
   ("18 results returned"). Does this card announce a count, the day's total, or
   both? A count alone omits the number the whole feature exists to show.
3. **Focus when the filter is cleared.** If the clear affordance unmounts on
   use, focus drops to `<body>` — the APG names this a loss of focus. Where does
   focus go instead: back to the selected day in the CalendarStrip (which is
   rows away and may be off-screen), or somewhere in the card?
4. **Whether single-selection is worth expressing.** `aria-pressed` is correct
   per button but cannot say "only one day at a time", and both alternatives are
   ruled out — `aria-selected` by spec restriction, `aria-current="date"` by its
   collision with the existing `isToday` treatment. Accept the gap, or restructure
   the day grid into a real `role="grid"` as the APG's Date Picker Dialog does?

Option 4 is the one to watch: restructuring the grid is a CalendarStrip change,
and the destination stops at the Contas card. If it wins on merit it does not
belong in this map — rule it out of scope and let it be its own effort.

Constraints that are already fixed and not open here: the region carries
`role="status"` with explicit `aria-atomic="true"`, renders on every path in
`BillsSection.tsx` rather than conditionally, and swaps its text rather than
emptying it.

## Narrowed by the redraw — 2026-09-10

The filtered Contas card was replaced by a front-end-only widget beneath Saldo
(see the map's Superseded block). This question survives the change but is
smaller than charted: the subject is now `DayTotalCard`, which renders a
heading, a count line and one figure, and shows or hides itself entirely.

## Answer

All four, decided by building them.

**1. Visually-hidden.** The card is itself the visible signal that a day is
selected, so a visible status line would restate what is already on screen. The
region is `sr-only`, mounted on every path in `DayTotalCard` — including when no
day is selected, since a live region announces changes to a container that was
already in the DOM, and one that arrives together with its first message
announces nothing.

**2. A sentence, carrying the figures.** `10 de setembro: 2 contas vencem,
R$ 2.260,00 no total. Pago R$ 340,00, falta pagar R$ 1.920,00.` A count alone
would omit the number the widget exists for, and "Pago" beside a figure only
reads as a pair if you can see the layout. Cleared state says "Nenhum dia
selecionado." rather than going empty.

**3. The focus trap is gone, not solved.** It depended on a clear button that
unmounts on use. The redraw put clearing back on the calendar day button, which
stays mounted and keeps focus, so nothing is ever removed from under the user.
If a clear affordance is ever added to the card, this reopens.

**4. Gap accepted.** `aria-pressed` stays. Restructuring the day grid into a
`role="grid"` remains out of scope, and single-selection remains unexpressed.
