# 05: Financiamento spend becomes a projection

**What to build:** Gastos por categoria counts paid parcelas as Contas and
amortizações extraordinárias as Despesas, both under the Financiamento's own
Categoria. It gets there by hydrating each loan separately — a query pair per
Financiamento — and moves onto the shared hydration from ticket 03.

The fold that consumes these rows already has tests and does not change. What
changes is the number of round-trips behind it and where the schedule is built.

**Blocked by:** 03.

**Status:** ready-for-agent

- [ ] The spend rows are a pure projection over the shared hydration
- [ ] Hydration happens once for the space rather than once per Financiamento
- [ ] The existing spend-row tests still pass against the projection
- [ ] Gastos por categoria reports the same totals for a given year
- [ ] An unpaid parcela still counts as nothing
- [ ] A parcela or extra dated outside the range still counts as nothing
