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

**Status:** done

- [x] One definition of Vencida, used by Saldo, the calendar markers and the new
      projection
- [x] A pure projection returns the Vencida Obrigações for a month as rows, with
      the figures folded from them rather than computed separately
- [x] Parcelas de Financiamento are Vencidas on the same terms as Contas
- [x] ~~An Obrigação due today is not Vencida~~ — **corrected during
      implementation.** This criterion contradicted "the calendar dots are
      unchanged": Saldo and the dots deliberately treat a Conta due today as
      money already leaving, while an Aviso at 08:00 must not call it late. The
      cutoff is therefore the caller's decision, not the predicate's — Saldo
      passes today, the Aviso will pass yesterday
- [x] Despesas and amortizações extraordinárias never appear
- [x] Tests cover a Conta and a parcela overdue on the same day, a month with
      nothing Vencida, and both sides of the cutoff boundary
- [x] The monthly view, the calendar dots and the emailed PDF are unchanged
