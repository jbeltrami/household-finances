# 03: Economia com amortizações

**What to build:** The fifth card, which answers "was paying ahead worth it?". It
shows the interest that amortizações extraordinárias have removed compared with
the same loans without them, and, when any of them shortened a loan, how many
parcelas they removed ("N parcelas a menos"). A future-dated amortização counts,
so recording a planned one shows its effect before it is paid.

Before any amortização exists, the card invites the user to simulate one. The
simulator lives on each loan's own page: with a single active loan the card links
straight there, and with several it reads "Simule no financiamento" with no link.

Extend the overview projection from 01 and its test suite. See the spec at
`docs/specs/financing-overview.md`, including the Further Notes on why the
sub-line counts parcelas rather than months.

**Blocked by:** 01 (Saldo devedor and Total a pagar across all loans).

**Status:** ready-for-agent

- [ ] For each loan with at least one amortização, the projection rebuilds the
      schedule with none. Interest saved is that schedule's total interest
      minus the recorded schedule's. Parcelas removed is the difference in row
      count. Both are summed across loans.
- [ ] The projection reports whether any amortização exists at all.
- [ ] The card shows the interest saved in reais, and "N parcelas a menos" only
      when N > 0.
- [ ] With no amortizações, the card reads "Nenhuma amortização extraordinária
      ainda" and points to the simulator: a link to the loan's page with one
      active loan, "Simule no financiamento" without a link with several.
- [ ] Tests cover: no amortizações (zero, flagged); a reduce-term amortização
      (interest saved > 0, parcelas removed > 0); only reduce-installment
      amortizações (interest saved > 0, parcelas removed 0); a future-dated
      amortização counted; savings summed across two loans.
