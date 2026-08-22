# 02: The report month list reads the window

**What to build:** The Relatórios page lists every past month with anything to
report, and decides that partly by working out how long each Conta parcelada
runs. It does that with its own copy of the window rule. It stops, and reads the
module from ticket 01.

Nothing changes on screen; the point is that the two answers can no longer drift.
A prepayment recorded today already shortens the series in the monthly view — the
month list should agree without anyone maintaining that agreement by hand.

**Blocked by:** 01.

**Status:** done

- [x] The month list reads the shared window module
- [x] Its inline copy of the prepayment arithmetic is deleted
- [x] A month that is non-empty only because a parcelamento covers it still lists
- [x] A month past a prepaid series' shortened end no longer lists
- [x] The listed months are unchanged for a space with no parcelamentos
