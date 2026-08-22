# 21: One read for the Categorias and Pagadores

**What to build:** The monthly view needs both the Categorias a user can pick from
and the ones needed only to label existing rows, for both directions, plus the same
pair for Pagadores. It asks for each separately — five reads of two tables — then
rebuilds the same lookup maps by hand.

One module reads each table once and returns both views: the active list for the
pickers, and a lookup covering deactivated ones too, so a Receita filed under a
retired Categoria still shows it.

Direction stays a required argument. The database cannot enforce that an outflow
points at an outflow Categoria, so making it impossible to ask without saying which
side you mean is where that invariant lives.

**Blocked by:** 08.

**Status:** done

- [x] One module returns the outflow Categorias, the income Categorias and the
      Pagadores from two reads
- [x] Each comes with an active list and a lookup that includes deactivated ones
- [x] Direction remains a required argument rather than an optional filter
- [x] The monthly page builds no lookup maps of its own
- [x] Pickers still offer only active Categorias and Pagadores
- [x] A Receita or Despesa filed under a deactivated one still shows it
- [x] Ordering still follows Portuguese collation, so accented names sort where a
      reader expects them
