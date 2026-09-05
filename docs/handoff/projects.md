# Handoff — Projetos

**Status: designed and settled; build not scheduled.** The open question below
was resolved in favour of answer (2), all-in everywhere. The spec is at
`docs/specs/projects.md`. This file is kept as the record of how the design was
reached and what was rejected along the way.

## The reservation

This app is a cash-flow tracker. Its whole identity is a clear view of money
flowing in and out of a household budget, one month at a time. Every figure it
shows is either money that moved or money that is owed, and `CONTEXT.md` is
built around that split (Obrigação vs. Despesa, Saldo esperado vs. Saldo até o
momento).

A Projeto is the first thing that would be organised by something other than
the month, and one part of the design deliberately disagrees with the month
view. That part is **Comprometido**, and it is worth being honest that it is
the source of the confusion risk:

> In March the monthly view shows a parcela of R$ 1.100 leaving the account.
> The Reforma reports that March consumed R$ 950 of its Orçamento. Both are
> correct. The difference is the juros, which is the cost of *how* you paid,
> not of *what* you bought.

Everything else in this design is cash-flow-native. Project actuals are
ordinary Despesas in `entries`, they appear in the month like any other
spending, Saldo is untouched, `/insights` is untouched, and planned-but-unspent
money never enters any monthly figure. Comprometido is the one non-cash idea,
and it exists only because a budget measured on cash basis tells you that you
have room you have already spent.

**So the go/no-go is narrower than it looks.** See "The smaller version" at
the bottom: dropping Comprometido leaves a Projeto that is a pure lens over the
ledger, introduces no number that disagrees with any other number, and keeps
the app exactly what it is today. It costs you the accuracy of the budget bar
mid-project.

## The one open question

**Does an Orçamento measure cost or cash?**

Settled during the session was "principal, not interest", which does not
survive contact with a parcelamento:

- A **Financiamento** splits principal from juros. `ScheduleRow` carries
  `interest` and `amortization`; `Schedule.totals` carries `paid`, `interest`
  and `principal`. Principal is knowable.
- A **parcelamento** does not. A template stores `default_amount` and
  `installments_total` and nothing else, so "12x de R$ 450" is 5.400 and there
  is no way to know what part of that is juros, because the store never said.

So under the settled rule a 5.400 parcelamento consumes 5.400 while a 30.000
Financiamento that will cost 36.000 consumes 30.000. Two purchases in one
Projeto on two bases. And Pago has to follow Comprometido: if Comprometido
counts principal, then Pago on a Financiamento must count `amortization` rather
than the parcela actually paid, or a settled 30.000 loan reports Pago 36.000
against Comprometido 30.000 and the bar goes past 100% on a project that came
in exactly on budget.

Three answers, unresolved:

1. **Principal wherever it is knowable.** Financiamento consumes principal,
   Pago counts amortização, parcelamento consumes its full quoted total because
   there is nothing to strip. A parcelamento sem juros has principal equal to
   total, so the asymmetry only appears when interest is visible, which usually
   means an actual loan. This was the recommendation. It is also what produces
   the R$ 1.100 / R$ 950 mismatch above.
2. **All-in everywhere.** Comprometido and Pago both count cash out. Internally
   consistent, never disagrees with the month view, and the same reforma then
   "costs" 52.000 or 58.000 depending on how it was paid for, which is not
   comparable to the 52.000 budgeted from quotes.
3. **Principal everywhere**, adding a rate column to `recurring_bill_templates`
   so a parcelamento's juros can be stripped too. Needs a number the store did
   not give the user.

Accepted limitation under any answer: a parcela paid at an overridden amount
makes the modelled series total drift from what was actually paid. Comprometido
stays `default_amount × installments_total`.

## Vocabulary

These are already written into `CONTEXT.md` (see "Repo state" below).

- **Projeto** — a finite, named effort money is spent toward. Planned before it
  is paid for, meant to end. Categoria is permanent and says what kind of money
  it was; Projeto is temporary and says what it was for. One flow carries both.
- **Item** (code: `budget_line`) — a division of a Projeto's Orçamento, scoped
  to that Projeto and meaningless outside it. May carry a Categoria its
  spending inherits.
- **Orçamento** (code: `project_budget`) — what a Projeto plans to spend, as
  the sum of its Items. Revisable, with every change to the total recorded.
- **Comprometido** — what a Projeto can no longer spend: already paid, plus the
  Obrigações still owed whether or not they have left the account.
- **Arquivado** — a visibility state, never a money state.

Naming notes: `Rubrica` was rejected as not colloquial and is already on the
`_Avoid_` list under Categoria. `Etapa` breaks on a trip, where hotel and
passagem are not stages of anything. `Item` collides in code with
`MortgageBillItem` / `NavItem` / `buildMonthItems`, hence the split UI/code
naming, which `CONTEXT.md` already establishes as a convention.

## Settled decisions

**Actuals live in the ledger.** `entries` grows `project_id` and
`budget_line_id`, both nullable. A project expense *is* a Despesa. Recorded in
`docs/adr/0005`. The rejected alternative was the Financiamento shape (a
private table plus a projection into the month), which is the wrong precedent
to copy: financing owns tables because a parcela is *computed* and there is no
user-entered row to store. This also means project spending inherits the month
lock for free.

**Plan and actual are on opposite sides of a seam.** The Projeto stores intent
(Items, Orçamento, revisions). The ledger stores money. The project page is a
join, never a store. Nothing is "converted" because nothing was separate.

