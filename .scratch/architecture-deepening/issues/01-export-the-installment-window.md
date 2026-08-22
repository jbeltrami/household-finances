# 01: Export the installment window

**What to build:** The rule that decides which months a parcelamento still emits
an occurrence for — and how a prepayment pulls that end earlier — becomes a named
module with its own tests. Nothing changes on screen.

Today the rule is private to the ledger, which is why it exists twice: the
report's month list needed it, could not reach it, and copied it. This ticket
makes the original reachable. Ticket 02 deletes the copy.

This is also the first test the ledger has ever had. The prepayment shift is the
subtlest arithmetic in the codebase — a Conta parcelada in 12× where one payment
covers 3 parcelas must stop emitting two months early — and nothing verifies it.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The window rule is an exported module taking a template and its paid
      coverage, returning the inclusive first and last month it emits
- [ ] It returns nothing for a Conta without parcelamento, which is always active
- [ ] Occurrence expansion reads it rather than computing the window inline
- [ ] A 12× series with no prepayment emits across exactly 12 months
- [ ] One payment covering 3 parcelas shortens the series by 2 months
- [ ] Coverage beyond the declared total clamps rather than emitting backwards
- [ ] A parcelamento with no start month emits nothing
- [ ] A Conta with an ordinary recurrence is untouched by any of this
- [ ] Every criterion above is covered by a test against the module's interface

## Further notes

Follow the shape ticket 07 of `categories-and-payers` established: plain data in,
plain data out, tested through the interface rather than by asserting on how the
queries were built.
