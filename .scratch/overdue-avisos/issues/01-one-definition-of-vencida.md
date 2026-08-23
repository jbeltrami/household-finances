# 01: One definition of Vencida

**What to build:** Whether an Obrigação is Vencida is currently decided in two
places, and the daily Aviso is about to become a third. Both existing copies live
in the month-summary module — one feeding _Saldo até o momento_, one reddening the
calendar dot — and both spell out the same predicate over Contas and parcelas de
Financiamento.

Give the predicate a single home, and add the projection the Aviso needs beside
its siblings: the Vencida rows themselves, not just how many and how much, since
the email names each one. Nothing the user can see changes.

**Blocked by:** None (can start immediately, in parallel with 02).

**Status:** ready-for-agent

- [ ] One definition of Vencida, used by Saldo, the calendar markers and the new
      projection
- [ ] A pure projection returns the Vencida Obrigações for a month as rows, with
      the figures folded from them rather than computed separately
- [ ] Parcelas de Financiamento are Vencidas on the same terms as Contas
- [ ] An Obrigação due today is not Vencida
- [ ] Despesas and amortizações extraordinárias never appear
- [ ] Tests cover a Conta and a parcela overdue on the same day, a month with
      nothing Vencida, and the due-today boundary
- [ ] The monthly view, the calendar dots and the emailed PDF are unchanged
