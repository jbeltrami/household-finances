# 02: Where the selected day lives

Type: grilling
Status: resolved
Blocked by: 01

## Question

The selected day is component state today — `useState<number | null>` at
`MonthlyViewClient.tsx:27`, toggling off when the same day is clicked again. It
does not survive a reload, cannot be linked to, and is invisible to the server.

The repo has precedent for the alternative: `insights/page.tsx:32` scopes on a
`window` search param and `reports/categories/page.tsx:35` on `year`, both read
server-side.

Should the selected day become a URL search param, or stay component state?

URL state survives reload, is shareable, and is the only option compatible with
a server-side fold — so if `01-where-the-days-figures-are-folded.md` lands on
(b), this is largely decided and the remaining question is only the param's name
and shape. If 01 lands on (a), this is a free choice and the cost of URL state
is a navigation on every day click, against a calendar that currently toggles
instantly.

Also settle what happens on month navigation: the month links are `<Link>`s to a
new route, so today the selection resets. Is that right, or should a selected
day carry across months?

## Answer

**Component state, unchanged.** "It isn't meant to be recorded" rules out the
URL param directly, and a client-side fold means the server never needs to know
the day. The existing `useState` at `MonthlyViewClient.tsx:27` and its
click-again-to-clear toggle carry the whole feature.

Month navigation still resets the selection, which is now the desired behaviour
rather than an open question: the widget is scoped to the month on screen.
