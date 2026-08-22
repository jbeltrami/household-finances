# 03: Categoria on Contas, with inheritance

**What to build:** A user can assign a Categoria when creating or editing a Conta template, and see that Categoria on the bill everywhere it appears — the bills page and every occurrence in the monthly view, including occurrences that have no database row of their own yet.

Critically, changing a template's Categoria moves that bill's entire history, not just its future. Recategorising Claro from Moradia to Consumo must not leave thirty already-paid months stranded in Moradia. That means the paths that turn a virtual occurrence into a real row — marking it paid, overriding its amount, skipping it — must stop copying the template's Categoria onto the new row and leave it to inherit instead. What the user actually paid stays frozen on the row; how the bill is classified follows the template.

The inheritance change is deliberately part of this ticket rather than a follow-up. Shipping the picker without it would leave the app behaving in direct contradiction to ADR 0001.

**Blocked by:** 01.

**Status:** done

- [x] The Conta template create form offers an optional Categoria, listing only active outflow Categorias
- [x] The Conta template edit form offers the same, pre-filled with the current value
- [x] A Conta's Categoria is visible on the bills page and on its occurrences in the monthly view
- [x] Occurrences with no database row of their own display their template's Categoria
- [x] Marking an occurrence paid, overriding its amount, or skipping it leaves the resulting row inheriting rather than carrying a copied Categoria
- [x] Changing a template's Categoria moves already-paid past occurrences to the new Categoria
- [x] Changing a template's Categoria leaves the recorded amount of past payments untouched
- [x] A Conta left without a Categoria still saves and displays
- [x] Deactivated Categorias do not appear in the picker

---

**Done.** Typecheck and production build clean. Inheritance verified against real
production rows: 80 template-bound entries, 20 of which resolve a Categoria
through their template and 0 of which carry their own — so recategorising any
Conta moves its whole history as one block, with amounts untouched because those
live on the row.

Two things this ticket also fixed that were not in its criteria:

- **The clobbering bug.** `parseTemplateFields` derived the legacy `category`
  text from the icon on every save, so an ordinary edit silently overwrote it —
  one template's "Occam" had already become "Financeiro" this way. The
  derivation is gone and `category` is now omitted from the update payload
  entirely, freezing it as the read-only record it is until 0013.
- **An `[object Object]` render.** `ResolvedEntry.category` went from a string to
  an object, and the Despesa row interpolated it into a template literal.
  TypeScript permits that, so the build stayed green while the UI would have
  shown `[object Object]`.

**Known temporary regression, resolved by ticket 07.** The annual report at
`/reports/categories` still aggregates the old `category` text. Newly
materialised bill rows no longer write it, so bills paid from now on will read
as "Sem categoria" on that page until the aggregation moves to `category_id`.
This is the expand half of expand–contract behaving as expected, not a defect.
