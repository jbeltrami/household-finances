# 14: Overriding an amount goes through the module

**What to build:** Changing a Conta's amount for a single month goes through the
shared materialization instead of its own copy of it. Its copy of the ADR-0001
comment goes with it.

**Blocked by:** 13.

**Status:** ready-for-agent

- [ ] Overriding the amount on a virtual occurrence goes through the module
- [ ] The override writes an exception for that month only, leaving the Conta
      itself and every other month untouched
- [ ] The overridden occurrence still shows its Conta's Categoria
- [ ] Overriding an already-materialized occurrence still works
- [ ] Overriding in a locked month is still refused
- [ ] An invalid amount still comes back as an inline error rather than an error
      page
