# Projetos

## Problem Statement

The app answers "what happens to my money this month" very well and cannot
answer "what is this reforma costing me" at all.

Some spending is not really about the month it lands in. A house remodel or a
trip is one effort with one budget, paid for over six or eight months, in
pieces that look unrelated when you meet them one month at a time: a Despesa
for the pedreiro in March, a 10x parcelamento for the sofa starting in April, a
Despesa for tinta in June. The app records every one of them correctly and has
nowhere to say that they are the same thing.

So the two questions a household actually asks about an effort like this have
no answer today. **What did I plan to spend, and where am I against it?** And
**how much of this am I still going to be paying for, and until when?** Users
compensate the only way the app allows, by cramming the effort into the entry
name — "Reforma - pedreiro", "Reforma - sofá 3/10" — which means the app holds
the information and cannot count it, exactly the failure that motivated
Categorias.

A Categoria does not solve it. A Categoria is permanent and open-ended, and the
question here is bounded: this reforma, this budget, and one day it is over.

## Solution

A **Projeto** is a finite, named effort that money is spent toward. It is
planned before it is paid for and it is meant to end. Reforma da casa, Viagem à
Espanha.

A Projeto carries an **Orçamento**, divided into **Items** the user names for
that Projeto and nowhere else: Mão de obra and Materiais for a reforma,
Passagens and Hospedagem for a trip. Spending is attributed to a Projeto and to
an Item as it is recorded, and the Projeto page reports the plan against
reality: what each Item was budgeted, what it has consumed, and what is left.

Crucially, **a Projeto stores intent and never stores money**. The Orçamento,
the Items and the revisions live with the Projeto. The spending itself stays
where it already is, in the ledger, as ordinary Despesas and Contas that appear
in their month exactly as they do today. The Projeto page is a join over the
ledger, not a second place money lives. Nothing is "converted", because nothing
was ever separate.

That constraint is what keeps this app a cash-flow tracker. Saldo, the Resumo,
the CalendarStrip and `/insights` are untouched. Planned-but-unspent money never
enters a monthly figure. Every amount the Projeto page shows is the same amount
the month view shows for the same row.

A Projeto is **Ativo** or **Arquivado**, and Arquivado is a visibility state
only. Archiving a Projeto with budget left unspent leaves it reported as
unspent, because that is the true and interesting fact about how it went.

## User Stories

### Creating and planning

1. As a user, I want to create a Projeto with a name, so that spending spread
   across many months can be recognised as one effort.
2. As a user, I want to give a Projeto an icon and a colour, so that I can pick
   it out of a list the way I already pick out a Categoria.
3. As a user, I want to break a Projeto's Orçamento into Items I name myself, so
   that "Mão de obra" and "Materiais" can be planned and tracked separately.
4. As a user, I want Items to be scoped to their Projeto, so that naming one
   "Materiais" does not add a bucket to the Categoria list I use for groceries.
5. As a user, I want to give an Item a budget amount, so that I can see how much
   of it I have used.
6. As a user, I want to leave an Item with no budget, so that I can track a part
   of the effort I genuinely cannot estimate without inventing a number.
7. As a user, I want to add an Item halfway through a Projeto, so that
   discovering the wiring needs replacing does not mean my plan was wrong from
   the start.
8. As a user, I want to point an Item at a Categoria, so that spending inside a
   Projeto still lands in my category reports without me classifying it twice.
9. As a user, I want to rename an Item at any time, so that a better word does
   not fracture the history filed under the old one.

### Recording spending

10. As a user, I want to record a Despesa against a Projeto and an Item from the
    Projeto page, so that I can log a batch of reforma spending without leaving
    the page I am thinking on.
11. As a user, I want to attribute a Despesa to a Projeto from the monthly view,
    so that logging the week's spending does not mean going somewhere else when
    one of them was for the reforma.
12. As a user with no Projetos, I want the monthly Despesa form to look exactly
    as it does today, so that a feature I do not use does not clutter the form I
    use daily.
