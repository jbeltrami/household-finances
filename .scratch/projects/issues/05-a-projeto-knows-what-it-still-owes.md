# 05: A Projeto knows what it still owes

**What to build:** A parcelamento or a Financiamento can be attached to a
Projeto, and the Projeto reports what it has committed, what it has paid, and
what it still owes, with the month its last parcela falls. "Ainda vou pagar essa
reforma por quanto tempo?" gets an answer.

This is also where the Orçamento stops being consumed by cash paid and starts
being consumed by **Comprometido**. A reforma is largely `10x sem juros`, and a
budget measured on what has left the account tells the user they have room they
have already spent: a 30.000 sofa em 10x would leave the Reforma looking 27.000
under budget for nine months.

Comprometido is measured all-in, in the same cash the monthly view shows, so no
figure on the Projeto page contradicts the same row in the month. The Projeto and
the month answer different questions rather than giving different answers to one.

**Blocked by:** 03.

**Status:** ready-for-agent

- [ ] A parcelamento can be attached to a Projeto, and every occurrence belongs
      to it without being tagged by hand
- [ ] A Financiamento can be attached to a Projeto
- [ ] Comprometido uses actual amounts for what has happened and the modelled
      remainder for what has not
- [ ] An attached Financiamento contributes its whole-life schedule total,
      juros and amortizações extraordinárias included
- [ ] Pago and A pagar are reported beside Comprometido
- [ ] The Orçamento is consumed by Comprometido, not by what has been paid
- [ ] A parcela paid at an overridden amount counts at what was paid, and the
      series total does not drift
- [ ] An a-pagar tab shows parcelas restantes, the mês final, and the juros as
      its own figure
- [ ] Financing is flattened into the rollup's row shape before the fold, so the
      fold needs no knowledge of amortization
- [ ] An attached parcela behaves in every other way as a Conta: it appears in
      its month, counts toward Saldo, and can be Vencida
- [ ] The fold is tested through its interface on plain data

## Further notes

The flattening is the seam that matters, and there is prior art: the category
report flattens Financiamento into a common spend row before the fold sees it,
which is why that fold knows nothing about loans. Copy that shape.

The one thing here a future reader will mistake for a bug: Comprometido counts
money that has not left the account, so a Projeto can report 52.000 consumed in
a month where Saldo shows 4.200 leaving. Measuring principal rather than all-in
was designed and rejected — a template stores only `default_amount` and
`installments_total`, so there is no way to know what part of "12x de R$ 450" is
juros, and the Projeto would end up measuring a store purchase and a loan on two
different bases.
