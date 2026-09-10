# 01: Where the day's figures are folded

Type: grilling
Status: resolved
Blocked by: none

## Question

Charting settled that the day's figures come from a pure helper rather than
inline component logic. It did not settle where that helper runs, and the data
flow constrains the answer.

The client never receives the ledger. `page.tsx:138-142` ships
`bills={{ entries, mortgages, ...totals.bills }}` — the rows, plus three
month-scoped numbers already folded by `summarizeMonth`
(`month-summary.ts:91-140`). `BillsSection` recomputes nothing today; it
re-partitions rows for display and reuses `bills.remaining` / `bills.paid`
verbatim as its subsection totals.

Two shapes are available:

**(a) Client-side.** `(entries, mortgages, day) → figures`, run in the card on
data it already holds. Small, no new server work, no payload change. Costs a
second definition of "which day is this Obrigação on", living apart from the one
in `monthDayMarkers` (`month-summary.ts:182-213`).

**(b) Server-side.** Fold every day of the month into a day→figures map, shipped
beside the existing totals. Keeps all folding in `month-summary.ts` next to its
siblings and their fixtures, and would let the calendar show per-day figures
later without a second mechanism. Costs shipping ~30 days of figures to render
one, and only works if the selected day is knowable server-side — which forces
the hand of `02-where-the-selected-day-lives.md`.

Decide (a) or (b), and settle the second half either way: **does the helper
return the filtered rows as well as the figures, or figures only?** Figures only
leaves the component filtering rows separately, so two places decide the same
question and can disagree — the failure `01: One definition of Vencida` in the
`overdue-avisos` effort existed to prevent.

Consult `codebase-design` for the seam.

## Answer

**(a), client-side, figures only.** Settled by instruction rather than by
grilling: the user asked for a front-end-only computation, which removes the
server option and with it the payload cost.

`summarizeDayObligations` lives beside `summarizeMonth` in
`src/helpers/month-summary.ts` and reuses that module's structural `MonthBill`
type, so `EntryRow` and `MortgageBillItem` both satisfy it without adapters. It
folds `[...bills, ...financing.bills]` exactly as `summarizeMonth:95` and
`monthDayMarkers:188` do, which is what keeps the three from disagreeing about
whether a parcela counts.

The rows-vs-figures half is moot: what shipped shows no rows, so there is no
second place deciding which day an Obrigação falls on.
