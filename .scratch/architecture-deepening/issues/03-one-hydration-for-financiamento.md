# 03: One hydration for Financiamento

**What to build:** Everything that reads a Financiamento first has to rebuild it:
fetch the loan, its amortizações extraordinárias and its parcelas pagas, then
compute the schedule. Five places do this, three of them one loan at a time. This
ticket puts one module at that seam.

The hydration answers "what are this space's Financiamentos, fully built" in a
fixed number of queries, handing back each loan with its schedule, its paid
parcela numbers and its extras. Everything above it becomes a pure projection over
that array — the first being the monthly view's items.

Tickets 04–07 move the remaining four consumers across. This one is done when the
monthly view shows the same parcela and the same amortizações it shows today.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] One module hydrates a space's active Financiamentos in a fixed number of
      queries, regardless of how many loans there are
- [x] It returns each loan with its schedule, paid parcela numbers and extras
- [x] The monthly view's Financiamento items become a pure projection over it
- [x] The projection is tested as plain data: the parcela falling in the month,
      the extras dated inside it, and nothing at all for a month before the loan
      begins
- [x] The parcela shown in Contas for a given month is unchanged
- [x] The amortizações shown in Despesas for a given month are unchanged
- [x] Their amounts still reflect recorded extras