13. As a user, I want project spending to appear in the monthly view, in Saldo,
    in the Resumo and on the CalendarStrip like any other Despesa, so that my
    month is still the truth about my money.
14. As a user, I want to attribute spending to a Projeto without choosing an
    Item, so that I can record the money now and file it properly later.
15. As a user, I want spending with no Item to be reported in its own bucket on
    the Projeto page, so that it is visible rather than quietly missing from the
    total.
16. As a user, I want to change which Projeto or Item a past Despesa belongs to,
    so that a filing mistake is fixable.

### What is still owed

17. As a user, I want to attach a parcelamento to a Projeto, so that the sofa
    bought em 10x counts toward the reforma instead of being invisible to it.
18. As a user, I want every occurrence of that parcelamento to belong to the
    Projeto automatically, so that I do not tag ten parcelas by hand.
19. As a user, I want to attach a Financiamento to a Projeto, so that a loan
    genuinely taken for the reforma is counted against it.
20. As a user, I want a Projeto to show me what I still owe on it and until
    which month, so that I know how long I will be paying for a reforma that is
    already finished.
21. As a user, I want to see the juros a financed purchase adds, so that I know
    what the financing itself cost me.
22. As a user, I want a parcela attached to a Projeto to behave in every other
    way exactly like a Conta, so that it still appears in my month, still counts
    toward Saldo, and still turns Vencida and reaches my Aviso if I miss it.

### Standing and drift

23. As a user, I want each Item to show its Orçamento against what it has
    consumed, so that I can see which part of the effort is running away from me.
24. As a user, I want a purchase made em 10x to consume its whole budget on the
    day I make it, so that the Projeto never tells me I have room I have already
    spent.
25. As a user, I want to see what a Projeto has actually paid separately from
    what it has committed, so that I can tell the difference between money gone
    and money owed.
26. As a user, I want an Item to be allowed to go over its budget, so that the
    app records what happened instead of refusing it.
27. As a user, I want over-budget shown in a colour that is not red, so that red
    keeps meaning Vencida and nothing else.
28. As a user, I want to see what a Projeto was originally budgeted alongside
    what it is budgeted now, so that I can see how far it drifted.
29. As a user, I want each change to the total recorded with its date, so that
    the drift is a timeline and not a single number.
30. As a user, I want to explain a revision when I make one, so that "why is
    this 12.000 more than I thought" has an answer in six months.
31. As a user, I want to skip that explanation, so that recording the revision
    is never blocked on my having words for it.
32. As a user, I want to see what a Projeto consumed in each month, so that I
    can connect a tight month to the effort that caused it.

### Finishing

33. As a user, I want to archive a Projeto when the effort is done, so that it
    stops appearing in the picker when I record new spending.
34. As a user, I want an archived Projeto to keep every figure it had, so that
    finishing under or over budget stays a fact I can look at.
35. As a user, I want to un-archive a Projeto, so that remembering one last
    invoice is not a dead end.
36. As a user, I want to reuse the name of an archived Projeto, so that next
    year's trip can also be called what it is.
37. As a user, I want to be prevented from deleting a Projeto that has spending
    against it, so that I cannot destroy history by tidying.
38. As a user, I want to delete an Item even when spending points at it, so that
    reorganising my plan halfway through is not blocked by my own bookkeeping.
39. As a user, I want that spending to stay in the Projeto when its Item is
    deleted, so that deleting a bucket never removes money from the month or
    from the Projeto's total.

### Reports

40. As a user, I want the monthly PDF to show what each Projeto consumed that
    month, so that the report reflects where the month's money actually went.
41. As a user, I want project spending counted in my category reports, so that
    the largest spending of the year is not silently missing from them.
42. As a user, I want `/insights` to keep counting project spending, so that my
    benchmarks describe my real finances.
43. As a user, I want to know which Projetos fell inside an insights window, so
    that a ratio outside the cenário ideal is explicable rather than alarming.
44. As a user, I want an Aviso about a parcela attached to a Projeto to name the
    Projeto, so that "Sofá 3/10" tells me which effort it belongs to.

