# 02: Parcelas deste mês and Quitação

**What to build:** Two more cards in the overview. **Parcelas deste mês** is how
much of this month's money goes to parcelas: every parcela falling due in the
current calendar month, paid or not. That matches what the monthly view lists
among its contas. **Quitação** is the month and year in which the last parcela of
the last loan falls due, and reads "Quitado" once every parcela is paid.

Extend the overview projection from 01 and its test suite. See the spec at
`docs/specs/financing-overview.md`.

**Blocked by:** 01 (Saldo devedor and Total a pagar across all loans).

**Status:** ready-for-agent

- [ ] The projection returns Parcelas deste mês: the sum of the parcela payment
      over every schedule row dated in the given year and month, regardless of
      paid state.
- [ ] A Vencida parcela from an earlier month is not part of Parcelas deste
      mês.
- [ ] The projection returns the Quitação month (the latest last schedule row
      across loans), or reports the loans as settled when every row of every
      loan is marked paid. It never uses Saldo devedor reaching zero, which
      rounding can miss.
- [ ] The cards strip shows "Parcelas deste mês" in reais and "Quitação" as an
      abbreviated Portuguese month with a four-digit year (e.g. "mar/2041"),
      or "Quitado".
- [ ] Tests cover: paid and unpaid rows in the given month both counted; an
      earlier Vencida excluded; a month in which no loan has a parcela
      (zero); the latest last-row month across several loans; every parcela
      paid giving settled.
