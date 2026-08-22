# 06: Categoria on Financiamentos

**What to build:** A Financiamento can be assigned a Categoria, and it shows on the financing card. Financiamento is a parallel ledger — its installments and extra payments are computed from stored loan parameters rather than recorded as entries — so it has always been invisible to anything that groups spending by Categoria. For most households the mortgage is the single largest outflow, so a spending report that omits it is not a spending report.

This ticket covers only the assignment. Folding financing spend into the category totals belongs to the report piece.

**Blocked by:** 01.

**Status:** done

- [x] The Financiamento create form offers an optional Categoria, listing only active outflow Categorias
- [x] An existing Financiamento's Categoria can be changed
- [x] The Categoria is visible on the financing card
- [x] A Financiamento with no Categoria still saves and displays
- [x] Deactivated Categorias do not appear in the picker

---

**Done.** Typecheck and production build clean.

Note on how "change an existing Financiamento's Categoria" was built. There is
no financing edit form and deliberately still isn't: every other column on
`financings` is an input to the amortization schedule, which is computed rather
than stored, so a general edit form could silently reshape a schedule — and the
installments already marked paid against it — by touching `principal` or
`start_date`. Instead the Categoria gets a single-purpose action and a
save-on-change picker on the detail page, which cannot reach anything else.
