# 08: One module for the month's figures

**What to build:** Saldo and Resumo — the figures this app exists to show — are
computed inline while the monthly page renders, which means they have no interface
and nothing can test them. They move into one pure module.

It takes the month's resolved Contas and Despesas, its Receitas and its
Financiamento items, and returns every figure the view needs: Saldo esperado,
Saldo até o momento, and the five Resumo columns. The page passes data in and
renders what comes back.

The rule worth protecting is _Saldo até o momento_: it subtracts Contas already
paid **and** Contas past due but unpaid, because both are money that should
already be gone. Financiamento parcelas fold in on the Contas side and
amortizações on the Despesas side, exactly as the page does today.

Tickets 09–12 move the day markers and the other two consumers onto this module.
This one is done when the monthly view renders identical numbers with the
arithmetic gone from the page.

**Blocked by:** 03.

**Status:** ready-for-agent

- [ ] One pure module returns Saldo esperado, Saldo até o momento and the five
      Resumo figures from plain arrays
- [ ] Financiamento parcelas count as Contas and amortizações as Despesas
- [ ] Saldo até o momento subtracts paid Contas and overdue unpaid Contas without
      counting a paid future-dated Conta twice
- [ ] Each of those behaviours is covered by a test against the module's interface
- [ ] The monthly page computes no totals of its own
- [ ] Every figure on screen is unchanged for a month carrying Contas, Despesas,
      Receitas and a Financiamento

## Further notes

Keep the two filters separate inside the fold — one by paid, one by date. Merging
them is how a paid future-dated Conta ends up subtracted twice.

Resumo is not a Saldo and does not sum to one; the glossary is explicit about
that. Returning both from the same module is not an invitation to reconcile them.
