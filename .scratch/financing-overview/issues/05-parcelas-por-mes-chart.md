# 05: Parcelas por mês chart

**What to build:** A second chart, below the Saldo devedor chart, showing the
monthly commitment over the same span. It is a stacked step area with one band
per Financiamento, so a Price parcela reads flat, a SAC parcela steps down, and
the month a loan ends shows a clear drop. Bars were rejected because 360 monthly
bars smear at 1–2 px.

It reuses the monthly series, palette and axis from 04, so a month lines up
across both charts and each loan keeps the same colour in both. See the spec at
`docs/specs/financing-overview.md`.

**Blocked by:** 04 (Saldo devedor chart).

**Status:** ready-for-agent

- [ ] A stacked area chart with step interpolation shows the parcela per
      Financiamento for every month of the shared span.
- [ ] It uses the same month domain and yearly ticks as the Saldo devedor chart,
      so the same month sits at the same horizontal position in both.
- [ ] Each loan has the same colour as in the Saldo devedor chart.
- [ ] The tooltip shows the month, each loan's parcela in reais, and the total.
- [ ] The chart fills the content width on a phone and on desktop, and sits
      below the Saldo devedor chart, before the loan list.
- [ ] No new projection logic is needed beyond 04's series. If any is added, it
      is covered in the financing-overview suite.
