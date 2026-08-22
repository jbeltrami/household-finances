# 04: Categoria on Despesas

**What to build:** A user can assign a Categoria when recording a Despesa, and see it on the row afterwards. The Categoria is now an explicit choice rather than something inferred from the icon, so the two become independent: a Despesa can wear a film icon while being filed under Lazer, or carry no icon of its own and display its Categoria's icon instead. Leaving the Categoria blank stays possible, because logging a Despesa quickly is the flow that most needs to stay quick.

**Blocked by:** 01.

**Status:** done

- [x] The Despesa form offers an optional Categoria, listing only active outflow Categorias
- [x] The chosen Categoria is visible on the Despesa row
- [x] Icon and Categoria are chosen independently; picking one does not change the other
- [x] A Despesa with no icon of its own displays its Categoria's icon
- [x] A Despesa with neither an icon nor a Categoria still saves and displays sensibly
- [x] Existing Despesas keep the Categoria the migration assigned them
- [x] Deactivated Categorias do not appear in the picker

---

**Done.** Typecheck and production build clean.

Two things worth recording beyond the criteria:

- **`updateEntry` got a guard.** It can reach template-bound rows as well as
  one-off Despesas, and on a template-bound row `category_id` NULL means
  *inherit*. Writing one from this form would pin that occurrence and break
  ADR 0001's guarantee. Only rows with `template_id IS NULL` get their
  Categoria set here. Today only ExpenseEntryRow calls it and only for
  one-offs, but the guard makes the invariant explicit instead of resting on
  that staying true.

- **A shared `CategorySelect` replaced three inline dropdowns**, and fixed a
  bug in the bill form on the way: a Conta filed under a Categoria that was
  later deactivated had a `defaultValue` matching no option, so the browser
  selected "Sem categoria" and the next save silently stripped it. The
  component renders the current value as a clearly-labelled extra option, so
  editing is non-destructive while deactivated Categorias still cannot be
  chosen for anything new. Ticket 05 and 06 reuse it.
