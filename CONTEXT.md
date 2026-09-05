# Home Finances

A personal monthly finance planner. Each user tracks what comes in, what goes
out, and what's left — one month at a time. This file defines the shared
vocabulary; it is a glossary and nothing else. Implementation lives in
the code, the ADRs under `docs/adr/`, and `README.md`.

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

**Financiamento** (code: _financing_):
A loan amortised over a fixed term. Each month it owes one **parcela**; paying
ahead is an **amortização extraordinária**, which either shortens the term or
lowers the parcela. A Financiamento is not a Conta — it has no recurrence rule
to edit, only the schedule its own maths produces.
_Avoid_: Empréstimo, dívida, mortgage, loan

Contas, Despesas and Financiamentos are all outflows, and they divide on
**obligation vs. discretionary** rather than scheduled vs. unscheduled: a Conta
and a parcela must be paid, a Despesa and an amortização extraordinária are
chosen.

**Obrigação** (code: _obligation_):
An outflow the user is committed to — a Conta or a parcela de Financiamento.
Despesas and amortizações extraordinárias are not Obrigações: money already
gone, or money chosen freely. Obrigação names the class that can be Vencida,
and it is the only class the app ever chases the user about.
_Avoid_: Compromisso, dívida, commitment, liability

**Vencida** (code: _overdue_):
An Obrigação whose date has passed while it is still unpaid. A Despesa can
never be Vencida — it records money that already went, so it has no due date to
miss. Being Vencida is the app's single urgency signal: it reddens the day's dot
in the calendar, it is what _Saldo até o momento_ treats as already gone, and it
is what an Aviso reports.
_Avoid_: Atrasada, em atraso, late, past-due

**Aviso** (code: _alert_):
An email telling the user which Obrigações are Vencidas. It names each one
rather than only counting them, and it repeats once a day for as long as any
remain unpaid. On by default, and switching Avisos off leaves the monthly
report untouched.
_Avoid_: Notificação, lembrete, reminder, nudge

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

**Projeto** (code: _project_):
A finite, named effort that money is spent toward — Reforma da casa, Viagem
à Espanha — planned before it is paid for and meant to end. A Categoria is
permanent and answers what kind of money it was; a Projeto is temporary and
answers what the money was for, so one flow can carry both.
_Avoid_: Obra, meta, objetivo, iniciativa

**Item** (code: _budget line_):
A division of a Projeto's Orçamento, scoped to that Projeto and meaningless
outside it — Mão de obra, Materiais, Passagens. An Item may carry a Categoria
that its spending inherits, so money inside a Projeto is never classified
twice.
_Avoid_: Rubrica, etapa, frente, linha

**Orçamento** (code: _project budget_):
What a Projeto plans to spend, as the sum of its Items. It is revisable, and
every change to the total is recorded with its date, so a Projeto can always
report what it first expected to cost alongside what it expects now.
_Avoid_: Budget, meta, previsão, estimativa

**Comprometido**:
Money a Projeto can no longer spend: what it has already paid, plus the
Obrigações it still owes whether or not they have left the account. An
Orçamento is consumed by Comprometido and not by what was paid, because a sofa
bought em 10x is spent on the day it is bought.
_Avoid_: Alocado, reservado, committed, gasto previsto

**Arquivado**:
The state of a Projeto the user has finished with. Arquivado is a visibility
state and never a money state: it drops the Projeto from the pickers and
changes no figure anywhere, so a Projeto archived with budget left unspent
keeps reporting it as unspent.
_Avoid_: Concluído, encerrado, fechado, closed

**Saldo**:
What's left after everything. Scoped to all three flows: Receitas minus Contas
minus Despesas. Appears in two forms — _Saldo esperado_ (the whole month as
planned) and _Saldo até o momento_ (only what has actually moved, treating
Obrigações Vencidas as already gone).
_Avoid_: Balanço, net, total

**Resumo**:
The running-total strip beneath the monthly view — the component figures of
Saldo, broken out by flow and by settled-vs-pending. A Resumo is not a Saldo
and does not sum to one: _Saldo até o momento_ subtracts Obrigações Vencidas,
which are only a subset of _Falta pagar_.
_Avoid_: Summary, overview, balance

## Colour

Colour on aggregate figures encodes **direction of flow**, never good or bad
news: money coming in is green, money going out is red. `Pago até o momento` is
red because it is money that left, not green because paying bills is progress.

Red at the level of an individual row means something different — **Vencida**,
the app's one urgency signal (the CalendarStrip dot). Row amounts
stay neutral so that signal keeps its meaning.
