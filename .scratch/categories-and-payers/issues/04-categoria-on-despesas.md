# 04: Categoria on Despesas

**What to build:** A user can assign a Categoria when recording a Despesa, and see it on the row afterwards. The Categoria is now an explicit choice rather than something inferred from the icon, so the two become independent: a Despesa can wear a film icon while being filed under Lazer, or carry no icon of its own and display its Categoria's icon instead. Leaving the Categoria blank stays possible, because logging a Despesa quickly is the flow that most needs to stay quick.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] The Despesa form offers an optional Categoria, listing only active outflow Categorias
- [ ] The chosen Categoria is visible on the Despesa row
- [ ] Icon and Categoria are chosen independently; picking one does not change the other
- [ ] A Despesa with no icon of its own displays its Categoria's icon
- [ ] A Despesa with neither an icon nor a Categoria still saves and displays sensibly
- [ ] Existing Despesas keep the Categoria the migration assigned them
- [ ] Deactivated Categorias do not appear in the picker
