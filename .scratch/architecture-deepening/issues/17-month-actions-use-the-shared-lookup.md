# 17: The month actions use the shared lookup

**What to build:** Every action behind the monthly view — creating, editing and
deleting Receitas, Contas and Despesas, and unlocking a month — moves onto the
shared lookup.

Eleven actions, the largest batch. Ticket 15 has already removed the lookup from
three of them by folding it into materialization, so this batch is smaller than it
looks.

**Blocked by:** 15, 16.

**Status:** done

- [x] Every action behind the monthly view uses the shared lookup
- [x] Actions rendered against a form still return their error as state rather
      than throwing
- [x] Adding, editing and deleting a Receita, a Conta and a Despesa all still work
- [x] Marking a Receita received and a Conta paid still work
- [x] Unlocking a past month still works and still records its reason
- [x] An entry dated into another month still lands in that month and still
      refuses when that month is locked
