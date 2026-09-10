# 02: Selecting two days scopes the view to a Período

**What to build:** The feature, end to end. A user clicks a day on the calendar
and clicks a second one; the calendar shows the span, the widget beneath Saldo
reports what the whole Período owes, and the rows in Contas, Receitas and
Despesas highlight to match. A third click starts over from that day. Clicking a
lone selected day still clears it, exactly as today.

This ticket writes no rules of its own. Every rule was settled and tested in
ticket 01; this is the wiring.

**What the widget says.** The heading is the Período — "10 a 15 de setembro",
collapsing to "10 de setembro" when the ends coincide. Everything below it is
unchanged: the count line, the total, and the Pago / Falta pagar pair.

The count line stays "*7 contas vencem*", and it stays exactly that. The figures
count Obrigações only, while the row highlighting lights up Despesa and Receita
rows too, and over a wide Período that gap invites a misread. It does not need a
disclaimer to close it: the glossary records that a Despesa can never be Vencida
because "it records money that already went, so it has no due date to miss", so
*vencer* is definitionally inapplicable to a Despesa and the sentence is already
exact. Adding "só contas" beneath it would be noise defending against a reading
the verb already rules out.

"Conta" there is the colloquial sense the glossary permits — a Período holding
one Conta and one parcela reads "2 contas vencem", which is what a Brazilian
says about paying the month's contas. Deliberate, not a slip to tighten.

**What the calendar shows.** The span reads as a span rather than as two
unrelated marks, so a day inside the Período is distinguishable from a day
outside it, and the two ends from the middle. Use the accent that the current
selected-day ring already uses; this ticket introduces no new colour. In
particular it spends no red: red on an aggregate means outflow and red on a row
means Vencida, and a selection is neither.

**What comes off.** The day buttons carry `aria-pressed` today. It cannot
express membership of a Período — it is defined for toggle buttons, where
activating once sets it and activating again unsets it, and a day in the middle
of a span is neither independent of the other days nor un-pressable on its own.
Leaving it would tell a screen reader that twelve days are each pressed and that
pressing one again releases it, which is false. Remove it rather than replace
it: expressing this properly means adopting grid semantics across the calendar,
which is out of scope for this effort by decision.

The `sr-only` sentence in the widget stays and widens to the Período, so what it
announces still matches what is on screen.

**The card is renamed** to say what it now shows — it reports a Período, not a
day — folder included.

**Blocked by:** 01

**Departed from the ticket in one place, deliberately:** the empty state read
"Nada vence neste dia.", which is false about a six-day Período. It now says
"neste dia" when the ends coincide and "neste período" when they do not. The
ticket's list of what stays unchanged names the count line, the total and the
Pago / Falta pagar pair, and this is none of those — but it is new copy the
ticket did not ask for, so it is recorded here rather than passed off as
untouched.

**Status:** done

- [x] The monthly view holds a Período rather than a single day, and the four
      row components test membership of it rather than equality with a day
- [x] Clicking two days selects the span between them, in either order
- [x] A third click starts a fresh one-day Período; clicking a lone selected
      day clears it
- [x] The calendar distinguishes days inside the Período from days outside it,
      and its ends from its middle, using the existing accent and no red
- [x] The widget heading reads the Período, collapsing to the single-day form
      when the ends coincide
- [x] The count line, total and Pago / Falta pagar are unchanged; no disclaimer
      is added
- [x] A Período covering the whole month shows the month's own figure, and is
      left to do so — no cap, no suppression
- [x] `aria-pressed` is gone from the day buttons; the widget's `sr-only`
      sentence describes the Período
- [x] The card and its folder are renamed to name a Período
- [x] Typecheck and the full test suite pass
