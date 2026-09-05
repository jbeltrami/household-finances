# 02: Spending belongs to a Projeto

**What to build:** A Despesa can be attributed to a Projeto, from the monthly
view while logging the week's spending or from the Projeto page while thinking
about the reforma, and the Projeto page reports what it has cost so far. This is
the first ticket where the feature earns its place: "quanto já gastei na
reforma" gets an answer.

The whole design rests on one invariant, and this is the ticket that establishes
it: a project expense **is** a Despesa. It is a row in `entries` with a
`project_id`, it appears in its month exactly as before, and nothing about the
monthly figures learns that Projetos exist. That is ADR 0005, and the regression
test below is what stops a future change from quietly breaking it.

Both forms go through the existing one-off entry action rather than growing a
parallel one.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] A Despesa recorded from the monthly view can carry a Projeto
- [ ] The Projeto picker is absent from that form when the space has no Ativo
      Projeto
- [ ] A form on the Projeto page records a Despesa with the Projeto pre-filled,
      through the same action
- [ ] The Projeto of an existing Despesa can be changed or cleared
- [ ] The Projeto page lists its spending with a running total
- [ ] Project spending appears in the monthly view, in Saldo, in the Resumo and
      on the CalendarStrip exactly as it did before it carried a Projeto
- [ ] A test asserts `summarizeMonth` returns identical `MonthTotals` for a
      Despesa with and without a `project_id`
- [ ] Editing project spending in a locked past month requires an unlock, like
      any other Despesa

## Further notes

The `summarizeMonth` test is not box-ticking. The absence of change in the
monthly fold is the invariant the entire feature rests on, and it should fail
loudly if someone later teaches that fold about Projetos.
