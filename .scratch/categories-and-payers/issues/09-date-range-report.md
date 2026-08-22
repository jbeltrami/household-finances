# 09: The date-range report

**What to build:** The report this whole feature exists for. A user picks a
range and sees where money went and where it came from over it: outflows split
by Categoria, Receitas split by Categoria and by Pagador.

This is the piece the annual page at `/reports/categories` grows into, not a
second report beside it — two pages answering nearly the same question is how a
reports section rots. Defaulting the range to the current calendar year gives
existing users the same view on the same URL.

Two things deliberately left out of earlier tickets land here, because both
need the range machinery this ticket builds:

- **Financiamento spend.** Installments and extra payments are computed from
  loan parameters per month rather than stored as entries, so a range means
  building a schedule for every month in it. Ticket 06 assigned Financiamentos
  a Categoria precisely so this could fold them in. Until it does, the report
  understates total outflow by what is usually a household's largest line —
  a known gap, not a defect.
- **The Receitas side.** Ticket 05 put Categoria and Pagador on income; nothing
  reads them yet.

**Blocked by:** 07.

**Status:** ready-for-agent

- [ ] A range is picked by month boundaries — two `<input type="month">`, de/até
- [ ] The range defaults to the current calendar year
- [ ] The range is in the URL, so a view can be linked and survives a reload
- [ ] Outflows are grouped by Categoria, with the Contas/Despesas split beneath
      the merged total
- [ ] Financiamento installments and extra payments count toward their
      Financiamento's Categoria
- [ ] Receitas are grouped by Categoria
- [ ] Receitas can also be grouped by Pagador
- [ ] Only received Receitas count — the report is a retrospective, and mixing
      expected income against actual spend produces a net figure that flatters
      reality
- [ ] Money with no Categoria appears as its own bucket rather than being hidden
- [ ] Deactivated Categorias and Pagadores still label the history filed under
      them
- [ ] The aggregation is a pure fold like ticket 07's, tested the same way
- [ ] `/reports/categories` becomes this page; no second route is added

## Further notes

Ticket 07 established the shape: a thin fetch and a pure fold taking plain
arrays. Follow it. The financing side will not fit that mould as neatly —
schedules are computed, not fetched — so the honest split is probably a fetch
that materialises financing rows into the same `SpendEntry` shape before
handing everything to one fold.

Grouping Receitas two ways (Categoria, Pagador) is one fold parameterised by
which key it groups on, not two folds.
