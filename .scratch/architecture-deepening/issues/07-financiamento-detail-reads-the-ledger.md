# 07: The Financiamento detail page reads the ledger

**What to build:** The detail page builds one loan's schedule and summary
directly. It reads the shared hydration instead, so a change to how a schedule is
assembled reaches the detail page without anyone remembering it exists.

The amortization table and the simulator keep working from the same schedule they
render today.

**Blocked by:** 03.

**Status:** done

- [x] The page hydrates through the shared module
- [x] Saldo devedor, parcela atual and progresso are unchanged
- [x] The amortization table renders the same rows, with paid parcelas highlighted
      as before
- [x] The simulator still starts from the loan's recorded extras and paid parcelas
