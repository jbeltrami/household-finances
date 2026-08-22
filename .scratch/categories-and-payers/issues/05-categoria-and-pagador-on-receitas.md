# 05: Categoria and Pagador on Receitas

**What to build:** A Receita gains the two dimensions it has never had: what kind of money it is, and who paid it. Both are optional and independent — the same Pagador can send both a Salário and a Restituição.

With both modelled, the name stops having to carry them. It becomes optional, and a Receita with no name renders as its Pagador and Categoria so the row stays readable in the monthly view. Existing names are left exactly as the user typed them; nothing tries to parse "Freelance XYZ" into its parts, because a wrong guess writes bad data into history nobody will ever audit.

A user adding income from a new client should be able to create that Pagador without abandoning the form.

**Blocked by:** 01, 02.

**Status:** ready-for-agent

- [ ] The Receita form offers an optional Categoria, listing only active income Categorias
- [ ] The Receita form offers an optional Pagador
- [ ] A new Pagador can be created from inside the Receita form without losing the form's other input
- [ ] The name field is optional and a Receita saves without one
- [ ] A Receita with no name displays as its Pagador and Categoria
- [ ] A Receita with no name, no Pagador and no Categoria still displays something sensible
- [ ] A name can still be given, and existing Receita names are unchanged
- [ ] Outflow Categorias are never offered on the Receita form
