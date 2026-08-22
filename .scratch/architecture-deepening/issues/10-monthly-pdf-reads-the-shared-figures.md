# 10: The monthly PDF reads the shared figures

**What to build:** The emailed monthly report computes its own totals with a
second copy of the Saldo arithmetic. It reads the module from ticket 08 instead,
so the PDF and the screen agree by construction rather than by two
implementations happening to match.

For a past month the two collapse to the same thing anyway — every unpaid Conta is
overdue by then — but that is a coincidence of the calendar, not a guarantee, and
a report generated mid-month is where they can part company.

**Blocked by:** 04, 08.

**Status:** ready-for-agent

- [ ] The report's totals come from the shared module
- [ ] Its own copy of the arithmetic is deleted
- [ ] A PDF regenerated for a past month is unchanged
- [ ] A PDF generated for the current month shows the figures the monthly view
      shows that same day
- [ ] Financiamento still appears both in the totals and in its own section
- [ ] A month with nothing in it is still skipped rather than reported empty
