# 04: The words for a filtered day

Type: grilling
Status: resolved
Blocked by: none

## Question

Four pieces of pt-BR copy have no precedent in this codebase, because nothing
here has ever filtered a list by an in-page selection and had to say so. There
is no "clear filter" string anywhere; the only "Limpar" is a form reset in the
amortisation simulator.

1. **The active-filter affordance.** Names the selected day and offers the way
   out. Settle the date format too: `12 de setembro` (there is a
   `formatMonthLabel` in `helpers/date.ts`) or `12/09`.
2. **The empty state**, for a selected day with no Obrigação. Existing siblings
   read "Sem contas neste mês." (`BillsSection.tsx:104`) and "Nenhuma receita
   registrada neste mês." — so the register is terse and starts with Sem or
   Nenhuma.
3. **The subordinate month line** beneath the day's headline figure — the shape
   sketched while charting was "de R$ 4.230,00 no mês".

4. **The `role="status"` line**, added by
   [Announcing the filtered list](05-announcing-the-filtered-list.md). WCAG's own
   examples are counts ("No results returned"), and the text must be swapped
   rather than emptied when the filter clears — so there is a string for the
   cleared state too, not only for the filtered one. Whether this is one string
   or two depends on
   [How the filtered card announces itself](06-how-the-filtered-card-announces-itself.md),
   which is why this ticket now waits on it.

Underneath all four sits one domain question: **does the UI ever say
"Obrigação"?** `CONTEXT.md` defines it as the class covering Contas and parcelas,
but the card is titled "Contas" and the user may never have met the word. If the
copy must avoid it, say what a day's worth of Contas-and-parcelas is called in
front of a user — and if that reveals a gap, `CONTEXT.md` is the place to fix it.

Consult `domain-modeling`; update `CONTEXT.md` inline if a term is resolved.

## Answer

**Written in place**, since the redraw replaced the filtered card with a widget
and shrank the copy to two strings plus a heading:

- Heading: the day itself, via a new `formatDayLabel` in `helpers/date.ts` —
  `10 de setembro`, year omitted because the calendar beside it shows the month.
- Count line: `1 conta vence` / `N contas vencem`.
- Empty state: `Nada vence neste dia.` — matching the terse register of
  `Sem contas neste mês.` (`BillsSection.tsx:104`).

**The domain question is settled, and the glossary was wrong to imply
otherwise.** The copy says "conta" while the figure sums Obrigações, so a day
whose only outflow is a parcela de Financiamento reads as "1 conta vence". I
first recorded this as an imprecision to revisit. It is not one: in colloquial
Brazilian Portuguese, and specifically in the context of paying what is due,
"conta" covers a parcela perfectly well. The strict Conta/Financiamento
distinction is a *coding* distinction — it exists because the two have different
structures, not because a user would ever draw it while looking at a calendar.

`CONTEXT.md` now carries both senses under **Contas**: strict in code, loose in
the interface, with Obrigação reserved for the times the interface genuinely
needs the precise class. `DayTotalCard` carries a comment saying the same, so
the copy does not get "corrected" by someone reading only the strict sense.
