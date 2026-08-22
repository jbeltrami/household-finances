# 03: Categoria on Contas, with inheritance

**What to build:** A user can assign a Categoria when creating or editing a Conta template, and see that Categoria on the bill everywhere it appears — the bills page and every occurrence in the monthly view, including occurrences that have no database row of their own yet.

Critically, changing a template's Categoria moves that bill's entire history, not just its future. Recategorising Claro from Moradia to Consumo must not leave thirty already-paid months stranded in Moradia. That means the paths that turn a virtual occurrence into a real row — marking it paid, overriding its amount, skipping it — must stop copying the template's Categoria onto the new row and leave it to inherit instead. What the user actually paid stays frozen on the row; how the bill is classified follows the template.

The inheritance change is deliberately part of this ticket rather than a follow-up. Shipping the picker without it would leave the app behaving in direct contradiction to ADR 0001.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] The Conta template create form offers an optional Categoria, listing only active outflow Categorias
- [ ] The Conta template edit form offers the same, pre-filled with the current value
- [ ] A Conta's Categoria is visible on the bills page and on its occurrences in the monthly view
- [ ] Occurrences with no database row of their own display their template's Categoria
- [ ] Marking an occurrence paid, overriding its amount, or skipping it leaves the resulting row inheriting rather than carrying a copied Categoria
- [ ] Changing a template's Categoria moves already-paid past occurrences to the new Categoria
- [ ] Changing a template's Categoria leaves the recorded amount of past payments untouched
- [ ] A Conta left without a Categoria still saves and displays
- [ ] Deactivated Categorias do not appear in the picker