## Implementation Decisions

### Vocabulary

Recorded in `CONTEXT.md`: **Projeto**, **Item** (code: `budget_line`),
**Orçamento** (code: `project_budget`), **Comprometido**, **Arquivado**.

Naming notes. `Rubrica` is the precise accounting word and was rejected as
desk-language nobody says; it is already on the `_Avoid_` list under Categoria.
`Etapa` breaks on a trip, where hotel and passagem are not stages of anything.
`Item` is right in Portuguese and is already taken in the codebase, where it
means a row rendered in the monthly view (`MortgageBillItem`, `NavItem`,
`buildMonthItems`) — hence the split UI/code naming, which `CONTEXT.md` already
establishes as a convention for exactly this reason.

`Orçamento` is free in Portuguese; `budget` is not free in code, where it
already names the `/insights` benchmark ratios (`ideal_budget_settings`), which
the UI calls "cenário ideal".

### Where actuals live

Recorded in ADR 0005. `entries` gains two nullable foreign keys, to the Projeto
and to the Item. A project expense **is** a Despesa. The rejected alternative
was the shape Financiamento uses — a private table plus a projection into the
monthly view — which is the wrong precedent to copy: financing owns tables
because a parcela is *computed* from an amortization schedule and there is no
user-entered row to store in the first place. A project expense is a dated,
named amount, which is the definition of a row in `entries`.

The consequence is that everything month-shaped works with no new code, and
project spending inherits the month lock: editing project spending in a past
month needs a `month_unlocks` row, like any other Despesa.

### Schema (migration 0017)

New tables, all space-scoped, RLS following the established pattern exactly —
SELECT via `can_read_space`, writes via `is_active_member`:

- **projects** — `space_id`, `name`, `icon`, `color`, `active`, `created_at`.
  Partial unique index on `(space_id, lower(trim(name))) where active`,
  mirroring `recurring_bill_templates` and `categories`, so a name is reusable
  once the Projeto is archived.
- **project_budget_lines** — `space_id`, `project_id`, `name`, nullable
  `category_id`, nullable `amount`, `created_at`. Nullable amount is what makes
  an Item usable as a pure tracker. Partial unique index on name per project.
- **project_budget_revisions** — `space_id`, `project_id`, `total`, nullable
  `reason`, `created_at`.

Columns added, all nullable: `project_id` and `budget_line_id` on `entries`,
`project_id` on `recurring_bill_templates`, `project_id` on `financings`.

`budget_line_id` is `on delete set null`, which is what lets an Item be deleted
while its spending stays in the Projeto and stays in the month.

**One trap.** "A Projeto with spending cannot be deleted" is enforced in the
action layer, not as `on delete restrict` on `entries.project_id`. Everything
cascades from `spaces`, and a restrict would make deleting a space fail.

### Comprometido is measured in cash

The decision that shapes every number on the page. An Orçamento is consumed by
**Comprometido**, not by what has been paid, and Comprometido is measured
all-in: the cash the Projeto will actually pay out, juros included.

Consuming on payment was rejected: a 30.000 sofa em 10x would leave the Reforma
looking 27.000 under budget for nine months, which is the opposite of what a
budget is for. Measuring in principal rather than all-in was designed and then
rejected too, because it does not survive contact with a parcelamento — a
template stores only `default_amount` and `installments_total`, so there is no
way to know what part of "12x de R$ 450" is juros, and a Projeto would end up
measuring a store purchase and a loan on two different bases. It would also
force Pago to count amortization rather than the parcela actually paid, so that
the Projeto page and the monthly view would disagree about the same March
parcela.

All-in keeps one basis for everything and means no figure on the Projeto page
ever contradicts a figure anywhere else. The Projeto and the month answer
different questions instead of giving different answers to one.

Three figures per Item and per Projeto:

- **Comprometido** — what is spent plus what is owed. For recorded Despesas and
  paid parcelas this is their actual amounts; for the remaining parcelas of an
  attached parcelamento it is the modelled remainder; for an attached
  Financiamento it is the whole-life total from the amortization schedule,
  extras included.