**Both installment mechanisms can carry a Projeto.** `project_id` on
`recurring_bill_templates` and on `financings`, both nullable. Store
parcelamentos stay Contas; a Financiamento is attached only when a real loan was
taken. Minting a Financiamento per sofa would flood `/financing`, which `0011`
built as the mortgage feature.

**Budget revisions are automatic, coalesced per save, reason optional.** The
current Orçamento is always the live sum of Items and is never stored; a
revision row is an annotation on a timeline. The baseline is the row written at
creation. Explicit "Revisar orçamento" was rejected because it makes the whole
feature depend on discipline nobody has mid-reforma, and a timeline with gaps
is worse than one with unlabelled points.

**Items are open, budgets are optional, over-budget is allowed.** Add an Item in
month four. Leave an Item with no budget and use it as a pure tracker. Spending
can sit in the Projeto with no Item at all, reported as its own bucket rather
than hidden, matching the posture `CONTEXT.md` already takes on uncategorised
money. Over-budget renders amber or plain, never red: red means Vencida and
that signal is not to be diluted.

**Categoria resolves template first, then Item, then uncategorised.** An Item
carries an optional Categoria its spending inherits, so money inside a Projeto
is classified once. This extends ADR 0001 rather than changing it: a Categoria
on a template is a classification of the bill itself, so the template keeps
winning. The cost is a third meaning for a NULL `category_id`, on an overload
ADR 0001 already flagged as its accepted price. **An ADR for this was offered
and not yet written.**

**Deleting.** A Projeto with spending can only be archived. An Item can always
be deleted; its spending falls to the unassigned bucket via
`on delete set null`, keeping its `project_id`. Nothing ever removes a row from
the monthly view. Renaming is always free, since Items are referenced rather
than snapshotted.

**Entry points.** Both the project page and the monthly Despesa form, sharing
one server action. The Projeto picker appears on the Despesa form only when the
space has at least one Ativo Projeto, so a user who never makes one never sees
it.

**Surfaces.** `Projetos` as a top-level nav entry. The project page carries the
plan against reality (Items with Orçamento and Comprometido, the unassigned
bucket, the revision timeline), a tab for what is still owed (parcelas
restantes, mês final, all-in figure with juros), and a compact per-month strip.
The per-month strip is the first thing to cut: the month view already answers
"what did March cost".

**Reports.** The monthly PDF gains a short Projetos section. The Aviso appends
the Projeto name to the line ("Sofá 3/10 (Reforma da casa)") with no
behavioural change, since the Aviso's job is already to name Obrigações rather
than count them. `/insights` is left alone: a 52.000 reforma will push the
ratios outside the cenário ideal for months and that is true, so the fix is to
name the projects that fell in the window, not to hide real spending.

## Deliberately not built

- **Receitas cannot belong to a Projeto.** No cost splitting with other people.
  A budget line that can go negative is a different feature.
- **No dates on a Projeto.** No start, no target month. Dates invite "está
  atrasado", and Vencida is the app's single urgency signal.
- **Planned money never enters the monthly view.** Not in Saldo esperado, not in
  the Resumo, not in the calendar. The month keeps answering "what happens to my
  money this month" and only ever counts money that moved or is owed.
- **No per-line budget baselines.** Revisions are project-level. Per-line
  archaeology is not worth a table.
- **No budget ranges.** A line is a number, not 12.000-18.000, or "am I over"
  stops having an answer.
- **Project spending is not excluded from `/insights` or the category report.**

## Sketch of the change

Migration `0017`, new tables:

- `projects` — `space_id`, `name`, `active`, plus the icon/color keys used by
  `0012`. Partial unique index on `(space_id, lower(trim(name))) where active`,
  mirroring categories and templates so a name is reusable after archiving.
- `project_budget_lines` — `project_id`, `name`, nullable `category_id`,
  nullable `amount`.
- `project_budget_revisions` — `project_id`, `total`, nullable `reason`,
  `created_at`.

Columns added: `entries.project_id`, `entries.budget_line_id`,
`recurring_bill_templates.project_id`, `financings.project_id`.

One implementation trap to handle at build time, not a reopened question: "a
Projeto with spending cannot be deleted" should be enforced in the action layer,
not as `on delete restrict` on `entries.project_id`. Everything cascades from
`spaces`, and a restrict would block deleting a space.

RLS follows the established pattern exactly: SELECT via `can_read_space`, writes
via `is_active_member`.

## The rejected alternative: no Comprometido at all

Considered and not taken. A Projeto could have been a pure lens over the
ledger: a `project_id` on `entries`, Items with target amounts, and a page
grouping only spending that actually moved. Every number would then be cash
already out, and the Projeto would never speak about the future at all.

It was rejected because the budget bar becomes wrong in the direction that
matters. A 30.000 sofa bought em 10x leaves the Reforma looking 27.000 under
budget for nine months, which is the opposite of what a budget is for.

Answer (2) gets most of the benefit at none of the confusion cost. Comprometido
is measured in the same cash the month view shows, so no figure on the project
page contradicts a figure anywhere else. The two pages answer different
questions rather than giving different answers to one.

## Repo state

Written during the design session, currently uncommitted:

- `CONTEXT.md` — five new terms (Projeto, Item, Orçamento, Comprometido,
  Arquivado).
- `docs/adr/0005-project-actuals-live-in-the-entries-ledger.md`.

Both describe a feature that does not exist. `CONTEXT.md` is a glossary of the
app as it is, so if this feature is dropped or deferred, both should be reverted
and this handoff is the record. If the smaller version is taken, `Comprometido`
comes out and ADR 0005 stands as written.

Not written: the offered ADR on Categoria resolution order, and `docs/adr/0006`
on Comprometido, which was held back because it depends on the open question.
