# 11: The Insights averages read the shared fold

**What to build:** Insights averages Contas and Despesas over a trailing window by
walking each month and summing entries itself. It reads the shared module instead,
one month at a time.

Nothing changes on screen yet. Financiamento stays excluded — deliberately, and
now visibly, because the module takes it as an argument this caller passes empty
rather than omitting by accident. Ticket 12 decides whether to keep doing that.

**Blocked by:** 08.

**Status:** done

- [x] The per-month sums come from the shared module
- [x] Financiamento is excluded by an explicit argument, not by omission
- [x] The averages shown for a 3, 6 and 12 month window are unchanged
- [x] The window still shrinks to however much history the space actually has
- [x] A space with no data at all still reports no data rather than dividing by
      zero