- **Pago** — cash already out.
- **A pagar** — the difference.

Using actuals for what happened and the model only for what remains keeps a
parcela paid at an overridden amount from drifting the total, which the earlier
principal-based design could not avoid.

The juros a Financiamento adds is shown on the Projeto's a-pagar tab as its own
figure. It is informational: it is already inside Comprometido.

### Categoria resolution

An Item may carry a Categoria that its spending inherits. Resolution order:
template first, then Item, then uncategorised.

This extends ADR 0001 rather than changing it. A Categoria on a template is a
classification of the bill itself, which is that ADR's reasoning, so a
template-bound row keeps resolving through its template even when it also
belongs to a Projeto. The accepted cost is a third meaning for a NULL
`category_id`, on an overload ADR 0001 already named as its price.
`template_id` and `budget_line_id` disambiguate it.

### Budget revisions

The current Orçamento is always the live sum of the Items and is never stored. A
revision row is an annotation on a timeline, not the mechanism that changes a
number. One is written whenever the total changes, coalesced per save, with the
reason prompted and skippable. The baseline is the row written when the Projeto
is created, which is what gives "orçado 40.000" a source.

An explicit "Revisar orçamento" action was rejected: it makes the feature depend
on the user remembering to declare a revision mid-reforma, and a timeline with
gaps is worse than one with unlabelled points.

### Application modules

- **A new rollup helper**, split the way `category-reports` is split: a thin
  Supabase fetch and a pure fold. The fold takes the Projeto's Items, its
  tagged entries, its tagged templates with their installment state, and its
  attached financings already flattened into the same per-row shape, and returns
  per-Item and per-Projeto Comprometido / Pago / A pagar, the unassigned bucket,
  the month strip, and the baseline-versus-current pair.
- **Financing is flattened before it reaches the fold**, exactly as
  `getFinancingSpendForRange` flattens it into `SpendEntry` before
  `foldCategorySpend` sees it. The fold therefore needs no knowledge of
  amortization at all.
- **`foldCategorySpend` gains the Items as an input** so it can apply the
  template-then-Item resolution order. This extends an existing seam rather
  than adding one.
- **`summarizeMonth` and `monthDayMarkers` are not touched.** A project expense
  is already an entry, so the monthly figures need no knowledge of Projetos.
  This is the payoff of ADR 0005 and the clearest signal that the design is
  right.
- **The Despesa server action** gains optional Projeto and Item, and is shared
  by the monthly form and the Projeto page form.
- **The monthly report data builder** gains a per-Projeto rollup for the month;
  the PDF gains a short Projetos section.
- **The overdue alert projection** appends the Projeto name to the line it
  already builds. No change to which Obrigações are selected or when the Aviso
  fires.

### Surfaces

`Projetos` is a top-level nav entry listing Ativos, with Arquivados behind a
toggle. The Projeto page carries the plan against reality — Items with their
Orçamento, Comprometido, Pago and A pagar, the unassigned bucket, and the
revision timeline — plus a tab for what is still owed, showing parcelas
restantes, mês final and the all-in figure with its juros, plus a compact
per-month strip.

Over-budget renders amber or as plain text. Never red: `CONTEXT.md` is explicit
that red on a row means Vencida and that this is the app's single urgency
signal.

The Projeto picker appears on the monthly Despesa form only when the space has
at least one Ativo Projeto.

## Testing Decisions

**What makes a good test here.** Tests exercise observable behaviour through a
module's public interface. "A sofa bought em 10x consumes its whole remaining
series on the day it is attached" is behaviour. "The rollup calls the financing
helper" is implementation, and will break on every refactor while catching
nothing.

**Seams: one new, one extended, and one deliberately left alone.**

*New.* The project rollup fold. It takes plain arrays and returns plain data, so
every rule worth protecting is testable without a database:

