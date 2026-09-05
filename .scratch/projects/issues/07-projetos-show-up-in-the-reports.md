# 07: Projetos show up in the reports

**What to build:** The reports the app already sends and renders learn about
Projetos: the monthly PDF says what each Projeto consumed that month, the Aviso
names the Projeto a late parcela belongs to, `/insights` says which Projetos fell
inside the window it is averaging, and the Projeto page gains a strip showing
what it cost month by month.

None of this changes a number. `/insights` keeps counting project spending,
because a 52.000 reforma genuinely does push the ratios outside the cenário ideal
for months and that is true. Naming the Projetos makes the reading explicable;
hiding real spending to improve a ratio is how a planner starts lying to its
user.

**Blocked by:** 05.

**Status:** ready-for-agent

- [ ] The monthly PDF gains a Projetos section listing what each Projeto
      consumed that month
- [ ] The Aviso appends the Projeto name to the line, as "Sofá 3/10 (Reforma da
      casa)"
- [ ] Which Obrigações the Aviso selects, and when it fires, are unchanged
- [ ] `/insights` names the Projetos that fell inside the selected window
- [ ] The `/insights` figures themselves are unchanged
- [ ] The Projeto page shows what the Projeto cost in each month

## Further notes

The Aviso change is deliberately cosmetic. `CONTEXT.md` defines an Aviso as an
email that names each Obrigação Vencida rather than only counting them, so
naming the Projeto is more of what it already does, not different behaviour.

The per-month strip is nearly free — the rows are already in the rollup — and it
answers something the monthly view does not. The month view says what March cost
in total; the strip says what the Reforma cost in each of its eight months.
