# 05: Categoria and Pagador on Receitas

**What to build:** A Receita gains the two dimensions it has never had: what kind of money it is, and who paid it. Both are optional and independent — the same Pagador can send both a Salário and a Restituição.

With both modelled, the name stops having to carry them. It becomes optional, and a Receita with no name renders as its Pagador and Categoria so the row stays readable in the monthly view. Existing names are left exactly as the user typed them; nothing tries to parse "Freelance XYZ" into its parts, because a wrong guess writes bad data into history nobody will ever audit.

A user adding income from a new client should be able to create that Pagador without abandoning the form.

**Blocked by:** 01, 02.

**Status:** done

- [x] The Receita form offers an optional Categoria, listing only active income Categorias
- [x] The Receita form offers an optional Pagador
- [x] A new Pagador can be created from inside the Receita form without losing the form's other input
- [x] The name field is optional and a Receita saves without one
- [x] A Receita with no name displays as its Pagador and Categoria
- [x] A Receita with no name, no Pagador and no Categoria still displays something sensible
- [x] A name can still be given, and existing Receita names are unchanged
- [x] Outflow Categorias are never offered on the Receita form

---

**Done.** Typecheck and production build clean. All 20 existing Receitas verified
untouched — nothing was parsed or rewritten.

Those 20 names are the case for this ticket, in the user's own data:
`Sametz | Paycheck 1`, `DEVVV | Salário`, `DEVVV | Salario`, `Restituição IRPF`.
A Pagador and a Categoria crammed into free text, with the same Categoria spelled
two ways. They are now expressible as structure, and splitting them is manual
work the user can do whenever.

Two things beyond the criteria:

- **`createPayerInline` is its own action**, separate from `createPayer`. The
  management-screen version returns only `FormState`, because a `<form action>`
  has nowhere to put a returned row; the inline case needs the new row back so
  the form can select it without navigating. It also reactivates rather than
  duplicating, since the partial unique index only covers active rows and
  silently creating a second "Empresa X" would be worse than reviving the first.

- **The emailed PDF was about to print blank rows.** `reports.ts` cast
  `i.name as string`, which stopped being true the moment the column went
  nullable — and TypeScript believes a cast. The report now composes the same
  label the monthly view shows, so `incomeDisplayLabel` moved from the route's
  `_helpers.ts` into `src/helpers/format.ts`. A blank row in a PDF nobody is
  watching is a worse failure than a blank row on screen.
