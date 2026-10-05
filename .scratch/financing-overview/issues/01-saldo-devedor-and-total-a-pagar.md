# 01: Saldo devedor and Total a pagar across all loans

**What to build:** The Financiamentos page shows nothing that adds the loans
together. Give it the first two cards of the overview, above the existing list of
loan cards: **Saldo devedor**, the sum of every active loan's Saldo devedor
today, and **Total a pagar**, what the loans will still cost under the plan as
recorded, with a sub-line "dos quais R$ Y em juros".

This is the tracer bullet for the whole overview. It introduces the new pure
projection over the hydrated ledger, which the later tickets extend. The
projection takes the ledger plus the current year and month, as its sibling
projections do. This ticket also adds the projection's test suite and the cards
strip on the page. See the spec at `docs/specs/financing-overview.md` for the
rules. The glossary entries for both terms are already in `CONTEXT.md`.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] A pure projection over the hydrated ledger returns the Saldo devedor
      total, the Total a pagar and the interest inside it. It makes no new
      queries.
- [ ] Saldo devedor equals the sum of the existing per-loan summary figures, so
      the overview never disagrees with the loan cards.
- [ ] Total a pagar sums the parcela payment of every schedule row not marked
      paid, Vencidas included, plus every amortização extraordinária dated
      after today.
- [ ] The interest figure sums the interest of those same unpaid rows only.
- [ ] Only active Financiamentos count. A fully paid loan contributes zero.
- [ ] A cards strip renders "Saldo devedor" and "Total a pagar" (with the
      "dos quais R$ Y em juros" sub-line) above the loan list, in reais with
      the app's BRL formatter.
- [ ] Card figures are neutral: no red or green.
- [ ] On a phone the cards sit two per row. On larger screens they widen to
      fit.
- [ ] With no active Financiamentos, the existing empty state renders alone,
      with no cards.
- [ ] A new financing-overview test suite covers: several loans summing to the
      per-loan figures; a Vencida counted in Total a pagar; a future-dated
      amortização added to Total a pagar but not subtracted from Saldo
      devedor; a fully paid loan; an empty ledger. It follows the existing
      financing suites (hand-built `HydratedFinancing` fixtures, 2020/2099
      dates instead of a clock).
