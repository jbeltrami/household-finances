# 07: Aggregation on the new model

**What to build:** The existing annual spend-by-category page keeps working, but reads the user's real Categorias rather than the compiled-in names — so a renamed Categoria shows its new name, and each row carries that Categoria's own icon and colour instead of a guessed representative icon.

Getting there means the aggregation must resolve inheritance: an occurrence with no Categoria of its own is classified by its template, so the totals can no longer be computed from entry rows alone.

This ticket also introduces the project's first tests. The aggregation splits into a thin data fetch and a pure fold over the rows it returns — entries, templates and Categorias in, per-Categoria totals out. That fold is the one seam, and all the logic worth protecting lives inside it. Tests exercise it as plain data through its public interface; they should not assert on how queries are built or which helpers were called.

The scope here is the outflow page that already exists. Income breakdowns, Financiamento spend and the date-range picker are the report piece.

**Blocked by:** 03, 04.

**Status:** done

- [x] A test runner is installed and runnable from a package script
- [x] Aggregation is split into a data fetch and a pure fold that takes plain data
- [x] The fold classifies a template-bound row with no Categoria of its own by its template
- [x] The fold lets a row's own Categoria win over its template's when it has one
- [x] The fold counts Contas only when paid, and Despesas always
- [x] The fold excludes skipped rows
- [x] The fold accumulates uncategorised money into its own bucket rather than dropping it
- [x] The fold still reports a deactivated Categoria when historical rows reference it
- [x] Each of the above is covered by a test against the fold's public interface
- [x] The annual page renders each row with its Categoria's own name, icon and colour
- [x] A Categoria renamed on the management screen shows its new name on the page

---

**Done.** Vitest installed (verified it runs under this repo's TS 7.0 before any
test was written — `typescript-eslint` is already broken on it, so "the standard
tool works here" was not safe to assume). `npm test` runs 16 tests; production
build clean.

**The seam moved.** As ticketed it was one extraction. But ticket 03 had put the
inheritance rule inside `getEntriesForMonth` as a closure, and the fold needed
the same rule — so it became two: `resolveCategoryId` (the ADR 0001 rule, two
lines, no dependencies, returning an id so callers do their own lookup) and
`foldCategorySpend` on top of it. `ledger.ts` now calls the shared rule, which
means a reports ticket edited the monthly view. Worth it: two copies of that
rule is exactly how the monthly view and the reports quietly start disagreeing
about which Categoria a bill belongs to.

**The tests were mutation-tested, and one was worthless.** Eight deliberate
breakages of the implementation; seven were caught immediately. The eighth —
deleting the branch that pins uncategorised money last — survived two attempts
to catch it. The reason is worth recording: the fold accumulates in Map
insertion order, and V8's insertion sort only ever passes a *later* element as
the comparator's first argument. A test that accumulated the uncategorised
bucket first therefore never reached the branch at all. It only fails when a
categorised entry is accumulated before the uncategorised one. The test now
arranges for that, with a comment saying why the ordering is load-bearing.

Without mutation testing that assertion would have sat in the suite looking
like coverage while asserting nothing.

**Financiamento is still excluded** from these totals, so the page understates
outflow by the largest line in most households. That is now ticket 09 rather
than an unowned "later", and the page says so in its own subtitle.