- a recorded Despesa counts toward its Item at its actual amount
- an attached parcelamento's unpaid remainder counts toward Comprometido but not
  toward Pago
- a parcela paid at an overridden amount counts at what was paid, not at the
  template default, and the series total does not drift
- an attached Financiamento contributes its whole-life total including juros and
  extras
- spending with no Item accumulates into the unassigned bucket rather than
  vanishing from the Projeto total
- an Item over its budget reports the overage rather than clamping
- the baseline revision survives later revisions, so original-versus-current is
  always answerable

*Extended.* `foldCategorySpend` gains the Item resolution path. The rules to add
to the existing suite: a one-off with an Item resolves through the Item's
Categoria; a template-bound row that also belongs to a Projeto still resolves
through its template; a row whose Item has no Categoria lands in the
uncategorised bucket rather than in the Projeto.

*Left alone, and asserted as such.* `summarizeMonth` must produce identical
`MonthTotals` for a Despesa with and without a Projeto attached. The absence of
change is the invariant this whole design rests on, so it is worth one test that
would fail loudly if someone later taught the monthly fold about Projetos.

**Prior art.** `foldCategorySpend` is the direct model: same thin-fetch/pure-fold
split, same flattening of financing into a common row shape before the fold, and
its existing suite is the pattern to copy. `fake-supabase.ts` is the tool for the
one thing a pure fold cannot cover — asserting that the Despesa write leaves
`category_id` unset so Item inheritance is not defeated at the point of writing,
which is exactly the invariant it was built to protect for templates.

**Not tested.** The Supabase fetch either side of the fold stays a thin,
uninteresting wrapper. Database-level behaviour — the partial unique indexes and
`ON DELETE SET NULL` — is verified by applying the migration chain to a
throwaway Postgres, as `0012` was, not by a checked-in suite.

## Out of Scope

- **Receitas cannot belong to a Projeto.** No splitting costs with other people,
  no reimbursements. A budget line that can go negative is a different feature.
- **No dates on a Projeto.** No start date, no target month. Dates invite "está
  atrasado", and Vencida is the app's only urgency signal.
- **Planned money never enters the monthly view.** Not Saldo esperado, not the
  Resumo, not the CalendarStrip. The month keeps counting only money that moved
  or is owed. Showing a Projeto's unspent budget as a forecast beside Saldo
  would be additive later; scheduling budget Items into future months is a
  different app.
- **No per-Item budget baselines.** Revisions are project-level. Per-Item
  archaeology is not worth a table.
- **No budget ranges.** An Item is a number, not 12.000–18.000, or "am I over"
  stops having an answer.
- **Project spending is not excluded from `/insights` or the category report.**
  A 52.000 reforma will push the ratios outside the cenário ideal for months,
  and that is true. Naming the Projetos in the window is the fix; hiding real
  spending to improve a ratio is how a planner starts lying.
- **No budget alerts.** Nothing emails or notifies about an Orçamento. The Aviso
  stays exactly what `CONTEXT.md` says it is: Obrigações Vencidas.
- **No templates for Projetos.** Every trip starts from an empty plan.
- **No merging two Projetos.**
- **No reassignment UI for bulk retagging.** Spending is retagged one row at a
  time.

## Further Notes

The design was settled by interview; `docs/handoff/projects.md` records how it
was reached, including the options considered and rejected at each fork, and is
the place to look before reopening any of them.

The one decision a future reader is most likely to mistake for a bug is that a
Projeto's Comprometido counts money that has not left the account, so a Projeto
can report 52.000 consumed in a month when Saldo shows 4.200 leaving. These are
different questions, not different answers. Whether this earns an ADR of its own
is an open call; the reasoning is captured above and in the handoff.

The Categoria resolution order is the other candidate: it adds a third meaning
to a NULL `category_id`, on an overload ADR 0001 already flagged. An ADR
extending 0001 was offered during design and not written.

Migration 0017 is additive only — new tables, new nullable columns, no drops and
no NOT NULL changes — so old application code keeps working against the new
schema and the schema can safely be pushed before the app is deployed.
