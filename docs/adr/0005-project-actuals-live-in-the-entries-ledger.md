# Project actuals live in the entries ledger

A **Projeto** stores a plan — its budget lines and the revisions to them — and
nothing else about money. The spending itself stays in `entries`, which grows
two nullable foreign keys pointing at the Projeto and at the budget line it
consumes. A project expense *is* a Despesa; the project page is a join over the
ledger, not a store of its own.

The tempting alternative was the shape **Financiamento** already uses: a
private table plus a projection into the monthly view (`buildMonthItems`). That
is the wrong precedent to copy. Financing owns its own tables because a parcela
is *computed* from an amortization schedule, so there is no user-entered row to
put in `entries` in the first place. A project expense has no such excuse — it
is a dated, named amount, which is the definition of a row in `entries`.

## Consequences

Everything month-shaped works with no new code. A project expense lands in
Saldo, the Resumo, the CalendarStrip, `MonthlyReportPdf` and the category
report because all of those already read `entries`.

It also inherits the month lock: project spending in a past month cannot be
edited without a `month_unlocks` row, the same as any other Despesa. A Projeto
spans months, but its money does not escape the month it moved in.

A project expense cannot carry fields a Despesa lacks. If one ever needs a
supplier or a nota fiscal number, that is a column on `entries`, not a reason
to reopen this.

## Considered and rejected

**A `project_expenses` table, projected into the month.** Self-contained on the
project page and expensive everywhere else. `month-summary.ts` already merges
the ledger with financing at four separate points, and twenty-four files across
the helpers, the monthly view, the PDF and the tests know that financing is a
second source of money. Adding a third would mean a new merge site, a new row
component, and new handling in `category-reports`, `insights`, `alerts` and the
calendar markers — every one of them a place the two sources can disagree after
an edit.

**A sealed project ledger that never touches Saldo.** Wrong on the facts: the
money left the account in March whether or not the March view wants it.
