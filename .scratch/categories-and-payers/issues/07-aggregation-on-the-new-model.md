# 07: Aggregation on the new model

**What to build:** The existing annual spend-by-category page keeps working, but reads the user's real Categorias rather than the compiled-in names — so a renamed Categoria shows its new name, and each row carries that Categoria's own icon and colour instead of a guessed representative icon.

Getting there means the aggregation must resolve inheritance: an occurrence with no Categoria of its own is classified by its template, so the totals can no longer be computed from entry rows alone.

This ticket also introduces the project's first tests. The aggregation splits into a thin data fetch and a pure fold over the rows it returns — entries, templates and Categorias in, per-Categoria totals out. That fold is the one seam, and all the logic worth protecting lives inside it. Tests exercise it as plain data through its public interface; they should not assert on how queries are built or which helpers were called.

The scope here is the outflow page that already exists. Income breakdowns, Financiamento spend and the date-range picker are the report piece.

**Blocked by:** 03, 04.

**Status:** ready-for-agent

- [ ] A test runner is installed and runnable from a package script
- [ ] Aggregation is split into a data fetch and a pure fold that takes plain data
- [ ] The fold classifies a template-bound row with no Categoria of its own by its template
- [ ] The fold lets a row's own Categoria win over its template's when it has one
- [ ] The fold counts Contas only when paid, and Despesas always
- [ ] The fold excludes skipped rows
- [ ] The fold accumulates uncategorised money into its own bucket rather than dropping it
- [ ] The fold still reports a deactivated Categoria when historical rows reference it
- [ ] Each of the above is covered by a test against the fold's public interface
- [ ] The annual page renders each row with its Categoria's own name, icon and colour
- [ ] A Categoria renamed on the management screen shows its new name on the page
