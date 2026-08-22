# 14: Overriding an amount goes through the module

**What to build:** Changing a Conta's amount for a single month goes through the
shared materialization instead of its own copy of it. Its copy of the ADR-0001
comment goes with it.

**Blocked by:** 13.

**Status:** done

- [x] Overriding the amount on a virtual occurrence goes through the module
- [x] The override writes an exception for that month only, leaving the Conta
      itself and every other month untouched
- [x] The overridden occurrence still shows its Conta's Categoria
- [x] Overriding an already-materialized occurrence still works
- [x] Overriding in a locked month is still refused
- [x] An invalid amount still comes back as an inline error rather than an error
      page
