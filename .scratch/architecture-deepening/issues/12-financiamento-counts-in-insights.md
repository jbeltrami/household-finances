# 12: Financiamento counts toward the Insights averages

**What to build:** Insights measures a household's fixed spend against a benchmark,
and that measurement currently leaves out the parcela — usually the largest fixed
outflow there is. A user reads one Contas figure on the monthly view and a smaller
one here. This ticket closes the gap.

**There is a decision to make first, and it is not mechanical.** Two benchmarks on
the page bear on it:

- _Máximo em despesas fixas_ compares against the Contas average. If the parcela
  joins that average, the comparison becomes honest about what the household
  actually owes each month.
- _Máximo com financiamento_ is a target with nothing compared against it. The
  parcela is the obvious actual for it.

The recommendation is to do both: fold the parcela into the Contas average **and**
surface it as the actual for the mortgage benchmark, so it is counted once in the
overall picture and shown separately where the user is asking specifically about
it. Amortizações extraordinárias are one-off by nature and averaging them across a
window flatters or damns a month at random — they stay out.

**Confirmed: both.** The parcela joins the Contas average and also
becomes the actual for the housing benchmark.

**Blocked by:** 05, 11.

**Status:** done

- [x] The parcela of each month in the window counts toward the Contas average
- [x] Amortizações extraordinárias do not
- [x] The mortgage benchmark shows an actual to compare against
- [x] The Contas average matches the Contas total the monthly view shows for the
      same month
- [x] A space with no Financiamento sees unchanged figures
- [x] A window in which a loan starts partway through is covered by a test
