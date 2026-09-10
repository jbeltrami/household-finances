# 01: The Período in the domain

**What to build:** Nothing a user can see. This is the prefactor: the concept
gets a name in the glossary and two pure, tested helpers, so the ticket that
wires it up is a wiring job rather than a design job.

Today the monthly view holds a single selected day and folds that day's
Obrigações. After this ticket the same code holds a Período whose ends coincide
and folds a Período's Obrigações — the identical behaviour, expressed in the
vocabulary the next ticket needs. The app looks and behaves exactly as it does
now.

Three pieces:

**The glossary entry**, in the house format, following the Portuguese-term /
English-code pairing the rest of the file uses:

> **Período** (code: _range_):
> A stretch of consecutive days the user has picked out within one month. A
> Período never spans two months, and a single day is a Período whose ends
> coincide. The month a Período sits in is a *mês*, and is never itself called a
> Período however many days it covers.
> _Avoid_: Intervalo, faixa, janela, period, window, timespan

**The obligation fold**, narrowed to a Período rather than a day. It keeps
counting Obrigações only — Contas and parcelas de Financiamento — and keeps
returning `count`, `total`, `paid` and `remaining` spelled the way the Resumo
strip spells them. Its ledger carries the two ends of the Período rather than a
list of days: the interaction can only ever produce a contiguous span, and two
numbers can hold the invariant that a list cannot.

**The click reducer**, as a helper rather than inline component logic — for the
reason the original grilling gave for the fold itself: this repo has no
component test setup, so logic left in a component is logic left untested. The
rules, settled in full:

- No Período, click a day → a Período of that day alone.
- A one-day Período, click a different day → a Período spanning both.
- A one-day Período, click its own day → cleared.
- A Período, click any day → a fresh one-day Período on that day, its own ends
  included. No exceptions.

The second rule normalises: clicking 20 and then 12 gives 12–20, because a user
who clicks the later day first is pointing at two ends, not retracting. That
normalisation is what lets the Período hold `from <= to` everywhere else.

The fourth rule is the one that carries a temptation. Making a click inside a
Período clear it would save a click, but it costs a special case and it makes
"restart from a day in the middle" unreachable. One rule, no exceptions: the way
out of a Período is a fresh one-day Período, then one more click.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `CONTEXT.md` carries the Período entry, wording as above
- [x] The fold takes a Período's two ends and returns the same four figures
- [x] The existing ten tests for the fold pass against the new shape, joined by
      cases for a multi-day Período: obligations on both ends, obligations only
      in the middle, a Período with nothing due in it, and a Período whose ends
      coincide returning what the single-day fold returned
- [x] The click reducer is a pure function with a test per rule above,
      including the backwards-click normalisation and the third-click restart
- [x] A range label formatter sits beside the existing day one, collapsing to
      the single-day form when the ends coincide
- [x] The one existing caller passes a Período whose ends coincide; the app is
      visually and behaviourally unchanged
- [x] Typecheck and the full test suite pass
