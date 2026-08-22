# 04: The Financiamento report becomes a projection

**What to build:** The monthly PDF has a Financiamentos section — saldo devedor,
progresso, the parcela of that month — and hydrates every loan itself to build it,
with a near-identical copy of the queries ticket 03 replaced. It moves onto the
shared hydration.

The section is a historical snapshot: it reports each loan as of the report
month's end, not as of today, so only extras dated on or before that end shape the
schedule and only parcelas due by then count as paid. That rule is the part worth
protecting, and it becomes testable once the fetching is out of the way.

**Blocked by:** 03.

**Status:** ready-for-agent

- [ ] The report's Financiamento rows are a pure projection over the hydration
- [ ] Its own copy of the fetch-and-group code is deleted
- [ ] An extra dated after the report month does not move that month's saldo
      devedor
- [ ] A parcela paid after the report month does not count as paid in it
- [ ] A loan settled before the report month is left out
- [ ] A loan that had not started by the report month is left out
- [ ] Each of the above is covered by a test
- [ ] The PDF for a past month is unchanged
