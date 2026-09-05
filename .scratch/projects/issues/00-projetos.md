# 01: A Projeto plans and tracks a bounded effort

**What to build:** A **Projeto** — a finite, named effort money is spent toward,
carrying an **Orçamento** divided into **Items**, against which spending is
tracked as it happens. Reforma da casa, Viagem à Espanha. The full spec is
`docs/specs/projects.md`; this ticket is the pointer to it, not a second copy.

The app answers "what happens to my money this month" and cannot answer "what
is this reforma costing me". A reforma is one effort with one budget paid over
eight months, in pieces that look unrelated met one month at a time. Users
already compensate by cramming the effort into the entry name — "Reforma -
pedreiro", "Reforma - sofá 3/10" — which is the same failure that motivated
Categorias: the app holds the information and cannot count it.

The load-bearing constraint is that **a Projeto stores intent and never stores
money**. Orçamento, Items and revisions live with the Projeto; the spending
stays in the ledger as ordinary Despesas and Contas. The Projeto page is a join,
not a second place money lives. This is ADR 0005, and it is what keeps the app
a cash-flow tracker: Saldo, the Resumo, the CalendarStrip and `/insights` are
untouched, and planned-but-unspent money never reaches a monthly figure.

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] A Projeto can be created, renamed, given an icon and colour, archived and
      un-archived; Arquivado hides it from pickers and changes no figure
- [ ] An archived Projeto's name is reusable, via the partial-unique-on-active
      index pattern `0012` established
- [ ] A Projeto with spending against it cannot be deleted, enforced in the
      action layer rather than by `on delete restrict`
- [ ] An Orçamento is divided into Items the user names, scoped to that Projeto
      and absent from the global Categoria list
- [ ] An Item may carry a budget amount or none, and may be added at any point
      in the Projeto's life
- [ ] An Item may point at a Categoria, which its spending inherits, so money
      inside a Projeto is never classified twice
- [ ] Categoria resolves template first, then Item, then uncategorised —
      extending ADR 0001 rather than changing it
- [ ] A Despesa can be attributed to a Projeto and an Item from both the monthly
      view and the Projeto page, through one shared action
- [ ] The Projeto picker is absent from the monthly Despesa form when the space
      has no Ativo Projeto
- [ ] Spending attributed to a Projeto but no Item accumulates in its own bucket
      rather than vanishing from the total
- [ ] An Item can be deleted while spending points at it; that spending keeps
      its Projeto and never leaves the monthly view
- [ ] A parcelamento and a Financiamento can each be attached to a Projeto, and
      every occurrence of an attached parcelamento belongs to it without being
      tagged by hand
- [ ] Comprometido is measured all-in and consumes the Orçamento: actual amounts
      for what has happened, the modelled remainder for what has not, the
      whole-life schedule total for an attached Financiamento
- [ ] Pago and A pagar are reported beside Comprometido, and no figure on the
      Projeto page contradicts the same row in the monthly view
- [ ] An Item over its budget reports the overage rather than clamping, rendered
      in a colour that is not red
- [ ] A revision row is written whenever the Orçamento total changes, coalesced
      per save, reason prompted and skippable, with the baseline written at
      creation
- [ ] The Projeto page carries the Items with their figures, the unassigned
      bucket, the revision timeline, an a-pagar tab with parcelas restantes and
      mês final, and a per-month strip
- [ ] The monthly PDF gains a Projetos section; the Aviso appends the Projeto
      name to the line without changing which Obrigações it selects
- [ ] Migration `0017` is additive only: new tables, new nullable columns, no
      drops and no NOT NULL changes
- [ ] RLS on every new table follows the established pattern — SELECT via
      `can_read_space`, writes via `is_active_member`

## Further notes

**Seams.** One new: a project rollup split the way `category-reports` is split,
a thin Supabase fetch and a pure fold over plain arrays, with financing
flattened into a common row shape before the fold so it needs no knowledge of
amortization. One extended: `foldCategorySpend` gains the Items for the
resolution order. One deliberately untouched and asserted as such:
`summarizeMonth` must produce identical `MonthTotals` for a Despesa with and
without a Projeto, and that test is the invariant the whole design rests on.

**The thing that looks like a bug.** A Projeto's Comprometido counts money that
has not left the account, so a Projeto can report 52.000 consumed in a month
where Saldo shows 4.200 leaving. Different questions, not different answers.
Measuring on cash-paid instead was rejected because a 30.000 sofa em 10x would
leave the Reforma looking 27.000 under budget for nine months.

**Two ADRs offered and not written**, both noted in the spec: one on Comprometido
consuming the Orçamento, one on the Categoria resolution order adding a third
meaning to a NULL `category_id`.

`docs/handoff/projects.md` records how the design was reached and what was
rejected at each fork. Read it before reopening any of the decisions above.
