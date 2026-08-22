# Home Finances

A personal monthly finance planner. Each user tracks what comes in, what goes
out, and what's left — one month at a time. This file defines the shared
vocabulary; it is a glossary and nothing else. Implementation lives in
`CLAUDE.md`.

The user interface is Portuguese; the code is English. Several concepts
therefore carry two names, and the pairing is not always obvious. Both are
listed below.

## Language

**Receitas** (code: _income_):
Money flowing into the space. Each entry is expected on a date and is either
received or still pending.
_Avoid_: Ganhos, entradas, revenue, earnings

**Contas** (code: _bills_):
Recurring obligations — money that must go out on a schedule, whether the user
likes it or not. Every Conta traces back to a template that defines its
recurrence.
_Avoid_: Boletos, faturas, obligations, recurring expenses

**Despesas** (code: _expenses_, or _one-off entries_):
Discretionary spending — money that went out without a recurring obligation
behind it. A Despesa records money already gone, so it carries no paid state.
_Avoid_: Gastos, compras, despesas avulsas, purchases

Contas and Despesas are both outflows. The split is **obligation vs.
discretionary**, not scheduled vs. unscheduled and not money vs. not-money.

**Categoria** (code: _category_):
A user-defined bucket that groups money by kind. Each space manages its own
list. A Categoria is direction-scoped: it belongs either to Receitas or to the
outflows — Contas, Despesas and Financiamentos alike — never to both. Categorising a flow is
optional, and money left uncategorised is reported as its own bucket rather
than hidden.
_Avoid_: Fonte, tipo, grupo, tag, rubrica

**Pagador** (code: _payer_):
The named institution behind a Receita — an employer, a client, the
government. A Pagador answers _who paid_; a Categoria answers _what kind of
money it was_. The two are independent: one Pagador can send both a Salário and
a Restituição. Outflows have no Pagador; the counterparty of a Conta is carried
by the Conta's own name.
_Avoid_: Fonte, origem, source, cliente

**Fonte** is deliberately absent from this vocabulary. In pt-BR _fonte de
renda_ reads as the kind of income ("minha fonte de renda é freelance"), which
is Categoria, while the word is equally reachable for the institution, which is
Pagador. It cannot name one without being misread as the other, so it names
neither.

**Saldo**:
What's left after everything. Scoped to all three flows: Receitas minus Contas
minus Despesas. Appears in two forms — _Saldo esperado_ (the whole month as
planned) and _Saldo até o momento_ (only what has actually moved, treating
overdue unpaid Contas as already gone).
_Avoid_: Balanço, net, total

**Resumo**:
The running-total strip beneath the monthly view — the component figures of
Saldo, broken out by flow and by settled-vs-pending. A Resumo is not a Saldo
and does not sum to one: _Saldo até o momento_ subtracts overdue unpaid Contas,
which are only a subset of _Falta pagar_.
_Avoid_: Summary, overview, balance

## Colour

Colour on aggregate figures encodes **direction of flow**, never good or bad
news: money coming in is green, money going out is red. `Pago até o momento` is
red because it is money that left, not green because paying bills is progress.

Red at the level of an individual row means something different — **overdue and
unpaid**, the app's one urgency signal (the CalendarStrip dot). Row amounts
stay neutral so that signal keeps its meaning.
