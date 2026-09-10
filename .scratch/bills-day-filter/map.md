# Map: A day's Obrigações in the Contas card

Label: `wayfinder:map`
Charted: 2026-09-10

## Superseded — 2026-09-10

The destination below was **redrawn by the user mid-effort** and the simpler
thing was built directly, so this map never ran to completion. What shipped is
not a filter on the Contas card: it is a front-end-only widget beneath Saldo
showing what the selected day owes, appearing and disappearing with the
selection and recorded nowhere.

That answered three of the tickets by fiat — the fold is client-side, the
selected day stays component state, and the copy was written in place. The map
is kept because two questions outlived the change: what the widget announces to
assistive technology, and whether the card behaviour gets tested. Read the
Destination below as history, not as the current plan.

**Shipped:** `summarizeDayObligations` in `src/helpers/month-summary.ts` (+ 10
tests), `formatDayLabel` in `src/helpers/date.ts`, and
`_components/DayTotalCard/DayTotalCard.tsx` mounted under `SaldoCard`.

## Redrawn again — 2026-09-10: the Período

The day became a **Período**: a stretch of consecutive days inside one month,
selected by clicking two days on the calendar. A single day is a Período whose
ends coincide, so nothing about today's behaviour is lost — it is the degenerate
case, not a separate mode.

Settled in a second grilling session and broken into three build tickets in
`tickets/` (distinct from `issues/`, which holds the resolved decision tickets
from the first session):

1. [The Período in the domain](tickets/01-the-periodo-in-the-domain.md) — the
   glossary entry, the fold narrowed to a Período, the click rules as a tested
   reducer. No visible change.
2. [Selecting two days scopes the view](tickets/02-selecting-two-days-scopes-the-view.md)
   — the feature, end to end.
3. [Clearing a Período from the widget](tickets/03-clearing-a-periodo-from-the-widget.md)
   — an X, and where focus goes when the widget it sits in disappears.

**Built — 2026-09-10.** All three tickets are implemented; typecheck, lint, the
full suite (277 tests) and `next build` pass.

- `src/helpers/day-range.ts` — the `DayRange` type, `isInRange`, and the
  `selectDay` reducer carrying all four click rules (+ 12 tests).
- `summarizeDayObligations` → `summarizeRangeObligations`, its ledger taking
  `range` rather than `day` (`month-summary.ts`); its tests moved to
  `range-obligations.test.ts` and grew to 19.
- `formatRangeLabel` beside `formatDayLabel` in `date.ts` (+ 4 tests).
- `DayTotalCard/` → `RangeTotalCard/`, now heading with the Período, carrying
  the X, and widening its `sr-only` sentence.
- `CalendarStrip` tints every day of the Período with `bg-accent-soft` and gives
  its two ends an inset accent ring — both on the cell, leaving the inner circle
  to say only whether the day is today, so today-and-an-end renders as both.
  The hover tint is conditional, because `hover:bg-surface-2` outranks a plain
  `bg-*` and would otherwise erase the span under the cursor. `aria-pressed` is
  gone.
- The four row components and their three sections take `highlightedRange` and
  test membership via `isYmdInRange`, which replaced four hand-rolled date
  parses that returned NaN on a malformed date.
- `CONTEXT.md` carries the Período entry.

**What the redraw settled** (do not re-litigate):

1. One selection drives both readouts — the widget and the row highlighting.
   Two independent day-selections on one page would be worse than either.
2. The figures stay **Obrigações only**. Widening to Despesas would fuse two
   classes the glossary keeps apart on obligation-vs-discretionary grounds; it
   remains a separate destination.
3. A Período is **month-bounded**. Cross-month is the server-side fold from
   ticket 01 arriving through the back door, and that ticket was settled by the
   "front-end only" instruction. Revisit that instruction first if wanted.
4. Clicks: first sets a one-day Período, a second on a different day extends
   (normalised, so order does not matter), any third restarts from that day, and
   a lone selected day clears. One rule for the third click, no exceptions.
5. The copy is unchanged — "*N contas vencem*", no disclaimer. *Vencer* is
   definitionally inapplicable to a Despesa, so the sentence already excludes
   what the highlight might otherwise invite a user to read in.
6. A Período covering the whole month restates the Contas card's own figure, and
   is left to. Suppressing a correct answer needs a rule that explains itself.

**Accessibility was scoped down by the user** — this app is not publicly
distributed. What the docs research established, and what was done with it:

- The APG documents **no date-range pattern**, and no date *picker* pattern
  either — date pickers exist only as examples under Dialog and Combobox, and
  the W3C issue proposing a pattern was closed without one. There is no
  conformance target here; the agreement among react-aria, MUI and friends is
  convention, not correctness.
- `aria-pressed` **cannot** express membership of a Período. ARIA 1.2 defines it
  for toggle buttons, where "activating it once changes the value to `true`, and
  activating it another time changes the value back to `false`" — neither is
  true of a day in the middle of a span. It comes **off** the day buttons rather
  than being left to assert something false.
- Expressing it properly means `aria-selected` on `gridcell`, which the calendar
  cannot carry: it has no `role="grid"` at all, only a CSS grid of buttons.
  Adopting grid semantics is **out of scope by decision**, not by oversight.
- WCAG is **silent** on announcing a half-built range; the reducer produces no
  half-built state anyway, since every click yields a complete Período.

## Destination (as originally charted)

