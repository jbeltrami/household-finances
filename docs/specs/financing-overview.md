# Visão geral dos Financiamentos

**Status:** ready-for-agent

## Problem Statement

The Financiamentos page lists each loan on its own card: its parcela atual, how
many parcelas are paid, and its Saldo devedor. That answers questions about one
loan at a time. It cannot answer the questions a household with more than one
Financiamento actually asks:

- How much do I owe across all of them, right now?
- What will they still cost me, interest included, if I just keep paying?
- How much of this month's money goes to parcelas?
- When will I be free of all of them?
- Is paying ahead worth it, and how much has it saved me so far?

The data to answer every one of these is already loaded: the page hydrates each
active Financiamento with its full schedule, its paid parcelas and its
amortizações extraordinárias. Nothing adds them up, and nothing shows how any of
it changes over time. A long mortgage is a thirty-year shape, and the page shows
only a single point on it.

## Solution

Put an overview above the existing list on the Financiamentos page, made of
five summary cards followed by two charts. Together they describe all active
Financiamentos as one.

**The cards:**

1. **Saldo devedor**: the sum of every loan's Saldo devedor today. This is the
   same figure each loan card already shows, added up.
2. **Total a pagar**: what the loans will still cost if the plan as recorded
   runs to term. A sub-line shows how much of it is interest ("dos quais R$ Y
   em juros"), so the gap between owing and paying is visible.
3. **Parcelas deste mês**: the sum of the parcelas falling due in the current
   calendar month, paid or not. This matches what the monthly view lists among
   its contas.
4. **Quitação**: the month and year in which the last parcela of the last loan
   falls due. Once every parcela is paid it reads "Quitado".
5. **Economia com amortizações**: the interest that amortizações extraordinárias
   have removed compared with the same loans without them, plus how many
   parcelas they removed. Before any amortização exists, the card invites the
   user to simulate one instead.

**The charts:**

1. **Saldo devedor over time**: a stacked area with one band per
   Financiamento, running from the first loan's first parcela to the last
   loan's last, with a marker at today.
2. **Parcelas por mês over time**: a stacked step area over the same span, one
   band per Financiamento. It shows the monthly commitment shrinking as SAC
   parcelas fall, and dropping when a loan ends.

Both charts draw **the plan**: the schedule as recorded, including any
amortização extraordinária dated in the future. They do not reconstruct what
actually happened in each past month. The Saldo devedor card stays factual and
counts only amortizações already made.

## User Stories

### Seeing the whole picture

1. As a user with several Financiamentos, I want to see my Saldo devedor across
   all of them as one figure, so that I know how much I owe without adding up
   cards in my head.
2. As a user, I want the overview Saldo devedor to equal the sum of the figures
   on the individual loan cards, so that the two never disagree.
3. As a user, I want to see what my loans will still cost me in total, so that I
   understand their real cost and not only the principal left.
4. As a user, I want the interest inside that total called out separately, so
   that I can see how much of what I will pay is interest.
5. As a user, I want Total a pagar to include parcelas that are Vencidas, so
   that being late never makes my loans look cheaper.
6. As a user who has recorded an amortização extraordinária for a future date,
   I want Total a pagar to include that amount, so that the total reflects all
   the money I have committed to paying.
7. As a user, I want Saldo devedor to ignore amortizações dated in the future,
   so that the figure states what I owe today, not what I plan to owe.
8. As a user, I want to see how much this month's parcelas add up to, so that I
   can plan the month's cash.
9. As a user, I want Parcelas deste mês to count a parcela I have already paid,
   so that the figure does not shrink as I pay during the month.
10. As a user with a Vencida parcela from last month, I want Parcelas deste mês
    to leave it out, so that the figure is about this month only. The Vencida
    signal elsewhere already chases it.
11. As a user, I want to see the month and year I will be free of every
    Financiamento, so that I have a concrete horizon.
12. As a user who has paid everything off, I want Quitação to say "Quitado", so
    that the page says so rather than showing a past date.

### Paying ahead

13. As a user who has made amortizações extraordinárias, I want to see how much
    interest they have saved me, so that I know whether paying ahead was worth
    it.
14. As a user whose amortizações shortened a loan, I want to see how many
    parcelas they removed, so that I see the saving in time as well as in money.
15. As a user whose amortizações only lowered the parcela, I want the time line
    left out, so that the card does not report "0 parcelas a menos".
16. As a user who has recorded a future amortização, I want its saving counted,
    so that I can record a plan and see what it would do before paying.
17. As a user who has not made an amortização yet, I want the card to point me
    to the simulator, so that I can find out what paying ahead would save.
18. As a user with a single Financiamento, I want that invitation to link
    straight to the loan's page, where the simulator is, so that it is one
    click away.
19. As a user with several Financiamentos, I want that invitation to tell me to
    simulate inside a loan, so that I know where to go even though there is no
    single loan to link to.

### Seeing it change over time

20. As a user, I want a chart of my Saldo devedor across the whole life of my
    loans, so that I can see the shape of my debt and where I am on it.
21. As a user with several loans, I want each loan as its own band in that
    chart, so that I can see which one makes up most of what I owe and when each
    one ends.
22. As a user, I want a marker at today on the chart, so that I can tell past
    from future at a glance.
23. As a user, I want a chart of the parcelas per month across the same span, so
    that I can see when my monthly commitment drops.
24. As a user with a SAC loan, I want the parcelas chart to show the parcela
    falling month by month, so that the decreasing schedule is visible.
25. As a user, I want the parcelas chart to show a clear step when a loan ends,
    so that I can see the month my budget gets that money back.
26. As a user, I want the two charts to share the same time axis, so that a
    point in one lines up with the same month in the other.
27. As a user, I want to hover or tap a month and see each loan's value and the
    total for that month, so that I can read exact figures and not only the
    shape.
28. As a user, I want years on the time axis, so that a thirty-year span stays
    readable.
29. As a user, I want each loan to keep the same colour in both charts, so that
    I can follow it from one chart to the other.
30. As a user, I want the chart colours to carry no meaning beyond which loan a
    band is, so that they are never read as good news, bad news or lateness.
31. As a user who has recorded a future amortização, I want the charts to show
    the loan after that payment, so that I can see what the plan does to the
    curve.

### Layout and states

32. As a user, I want the cards first, then the charts, then my list of loans,
    so that the page goes from summary to detail.
33. As a user on a phone, I want the cards two per row and the charts at full
    width, so that everything is readable without scrolling sideways.
34. As a user with a single Financiamento, I want the overview shown anyway, so
    that the page keeps its shape when I add a second loan, and so that the
    charts and Quitação still tell me something the loan card does not.
35. As a user with no Financiamentos, I want the existing empty state unchanged,
    so that the page invites me to create my first loan rather than showing
    empty cards and charts.
36. As a user who has removed a Financiamento, I want it left out of the
    overview, so that the totals match the list beneath them.
37. As a user whose loan is fully paid but not removed, I want it to add nothing
    to what I owe while it still appears in the charts' history, so that paying
    it off reads as an achievement and not as missing data.
38. As a user, I want the card figures in a neutral colour, so that a debt
    figure does not borrow the red that means money leaving or Vencida.
39. As a user, I want every figure in reais using the app's usual formatting, so
    that the overview reads like the rest of the app.

## Implementation Decisions

### Vocabulary

`CONTEXT.md` has been updated during design and is the reference for the
terms:

- **Saldo devedor**: principal not yet paid back. It is never shortened to
  "Saldo", which always means the month's Saldo.
- **Total a pagar**: every unpaid parcela, Vencidas included, plus every
  amortização extraordinária recorded for a future date. Equivalently, the
  Saldo devedor plus the interest still to come under the plan as recorded.
- **Colour**: stocks (Saldo devedor, Total a pagar) stay neutral, and a chart's
  series colour identifies a Financiamento and nothing else.

### Which loans count

Only active Financiamentos, exactly the set the page already loads and lists. A
removed (deactivated) loan is excluded entirely. A loan whose parcelas are all
paid is still active: it contributes zero to the Saldo devedor, Total a pagar
and Parcelas deste mês, but its schedule still appears in both charts.

### The projection

One new pure projection sits beside the existing ones in the financing helper
module (the per-loan summary, the month items, the monthly report). It takes the
hydrated ledger the page already fetches, plus the current year and month, and
returns everything the overview displays. Taking the year and month as
arguments follows how the month-items and report projections take theirs.
"Today", for deciding which amortizações have already happened, is read the same
way the existing per-loan summary reads it.

It needs no new queries and no schema change. The hydrated ledger already holds
each loan's schedule (built from every recorded amortização), its paid parcela
numbers and its amortizações.

The rules for each output:

- **Saldo devedor**: the sum of each loan's existing per-loan summary figure.
  Reusing that figure guarantees user story 2.
- **Total a pagar**: for each loan, the sum of the parcela payment over every
  schedule row whose number is not marked paid, plus the amount of every
  amortização dated after today.
- **Juros (inside Total a pagar)**: for each loan, the sum of the interest over
  the same unpaid schedule rows.
- **Parcelas deste mês**: the sum of the parcela payment over every schedule row
  dated in the given year and month, regardless of paid state.
- **Quitação**: the latest date among each loan's last schedule row, reduced to
  month and year. When every row of every loan is marked paid, the projection
  reports the loans as settled instead of a date.
- **Economia com amortizações**: for each loan with at least one amortização,
  rebuild its schedule with no amortizações (the schedule builder is pure and
  cheap). The interest saved is the no-amortização schedule's total interest
  minus the recorded schedule's total interest. The parcelas removed is the
  difference in row count. Both are summed across loans. The projection also
  reports whether any amortização exists at all, so the card can choose between
  its figure and its invitation.
- **Chart series**: one ordered list of months, from the earliest first parcela
  to the latest last parcela across all loans. For each month and each loan, it
  holds the balance after that month's parcela and that month's parcela
  payment. A loan contributes nothing before its first parcela or after its
  last. Each loan is identified by its id and name, in ledger order.

The shape of the projection's result is left to the implementer, subject to the
rules above and to it being plain data the client chart component can receive
as props.

### Page composition

The Financiamentos page stays a server component. It already fetches the ledger.
It calls the new projection once and passes the result down:

- **A summary-cards component** renders the five cards from the projection's
  card figures. Labels: "Saldo devedor", "Total a pagar" with the
  "dos quais R$ Y em juros" sub-line, "Parcelas deste mês", "Quitação"
  (month/year, or "Quitado"), and "Economia com amortizações" with
  "N parcelas a menos" shown only when N > 0. Its empty state reads "Nenhuma
  amortização extraordinária ainda". With one active loan it links to that
  loan's detail page to simulate; with several it says "Simule no
  financiamento" and has no link.
- **A charts component** (client) renders both charts from the series.
- **The order** is: header, cards, charts, then the existing loan-card grid.
  With no active loans, the existing empty state renders alone.

### Charts

- **Library: Recharts**, added as a dependency. This is the app's first
  charting library. Server rendering was explicitly not a requirement, because
  all the data is in hand when the page loads.
- **Saldo devedor chart**: stacked area, one series per Financiamento, with a
  reference line at the current month labelled "hoje".
- **Parcelas por mês chart**: stacked area with step interpolation, one series
  per Financiamento. Bars were rejected, because 360 monthly bars render at
  1–2 px and smear.
- **Shared axis**: both charts cover the full span (whole life, no zoom or
  window), use the same month domain, and tick by year.
- **Tooltip**: on hover or tap, it shows the month, each loan's value in reais,
  and the month's total.
- **Colour**: a fixed categorical palette, assigned by the loan's position in
  the ledger, so a loan has the same colour in both charts. Neither the loan's
  Categoria colour nor red or green is used for the series.
- **Responsive**: charts fill the content width at every breakpoint. Summary
  cards sit two per row on a phone and widen to fit on larger screens.

### Formatting

Currency uses the app's existing BRL formatter. Month/year labels use the
abbreviated Portuguese month and four-digit year ("mar/2041"). All copy is in
Portuguese, and the code is in English, as in the rest of the app.

## Testing Decisions

**What makes a good test here.** A test should feed the projection a ledger and
assert on the figures and series that come out. That is behaviour the user sees.
For example: "a Vencida parcela from last month counts toward Total a pagar but
not toward Parcelas deste mês". Tests should not assert on how the projection
reaches its answer, which helper it calls, or the intermediate structures it
builds.

**The seam: one.** All the logic worth protecting lives in the new pure
projection, so that is the only thing tested. The cards and the Recharts
component only display its output and get no tests of their own. This was
confirmed with the user during design.

The cases the suite should cover:

- Saldo devedor equals the sum of the per-loan summaries across several loans.
- Total a pagar sums unpaid parcelas, includes Vencidas, and adds amortizações
  dated after today. The interest it reports covers only unpaid rows.
- Parcelas deste mês includes paid and unpaid rows dated in the given month and
  excludes a Vencida from an earlier month.
- Quitação is the latest last-row month across loans. It reports settled when
  every row of every loan is paid.
- Economia is zero and flagged as having no amortizações when none exist. It is
  positive when a reduce-term amortização exists, with parcelas removed > 0. It
  is positive with zero parcelas removed when only reduce-installment
  amortizações exist. A future-dated amortização is counted.
- Chart series span the earliest first parcela to the latest last parcela. A
  loan contributes nothing outside its own schedule. Loan order and identity
  follow the ledger.
- A single-loan ledger and a fully paid loan produce sensible results. An empty
  ledger produces an empty result without throwing.

**Prior art.** The existing financing helper suites: the per-loan summary, the
month items, the monthly report and the spend projection. They build
`HydratedFinancing` fixtures by hand, with simple zero-interest schedules where
exact arithmetic matters. Rather than injecting a clock, they place dates far in
the past (2020) or far in the future (2099), so that "today" can never land
between them. The new suite follows the same pattern, and the year/month
argument covers Parcelas deste mês directly.

## Out of Scope

- **Reconstructing actual history.** Past points on the charts follow the
  schedule, not when parcelas were really paid. `paid_on` is often empty, and
  the Saldo devedor card already carries the exact figure. When something is
  Vencida, the curve at "hoje" sits slightly below the card. This is accepted.
- **Removed Financiamentos.** Not shown anywhere in the overview, including
  history.
- **A zoom, brush or time-window control on the charts.** Whole life only. This
  can be added later.
- **Interest vs. amortização split per parcela.** It belongs on a loan's own
  page, not the combined overview.
- **"Juros já pagos" and an overall progress percentage.** Considered and
  dropped: the first mirrors the interest inside Total a pagar, and the second
  repeats the per-loan progress bars.
- **Colour markers on the loan cards** matching each loan's chart colour. A
  natural follow-up, but not part of this spec.
- **Changes to the loan detail page or the simulator.** The empty Economia card
  only links to what already exists.
- **Reports and Avisos.** The monthly PDF report and the Aviso email are
  untouched.

## Further Notes

The decisions here came from a design session. Two points refine what was
discussed there:

- The Economia sub-line counts **parcelas** removed, summed across loans, rather
  than months. With several loans, "months earlier" is ambiguous: a shortened
  loan that does not end last leaves the overall Quitação unchanged. Parcelas
  removed is exact and adds up cleanly.
- The settled state of Quitação keys off every parcela being marked paid, not
  off the Saldo devedor reaching zero. Rounding can leave a Saldo devedor of a
  few centavos, while paid marks are unambiguous.

No ADR was written. Adding Recharts and counting the recorded plan in the
totals are both easy to reverse.
