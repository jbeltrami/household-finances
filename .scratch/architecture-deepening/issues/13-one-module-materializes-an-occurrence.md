# 13: One module materializes an occurrence

**What to build:** A Conta recorrente has no row until the user does something to
one of its occurrences — pays it, changes its amount for that month, or ignores
it. Turning an occurrence into a row is the move the whole ledger model rests on,
and it is currently written out once per action, guarded by the same comment
copied three times.

This ticket puts it behind one interface. The module takes a mutation target —
either a row that already exists or a template plus a date — refuses if the month
is locked, copies the Conta's name, amount and currency onto the new row, and
deliberately leaves its Categoria unset so the occurrence keeps inheriting from
the Conta. It returns the coordinates the caller needs to revalidate.

Ignoring an occurrence moves onto it first, as the simplest of the three. Tickets
14 and 15 follow.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] One module turns a mutation target into a row and returns its space, year
      and month
- [x] It refuses when the target month is locked
- [x] The row it writes leaves Categoria unset, so the occurrence inherits from
      its Conta, per ADR-0001
- [x] Ignoring an occurrence goes through it
- [x] Ignoring a virtual occurrence still removes it from the month
- [x] Ignoring an already-materialized occurrence still works, as does undoing it
- [x] A paid occurrence still cannot be ignored
- [x] A one-off Despesa still cannot be ignored
