# 03: A Projeto has an Orçamento in Items

**What to build:** A Projeto's Orçamento, divided into Items the user names for
that Projeto and nowhere else — Mão de obra and Materiais for a reforma,
Passagens and Hospedagem for a trip — with spending landing against them as it
is recorded. The Projeto page stops being a list and becomes the plan against
reality.

Items are scoped to their Projeto on purpose. Making them Categorias would fill
the global list with buckets that mean nothing outside one effort, and would
stop two Projetos splitting the same money differently.

The plan has to survive being wrong. An Item can be added in month four, can
carry no budget at all when the number is genuinely unknowable, and can go over
without the app refusing it.

**Blocked by:** 02.

**Status:** ready-for-agent

- [ ] Items can be created, renamed and deleted inside a Projeto
- [ ] An Item may carry a budget amount or none, and one with none still
      collects spending
- [ ] An Item can be added at any point in a Projeto's life
- [ ] Choosing a Projeto on either Despesa form offers that Projeto's Items
- [ ] Spending attributed to a Projeto but no Item accumulates in its own
      labelled bucket rather than vanishing from the total
- [ ] Each Item shows its Orçamento against what it has consumed
- [ ] An Item over its Orçamento reports the overage rather than clamping
- [ ] Over-budget renders amber or as plain text, never red
- [ ] Deleting an Item sets `budget_line_id` null: the spending keeps its
      Projeto, stays in the monthly view, and moves to the unassigned bucket
- [ ] Renaming an Item does not fracture the history filed under the old name

## Further notes

Red is reserved. `CONTEXT.md` is explicit that red on a row means **Vencida**
and that this is the app's single urgency signal. Being over budget is not
urgent — it is just true, and there is nothing the user can pay to fix it.
