# 06: The Financiamentos list reads the ledger

**What to build:** The Financiamentos page hydrates each loan in its own pair of
queries to work out saldo devedor, progresso and parcela atual, so the page costs
more the more loans a user has. It reads the shared hydration instead.

The summary arithmetic — what is still owed today, given ordinary amortização from
paid parcelas and every extra already made — moves with it and gets tests.

**Blocked by:** 03.

**Status:** done

- [x] The page hydrates through the shared module rather than per Financiamento
- [x] The summary becomes a pure projection, tested as plain data
- [x] An extra dated in the future does not reduce today's saldo devedor
- [x] A recorded extra reduces the balance immediately, before any parcela is
      marked paid
- [x] Parcela atual is the next unpaid parcela, and zero once the loan is settled
- [x] Every card shows the figures it shows today
