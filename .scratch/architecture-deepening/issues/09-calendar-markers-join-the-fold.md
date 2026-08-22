# 09: The calendar markers join the fold

**What to build:** The dots under each day of the calendar — Contas, Despesas,
Receitas, and the red one meaning overdue — are worked out by four loops in the
page that build sets of day numbers. They move into the same module as the month's
figures, since they are the same question asked per day.

Nothing changes on screen. What changes is that "which days get a red dot" becomes
testable, and the page stops doing date arithmetic.

**Blocked by:** 08.

**Status:** ready-for-agent

- [ ] The day markers are produced by the same module as the month's figures
- [ ] A day carries a Conta marker when a Financiamento parcela falls on it
- [ ] A day carries a Despesa marker when an amortização falls on it
- [ ] A day is marked overdue only when a Conta due that day is unpaid and the day
      is today or earlier
- [ ] A Despesa never makes a day overdue
- [ ] Each of the above is covered by a test
- [ ] The page builds no sets of its own and the calendar renders as before