Selecting a day in the CalendarStrip scopes the **Contas card** to that day: it
lists only the Obrigações due then and reports their sum. Nothing else on the
monthly view changes behaviour. The map is done when every decision below is
settled and someone can build it without asking another question.

## Notes

**Domain.** The Contas card renders Contas *and* parcelas de Financiamento —
together, **Obrigações** (`CONTEXT.md`). This is not a UI accident: the domain
layer already folds them as one class at `src/helpers/month-summary.ts:95`, and
the calendar dot marks a day whose only outflow is a parcela
(`src/helpers/__tests__/month-day-markers.test.ts:40`). Every ticket here means
Obrigações when it says "what is due".

**Colour is not free.** `CONTEXT.md` fixes red on an aggregate as *outflow* and
red on a row as *Vencida*, "the app's one urgency signal". A day total is an
aggregate and stays red on those terms; no ticket may spend row-red on anything
but Vencida.

**Skills every session should consult:** `grilling` and `domain-modeling` by
default; `codebase-design` for the seam question in "Where the day's figures are
folded".

**Settled while charting** (do not re-litigate):

1. Scope is the Contas card alone. Saldo, Resumo, Receitas and Despesas are
   untouched.
2. The filter covers Obrigações — Contas and parcelas alike.
3. Selecting a day **hides** non-matching rows rather than emphasising matches.
   The Pendente/Pago `Total` rows therefore re-scope to the day; a Total that
   contradicted the rows above it is not an option.
4. A selected day with no Obrigação shows an explicit empty state, not a
   silently unfiltered month.
5. The day's figures come from a **pure helper**, not inline component logic —
   the repo has no component test setup, and `month-summary.ts` already holds
   the fixtures this needs.
6. The card's headline shows the **day's** total, with the month's demoted to a
   subordinate line beneath it.
7. The Contas card carries its own visible "filter is active" affordance; the
   calendar toggle alone is not enough, because cause and effect sit rows apart
   and a scroll apart on a phone.

## Decisions so far

<!-- one line per resolved ticket: gist + link -->

- [Where the day's figures are folded](issues/01-where-the-days-figures-are-folded.md):
  client-side, option (a) — settled by the user's "front-end only" instruction.
  `summarizeDayObligations` folds rows the page already holds, so selecting a day
  costs no request. It returns figures only; there is no row list to disagree with,
  because the widget shows no rows.
- [Where the selected day lives](issues/02-where-the-selected-day-lives.md):
  component state, unchanged. "It isn't meant to be recorded" rules out the URL
  param, and with a client-side fold the server never needs the day.
- [How the filtered card announces itself](issues/06-how-the-filtered-card-announces-itself.md):
  an `sr-only` `role="status"` region mounted on every path, carrying a full
  sentence with the day, the count and both figures. Cleared state announces
  itself rather than falling silent. The focus trap dissolved with the redraw:
  clearing happens on the calendar button, which never unmounts.
- **The calendar dots' accessible names** (`CalendarStrip.tsx`): the prohibited
  `aria-label`s on bare `<span>`s are gone. The dot row is `aria-hidden`, and
  each day button carries an `sr-only` span so its name reads "10, tem contas
  vencidas em aberto" — restoring Vencida to screen reader users, which the
  research found was inaudible.
- [Announcing the filtered list](issues/05-announcing-the-filtered-list.md): the
  live region belongs on a short summary line with `role="status"` and explicit
  `aria-atomic`, never on the list itself — WCAG 4.1.3 says results are not a
  status message but "No results returned" is. `aria-pressed` on the day buttons
  is correct but cannot express single-selection. There is **no** documented
  "clear filter" pattern in the APG, and an affordance that unmounts on use drops
  focus to `<body>`.

## Not yet specified

- **The filtered card's layout beyond its wording.** Whether the Pendente/Pago
  headings still earn their place when a day typically holds one or two rows,
  and where the active-filter affordance sits relative to the headline. Hangs on
  the copy decision in `04-the-words-for-a-filtered-day.md`.
- **The all-paid day.** When everything due on the selected day is already Pago,
  the card is a Pago subsection plus a day total. Whether the headline and its
  "de R$ X no mês" line still read correctly there is not yet sharp enough to
  ticket.

## Out of scope

- **Splitting the calendar dot** so Obrigações and Despesas read differently.
  `CalendarStrip.tsx:131-134` gives both the same accent dot, so a Despesa-only
  day invites a click that yields the empty state. Accepted knowingly: changing
  what the dot means is a calendar decision that collides with the Vencida red,
  and the destination stops at the Contas card.
- **Extending the day filter to Receitas and Despesas.** A real idea, past this
  destination. If wanted, it is a fresh effort with a redrawn destination, not a
  resumption of this one.
- **The monthly PDF report** (`src/lib/pdf/MonthlyReportPdf.tsx`), which stays
  month-scoped.
- ~~**The calendar dots' broken accessible names.**~~ **Pulled back into scope
  and fixed on 2026-09-10** at the user's request — see Decisions so far.
  Originally ruled out as a calendar change beyond the destination. `CalendarStrip.tsx:174-192`
  puts `aria-label` on bare `<span>`s, which ARIA 1.2 lists as *prohibited* for
  the `generic` role, so each day button announces only its bare number and the
  Vencida signal is inaudible. Surfaced by the research ticket; a real
  pre-existing defect, but it is a calendar fix and the destination stops at the
  Contas card. Worth its own effort — it is not fixed by this map, and this line
  is the only record of it.
