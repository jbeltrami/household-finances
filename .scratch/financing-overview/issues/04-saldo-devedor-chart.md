# 04: Saldo devedor chart

**What to build:** Below the cards, a chart of the Saldo devedor over the whole
life of the loans. It is a stacked area with one band per active Financiamento,
from the first loan's first parcela to the last loan's last, with a marker at
today labelled "hoje". Hovering or tapping a month shows each loan's value and
the month's total.

The chart draws **the plan**: the schedule as recorded, future-dated
amortizações included. It does not reconstruct when past parcelas were really
paid. When something is Vencida, the curve at "hoje" sits slightly below the
Saldo devedor card. This is accepted.

This ticket adds Recharts, the app's first charting library, as a client
component, and extends the overview projection with the monthly series that both
charts will share. See the spec at `docs/specs/financing-overview.md`, and the
colour rule in `CONTEXT.md`.

**Blocked by:** 01 (Saldo devedor and Total a pagar across all loans).

**Status:** ready-for-agent

- [ ] The projection returns one ordered list of months, from the earliest
      first parcela to the latest last parcela across all loans. For each month
      and each loan, it holds the balance after that month's parcela and that
      month's parcela payment.
- [ ] A loan contributes nothing before its first parcela or after its last.
      Loans are identified by id and name, in ledger order.
- [ ] Recharts is added as a dependency. The chart is a client component fed
      plain data from the server page.
- [ ] A stacked area chart shows the Saldo devedor per Financiamento across the
      full span, with no zoom or window.
- [ ] A reference marker labelled "hoje" sits at the current month.
- [ ] The time axis ticks by year.
- [ ] The tooltip shows the month, each loan's value in reais, and the total.
- [ ] Each loan gets a colour from a fixed categorical palette, assigned by its
      position in the ledger. Neither the loan's Categoria colour nor red or
      green is used.
- [ ] The chart fills the content width on a phone and on desktop, and sits
      between the cards and the loan list.
- [ ] Tests cover the series: span across loans with different start and end
      months; nothing outside a loan's own schedule; a future-dated amortização
      reflected in later balances; ledger order preserved.
