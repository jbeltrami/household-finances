# 06: Categoria on Financiamentos

**What to build:** A Financiamento can be assigned a Categoria, and it shows on the financing card. Financiamento is a parallel ledger — its installments and extra payments are computed from stored loan parameters rather than recorded as entries — so it has always been invisible to anything that groups spending by Categoria. For most households the mortgage is the single largest outflow, so a spending report that omits it is not a spending report.

This ticket covers only the assignment. Folding financing spend into the category totals belongs to the report piece.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] The Financiamento create form offers an optional Categoria, listing only active outflow Categorias
- [ ] An existing Financiamento's Categoria can be changed
- [ ] The Categoria is visible on the financing card
- [ ] A Financiamento with no Categoria still saves and displays
- [ ] Deactivated Categorias do not appear in the picker
