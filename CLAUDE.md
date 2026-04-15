# Home Finances App — Project Context

## What this is

A personal finance planner for a small group of friends and family. Each user
manages their own monthly finances, with the option to link personal spaces into
a shared household view. Built on Supabase (database + auth) with a Next.js
frontend hosted on Vercel.

---

## Tech stack

| Layer           | Choice                                       |
| --------------- | -------------------------------------------- |
| Database + Auth | Supabase (region: South America — São Paulo) |
| Frontend        | Next.js + Tailwind CSS + Recharts            |
| Hosting         | Vercel                                       |
| Auth provider   | Google OAuth only (no email/password)        |

---

## Key product decisions

- **Month-by-month tracker** — the month is the primary container for all data
- **No fixed paycheck schedule** — users add income entries freely per month
- **Recurring bill templates** — defined once, instances auto-generated per month
- **Per-instance amount overrides** — a bill instance can differ from its template for that month only, without affecting the template or other months
- **Past months auto-lock** — locked when a new month begins; unlocking requires a written reason (no password re-entry)
- **Spaces with parent linking** — a personal space can be linked to a household space; its entries roll up into the household aggregate view
- **Data flows one way** — personal → household only; the household view is a read-only aggregation, never a write target; entries always belong to the space they were created in
- **Historical participation preserved** — when someone leaves a household, their past entries remain visible in historical months with correct attribution
- **Household entries** — the household space can also have its own entries (joint expenses not belonging to either person)
- **Savings funds** — live outside the monthly cycle; contributions are logged per month; total = starting_balance + sum of all contributions
- **Google OAuth only** — first login auto-creates the user's personal space via a database trigger
- **Invite by email** — household owners invite by email; pending invites wait for the person to sign up if they don't have an account yet; accepted/declined via dashboard banner

---

## Core concept: Spaces

A Space is a budget context. Types: `personal`, `household`, `shared`.

- Every user gets a **personal space** automatically on first login (DB trigger)
- Personal spaces can be **linked to a household space** via `parent_space_id`
- The household view aggregates entries from the household space itself + all linked personal spaces
- Entries in a personal space are attributed to their owner in the household view
- An unlinked personal space is fully private
- Leaving a household removes the `parent_space_id` link — personal space data remains fully intact

---

## Data model

```sql
spaces
  id, name, type (personal | household | shared)
  created_by, parent_space_id (nullable), created_at

space_members
  space_id, user_id, role (owner | member)
  joined_at, left_at (nullable)              -- never hard deleted; left_at set on departure

invitations
  id, space_id, invited_email
  invited_by (user_id)
  status (pending | accepted | declined)
  created_at, responded_at
  unique (space_id, invited_email)

recurring_bill_templates
  id, space_id, name
  default_amount, currency, due_day (nullable), active, created_at

months
  id, space_id, year, month
  locked, locked_at, unlock_reason, created_at
  unique (space_id, year, month)

income_entries
  id, month_id, space_id
  name, amount, currency, expected_date, received, created_at

bill_instances
  id, month_id, template_id, space_id
  amount (can differ from template default), due_date, paid, created_at
  unique (month_id, template_id)

one_off_expenses
  id, month_id, space_id
  name, amount, currency, date, category, notes, created_at

savings_funds
  id, space_id, name, currency, starting_balance, created_at

savings_contributions
  id, fund_id, month_id, amount, notes, created_at
```

### How months work

A `months` row is created on demand — when a user first navigates to a month.
At that point, bill instances are auto-generated from all active templates in
that space. Past months lock automatically; editing requires an unlock reason.

### How the household view works

Query: all entries from the household space + all entries from spaces where
`parent_space_id = household_space.id`. Entries are attributed by `space_id`
so the UI can show "João — Unimed R$1.200" vs "Wife — Gym R$150".

Past months retain attribution even after someone leaves, because entries carry
their original `space_id` permanently. The household view labels departed
members using `space_members.left_at`.

### How invitations work

1. Household owner types an email address
2. An `invitations` row is created with `status: pending`
3. If the person already has an account, they see a dashboard banner on next login
4. If not, the invite waits — when they sign up with that email via Google, the banner appears
5. Accepting → `space_members` row created, `status` → accepted
6. Declining → `status` → declined, nothing else changes

---

## Auth flow

1. User lands on app → clicks "Sign in with Google"
2. Google OAuth → Supabase handles the redirect
3. On first login, a DB trigger fires:
   - Creates a `personal` space named after the user's Google display name
   - Adds the user as `owner` of that space
4. App checks for pending invitations matching the user's email
5. User lands on their personal dashboard (with invite banner if applicable)

---

## Monthly view structure (main UI concept)

```
[Month: April 2026]

INCOME                         Expected    Status
Paycheck                       R$19.000    ✓ received
Freelance XYZ                  R$2.000     pending
─────────────────────────────────────────────────
Total expected                 R$21.000
Received so far                R$19.000

BILLS                          Amount      Status
Claro (recurring)              R$470       ✓ paid
Unimed (recurring)             R$1.200     pending   ← overridden from R$1.000
Condomínio (recurring)         R$1.875     pending
─────────────────────────────────────────────────
Total bills                    R$12.840
Paid so far                    R$470
Still to pay (falta pagar)     R$12.370

BALANCE
Expected net                   R$8.160
Net so far (received - paid)   R$18.530
```

---

## Build order

| Piece | Scope                                                                            | Status  |
| ----- | -------------------------------------------------------------------------------- | ------- |
| 1     | Supabase schema + auth + personal space auto-creation trigger                    | ✅ Done |
| 2     | Next.js scaffold + Supabase client setup + Google OAuth login flow               | ✅ Done |
| 3     | Recurring bill templates — create, edit, deactivate                              | ✅ Done |
| 4a    | Monthly view core — routes, on-demand creation, paid toggle, navigation          | ✅ Done |
| 4b    | Monthly view top calendar — calendar strip, badges, month picker dropdown        | ✅ Done |
| 5     | Income entries — add/edit/mark received within a month (one-off only)            | ✅ Done |
| 6     | One-off expenses + monthly balance calculation                                   | ✅ Done |
| 7     | Savings funds — create fund, log contributions, running total                    | 🚧 In progress |
| 8     | Shared spaces — household creation, invite flow, aggregate view                  | ⬜      |
| 9     | Recurring income templates — biweekly / monthly cadence, instance generation     | ⬜      |

---

## Piece 4 plan — Monthly view

The monthly view is the heart of the app. It's split into two sub-pieces so the basics ship before the calendar UI.

### Piece 4a — core monthly view

**Routing**

- `/months/[year]/[month]` is the canonical monthly URL (e.g. `/months/2026/04`). Year is 4-digit, month is 2-digit zero-padded
- `/` (the home page) **redirects to the current month** so users land directly on it after sign-in. Bookmarkable URLs for every month
- Navbar gets a "This month" link that always points to the current YYYY/MM

**On-demand month + instance creation**

- A `months` row is created **lazily** the first time a user navigates to that year/month for their personal space
- At creation time, the server enumerates all `active = true` recurring bill templates for that space and inserts a `bill_instances` row for each one, copying `default_amount` and computing `due_date` from `due_day` (or leaving it null if `due_day` is null)
- This is wrapped in a single transaction (or a database function) so the month and its instances appear atomically

**RLS policies (deferred from Piece 3)**

- Add policies for `months` and `bill_instances` so users can read/write rows in spaces they belong to
- This is what unblocks the cascade-amount feature from Piece 3

**Bills section of the page**

- Lists all `bill_instances` for the month, joined to their template for the name
- Each row: name, amount, due day (if set), paid checkbox
- Toggling paid is a server action that flips `bill_instances.paid`
- An "Edit amount" affordance per row that opens an inline edit (or a small modal) — sets `bill_instances.amount` for that month only, never touches the template. This is the per-instance override

**Month navigation**

- Prev / Next buttons that navigate to the adjacent `/months/[year]/[month]`. Always available, even for months that don't exist yet (the destination route will create the row on demand)

**Past-month locking — check-on-read**

- A month is **effectively locked** if `(year, month) < (currentYear, currentMonth)` AND `unlock_reason IS NULL`
- A month is **effectively unlocked** if it's the current month, a future month, OR a past month where `unlock_reason` is set
- No scheduled job or DB trigger needed — the lock state is computed from the current date and the `unlock_reason` column on every read
- Schema change: drop the `locked` and `locked_at` columns from `months`. Keep only `unlock_reason`. With check-on-read, the boolean becomes redundant (and confusing — "what if locked=false but unlock_reason is set?"). Migration `0004` handles this
- The check-on-read helper lives server-side (e.g. `isMonthLocked({year, month, unlockReason})`) and is used in two places:
  1. The page render — to show read-only UI vs editable affordances
  2. Inside every mutation server action — defense in depth, so direct POST attempts also get rejected
- Unlocking a past month: "Unlock" button opens a small form requiring a written reason. Submitting it stores the reason in `unlock_reason` and re-renders the page with the edit affordances enabled
- Re-locking is not exposed in the UI for now. Once unlocked, a past month stays unlocked

**Out of scope for 4a**

- Income entries (Piece 5)
- One-off expenses + balance calculation (Piece 6)
- Calendar UI (Piece 4b)

### Piece 4b — top calendar strip

A calendar strip displayed **above the monthly view content**, only on `/months/*` routes (not on `/bills` or other pages). Hidden on small screens (`md:` breakpoint and up only).

**Layout**

- Sits at the top of the monthly view, above the bills/income/expense sections
- Contains the calendar grid plus a row of controls

**Controls (left-to-right)**

- Prev month button
- Month dropdown — shows past months that have a `months` row in the DB, plus the next 6 months from today (even if they don't exist yet — selecting one navigates and triggers on-demand creation)
- Year dropdown — same logic
- Next month button
- "Today" button — jumps to the current month

**Calendar grid**

- Standard month grid (Sun–Sat or Mon–Sun, decide later) for the **currently viewed** month, not always today's month
- Each day cell shows the day number
- Days with `bill_instances` due that day get a **badge** — a small dot or count indicator
- Clicking a day **highlights** the bills due that day in the main bills list (e.g. scrolls to them and adds a temporary highlight class)

**State**

- The calendar follows the URL — `/months/2026/04` → calendar shows April 2026
- The "Today" button is just a link to `/months/<current YYYY/MM>`
- Highlighted day is local UI state (client component, no URL state)

**Out of scope for 4b**

- Drag-and-drop to reschedule bills
- Year-at-a-glance heatmap
- Mobile drawer for the calendar (hidden on mobile entirely for now)

### Two-column layout (shipped alongside Piece 5)

The monthly view uses a two-column grid on desktop (`md:` and up), single column on mobile:

- **Left column — `md:col-span-1` of `md:grid-cols-4`**: calendar strip (controls + grid)
- **Right column — `md:col-span-3`**: income section, bills section, net (expected) section

Mobile stays single-column with the calendar grid hidden via the existing `hidden md:block` class on the grid. The page wrapper uses `max-w-6xl` so the desktop layout has room to breathe. CalendarStrip's controls are stacked (prev/dropdown/next on row 1, Today on row 2, full width) so they fit in a narrow desktop column.

---

## Piece 7 plan — Savings funds

Savings funds live outside the monthly cycle. A fund has a `starting_balance` and a set of per-month `savings_contributions` that roll up into `runningTotal = starting_balance + sum(contributions)`.

**Management route: `/savings`**

- List of the user's funds with their running totals. Click a fund → `/savings/[id]` detail page.
- Detail page exposes: rename, running-total summary (starting balance, net contributions, current total), contribution history grouped by month, and a form to log new contributions.
- Fund-level UX deliberately minimal for Piece 7: no deactivate/archive yet. Schema has no `active` column; the follow-up decision is whether to add one or allow hard delete.

**Contributions**

- A contribution belongs to both a fund and a month. The month is chosen via a native `<input type="month">` (yields `"YYYY-MM"`) and lazy-created via `getOrCreateMonth` if it doesn't exist — same idiom as income entries routing by `expected_date`.
- **Signed amounts** — contributions use a single `amount` column but the form has two buttons, **Deposit** and **Withdraw**. The action parses the button's `type` field and flips the sign: deposits positive, withdrawals negative. `parseContributionFields` returns `signedAmount`, so the DB and all downstream sums can treat contributions as pure algebra.
- **Lock enforcement** runs against the **target** month (the one in the form), not any page-level month, and lives in the server actions (not RLS) — same defense-in-depth approach as income/expenses.
- **Access control is inherited.** `savings_contributions` has no `space_id`; its RLS policy walks the FK to `savings_funds` and calls `is_active_member(f.space_id)`. When a fund lives in a household space (Piece 8), all active household members automatically get CRUD on its contributions.

**Monthly view integration (one row only)**

- The `/months/[year]/[month]` page fetches the sum of `savings_contributions.amount` for the current month across every accessible fund and passes it to `BalanceSection` as `savingsNet`.
- `BalanceSection` renders a single **"Saved this month"** row inside the balance card. No inline add/edit — the savings UI lives at `/savings`.
- `savingsNet` is subtracted from both `netExpected` and `netSoFar`. A deposit (positive) reduces the month's net (money moved out of checking); a withdrawal (negative) increases it (money came back). Because signs are baked in, the math is a single subtraction in both places.

**Out of scope for Piece 7**

- Fund deactivate/archive/delete
- Contribution-level reporting across months (only per-fund detail page has history for now)
- Household fund sharing UX (enabled by RLS, but invite/link flow is Piece 8)

---

## Piece 9 plan — Recurring income templates (deferred)

Income recurrence was originally considered alongside Piece 5 but split out so Piece 5 can ship simple one-off entries first. Income recurrence is harder than bill recurrence for one reason: real-world paychecks often follow a **biweekly cycle** (every other Thursday) that doesn't align with month boundaries. A given calendar month can contain 0, 1, 2, or 3 paychecks depending on alignment.

**Data model sketch:**

```sql
recurring_income_templates
  id, space_id
  name, default_amount, currency
  cadence              -- 'biweekly' | 'monthly'
  biweekly_anchor      -- date, only set when cadence='biweekly' (e.g. the first paycheck date)
  monthly_day          -- int 1-31, only set when cadence='monthly'
  active, created_at
  CHECK (
    (cadence = 'biweekly' AND biweekly_anchor IS NOT NULL AND monthly_day IS NULL) OR
    (cadence = 'monthly'  AND monthly_day IS NOT NULL AND biweekly_anchor IS NULL)
  )
```

`income_entries` will gain a nullable `template_id` so generated entries link back to their template. One-off entries (the only kind in Piece 5) leave it null.

**Instance generation logic:**

- **Monthly cadence**: same as bills — one entry per month on `monthly_day`
- **Biweekly cadence**: starting from `biweekly_anchor`, walk forward in 14-day steps; create an entry for every date that lands in the month being generated (0, 1, 2, or 3 per month)

**UI surface:**

- New `/income` page mirroring `/bills` (list active templates, create, edit, deactivate)
- Cadence picker in the create/edit form (Quinzenal / Mensal)
- Monthly view continues to support both template-generated entries (Piece 9) and free-form one-offs (Piece 5)

This piece is strictly additive to Piece 5: existing one-off entries stay valid, the `template_id` column is nullable.

---

## Supabase setup (completed in Piece 1)

- Project name: **Home Finances App**
- Region: South America (São Paulo)
- RLS: enabled on all tables
- Auth provider: Google OAuth only
- Site URL: `http://localhost:3000` (update to Vercel URL after first deploy)
- Redirect URLs: `http://localhost:3000/**` (add Vercel URL after first deploy)
- Schema files in `supabase/migrations/`:
  - `0001_initial_schema.sql` — initial tables and trigger
  - `0002_rls_policies.sql` — RLS enabled on all tables; SELECT/INSERT/UPDATE/DELETE policies for `spaces`, `space_members`, and `recurring_bill_templates`
  - `0003_bill_templates_unique_active_name.sql` — partial unique index preventing two active templates with the same name in a space
  - `0004_months_locking_and_rls.sql` — dropped `locked` / `locked_at` columns from `months` (check-on-read locking); added SELECT/INSERT/UPDATE policies for `months` and `bill_instances`
  - `0005_income_entries_rls.sql` — SELECT/INSERT/UPDATE/DELETE policies for `income_entries` (Piece 5)
  - `0006_one_off_expenses_rls.sql` — SELECT/INSERT/UPDATE/DELETE policies for `one_off_expenses` (Piece 6)
  - `0007_savings_rls.sql` — SELECT/INSERT/UPDATE/DELETE policies for `savings_funds` and `savings_contributions` (Piece 7). Contribution policies walk the FK to the parent fund and reuse `is_active_member(space_id)` there, so household-shared funds inherit access automatically

### Environment variables needed

Create a `.env.local` file at the project root (never commit this file):

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
```

Both values are found in Supabase under **Project Settings → API**.

---

## Repo structure

```
home-finances-app/
├── CLAUDE.md                              ← this file
├── .env.local                             ← never commit (in .gitignore)
├── supabase/
│   └── migrations/
│       ├── 0001_initial_schema.sql        ← initial tables + trigger
│       ├── 0002_rls_policies.sql          ← RLS + policies (Piece 3)
│       ├── 0003_bill_templates_unique_active_name.sql  ← partial unique index
│       ├── 0004_months_locking_and_rls.sql   ← drop locked cols, RLS for months + bill_instances (Piece 4a)
│       ├── 0005_income_entries_rls.sql    ← RLS for income_entries (Piece 5)
│       ├── 0006_one_off_expenses_rls.sql  ← RLS for one_off_expenses (Piece 6)
│       └── 0007_savings_rls.sql           ← RLS for savings_funds + savings_contributions (Piece 7)
├── src/
│   ├── app/
│   │   ├── layout.tsx                     ← root layout (HTML shell, fonts, navbar)
│   │   ├── page.tsx                       ← redirect to current month
│   │   ├── globals.css                    ← Tailwind imports + dark mode media query
│   │   ├── login/
│   │   │   └── page.tsx                   ← Google OAuth login page
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts               ← OAuth callback handler
│   │   ├── bills/                         ← recurring bill templates (Piece 3)
│   │   │   ├── page.tsx                   ← server component, fetches data, delegates to sections
│   │   │   ├── _types.ts                  ← BillTemplate type
│   │   │   ├── actions.ts                 ← barrel re-export of server actions
│   │   │   ├── actions/
│   │   │   │   ├── _helpers.ts            ← shared helpers (no "use server")
│   │   │   │   ├── create-bill-template.ts
│   │   │   │   ├── update-bill-template.ts
│   │   │   │   └── deactivate-bill-template.ts
│   │   │   ├── form-state.ts              ← FormState type + initial state
│   │   │   ├── _components/
│   │   │   │   ├── CreateBillTemplateForm/
│   │   │   │   │   └── CreateBillTemplateForm.tsx
│   │   │   │   └── ActiveTemplatesSection/
│   │   │   │       └── ActiveTemplatesSection.tsx
│   │   │   └── [id]/edit/
│   │   │       ├── page.tsx
│   │   │       └── _components/
│   │   │           └── EditBillTemplateForm/
│   │   │               └── EditBillTemplateForm.tsx
│   │   ├── savings/                       ← savings funds (Piece 7)
│   │   │   ├── page.tsx                   ← list funds + create form
│   │   │   ├── _types.ts                  ← SavingsFundRow, SavingsContributionRow
│   │   │   ├── actions.ts                 ← barrel re-export
│   │   │   ├── actions/
│   │   │   │   ├── _helpers.ts            ← parseFundFields, parseContributionFields (signed amount), fetchContributionContext, getPersonalSpace
│   │   │   │   ├── create-savings-fund.ts
│   │   │   │   ├── update-savings-fund.ts
│   │   │   │   ├── create-savings-contribution.ts  ← lazy-creates target month, lock check
│   │   │   │   ├── update-savings-contribution.ts
│   │   │   │   └── delete-savings-contribution.ts
│   │   │   ├── form-state.ts              ← FormState type + initial state
│   │   │   ├── _components/
│   │   │   │   ├── CreateSavingsFundForm/
│   │   │   │   │   └── CreateSavingsFundForm.tsx
│   │   │   │   ├── FundsListSection/
│   │   │   │   │   └── FundsListSection.tsx
│   │   │   │   └── SavingsFundRow/
│   │   │   │       └── SavingsFundRow.tsx
│   │   │   └── [id]/                      ← fund detail page
│   │   │       ├── page.tsx               ← running total, contribution history
│   │   │       └── _components/
│   │   │           ├── EditFundNameForm/
│   │   │           │   └── EditFundNameForm.tsx
│   │   │           ├── CreateContributionForm/
│   │   │           │   └── CreateContributionForm.tsx
│   │   │           ├── ContributionsSection/
│   │   │           │   └── ContributionsSection.tsx
│   │   │           └── ContributionRow/
│   │   │               └── ContributionRow.tsx
│   │   └── months/                        ← monthly view (Pieces 4a, 4b, 5, 6, 7)
│   │       └── [year]/[month]/
│   │           ├── page.tsx               ← server component, fetches data, two-column wrapper
│   │           ├── _helpers.ts            ← shared route helpers (sync + async)
│   │           ├── actions.ts             ← barrel re-export of server actions
│   │           ├── actions/
│   │           │   ├── toggle-bill-paid.ts
│   │           │   ├── update-bill-instance-amount.ts
│   │           │   ├── unlock-month.ts
│   │           │   ├── create-income-entry.ts          ← lazy-creates target month
│   │           │   ├── toggle-income-received.ts
│   │           │   ├── update-income-amount.ts
│   │           │   ├── delete-income-entry.ts
│   │           │   ├── create-one-off-expense.ts
│   │           │   ├── update-one-off-expense.ts
│   │           │   └── delete-one-off-expense.ts
│   │           ├── form-state.ts          ← FormState type + initial state
│   │           ├── _types.ts               ← row types + grouped props (BillRow, IncomeGroup, etc.)
│   │           └── _components/
│   │               ├── MonthlyViewClient/
│   │               │   └── MonthlyViewClient.tsx   ← client wrapper, owns highlight state, two-column grid
│   │               ├── CalendarStrip/
│   │               │   ├── CalendarStrip.tsx       ← client, controls + grid + bill/income badges
│   │               │   └── _helpers.ts             ← buildCalendarGrid (private)
│   │               ├── IncomeSection/
│   │               │   └── IncomeSection.tsx       ← section: heading, list, summary, add-form toggle
│   │               ├── BillsSection/
│   │               │   └── BillsSection.tsx        ← section: heading, list, summary
│   │               ├── ExpensesSection/
│   │               │   └── ExpensesSection.tsx     ← section: heading, list, summary, add-form toggle
│   │               ├── BalanceSection/
│   │               │   └── BalanceSection.tsx      ← section: net expected + net so far
│   │               ├── BillInstanceRow/
│   │               │   └── BillInstanceRow.tsx     ← client, paid toggle + edit + highlight
│   │               ├── IncomeEntryRow/
│   │               │   └── IncomeEntryRow.tsx      ← client, received toggle + edit + delete + highlight
│   │               ├── ExpenseEntryRow/
│   │               │   └── ExpenseEntryRow.tsx     ← client, edit + delete + highlight
│   │               ├── CreateIncomeEntryForm/
│   │               │   └── CreateIncomeEntryForm.tsx  ← client, accordion form
│   │               ├── CreateOneOffExpenseForm/
│   │               │   └── CreateOneOffExpenseForm.tsx ← client, accordion form
│   │               └── UnlockBanner/
│   │                   └── UnlockBanner.tsx        ← client, unlock-with-reason flow
│   ├── components/
│   │   ├── Navbar.tsx                     ← server component, reads user
│   │   └── SignOutButton.tsx              ← client component
│   ├── helpers/
│   │   ├── format.ts                      ← shared formatters (brlFormatter, dateFormatter)
│   │   └── date.ts                        ← todayYmd(), currentYearMonth() — "YYYY-MM-DD" / "YYYY-MM" for string-compare against Postgres `date` columns
│   ├── lib/
│   │   └── supabase/                      ← third-party integrations only
│   │       ├── client.ts                  ← browser Supabase client
│   │       └── server.ts                  ← server Supabase client
│   ├── proxy.ts                           ← auth session refresh + route protection (Next.js 16+)
│   └── types/
│       └── database.ts                    ← generated or manual DB types
└── public/
```

---

## Code organization pattern

Every route follows the same structure. Apply this pattern when adding new routes or components.

**Types** — each route has a `_types.ts` at its root. Domain row types (`BillRow`, `IncomeRow`) and grouped props (`BillsGroup`, `IncomeGroup`) live here. Components import from this file instead of defining local duplicates.

**Props** — each component defines a local (non-exported) `Props` type that accepts only the slice of data it needs. Parent components fan out the right slice to each child.

**Actions** — one server action per file under `actions/`, each with its own `"use server"` directive. A barrel `actions.ts` re-exports them (no `"use server"` on the barrel). `FormState` and sync helpers live in sibling files (`form-state.ts`, `_helpers.ts`).

**Section components** — each domain section (income, bills, expenses, balance, templates) is its own component under `_components/SectionName/SectionName.tsx`. Sections own their heading, empty state, list rendering, summary stats, and add-form toggle. The page server component fetches data and delegates rendering to sections.

**Row components** — each list item is its own component. Rows own their edit/delete state, transitions, and highlight logic. State stays local to the row.

**Create forms** — each create form is its own component. Forms own their submission state and call `onSuccess` to notify the parent.

**Shared utilities** — cross-route helpers (formatters, etc.) live in `src/helpers/`. Route-specific helpers live in the route's `_helpers.ts`. Third-party integrations (Supabase clients, etc.) live in `src/lib/`.

---

## Key gotchas

- **RLS blocks everything by default** — tables need explicit policies before the app can read/write them; queries in the Supabase SQL editor run as superuser and bypass RLS
- **Data direction** — entries always belong to the space they were created in; the household view is a read-only aggregation, never a write target; never move or copy entries between spaces
- **Bill instance amounts** — always read from `bill_instances.amount`, never from the template, so per-month overrides are respected automatically
- **Month creation is lazy** — a `months` row is created on demand the first time a user navigates to a `/months/[year]/[month]` route; bill instances are auto-generated at that point from the space's active templates. Races are handled by catching the unique-violation error and re-fetching
- **Locked months — check-on-read** — a month is effectively locked when `(year, month)` is strictly in the past AND `unlock_reason IS NULL`. The `months.locked` / `locked_at` columns were dropped in `0004`. Use `isMonthLocked({ year, month, unlock_reason })` in both the page render and every mutation server action (defense in depth)
- **Date-only columns + timezone trap** — Postgres `date` values come back as `"YYYY-MM-DD"` strings. `new Date("2026-04-01")` parses as UTC midnight, which in negative-offset timezones formats as the previous day. Always format with `Intl.DateTimeFormat(..., { timeZone: "UTC" })` for calendar-date fields
- **Member departure** — never hard delete `space_members` rows; set `left_at` instead so historical months retain attribution; label departed members in the household view using `left_at`
- **Household aggregate queries** — always query by `space_id IN (household_id, ...linked_personal_space_ids)`, not by current membership, to correctly include historical entries from departed members
- **Invitations** — match pending invites by email on every login; a dashboard banner surfaces them; unique constraint on (space_id, invited_email) prevents duplicate invites
- **Trigger naming** — the personal space trigger is `on_auth_user_created` on `auth.users`; do not drop or rename it
- **Never commit .env.local** — Supabase URL and publishable key must stay out of the repository
- **Supabase client split** — use `@/lib/supabase/client` in Client Components (browser) and `@/lib/supabase/server` in Server Components / Route Handlers; never mix them
- **Proxy runs on every request** — `src/proxy.ts` (formerly `middleware.ts`, renamed in Next.js 16+) refreshes the auth session and protects routes; `/login` and `/auth/callback` are public, everything else requires authentication
- **Publishable key (not anon key)** — Supabase deprecated legacy anon/service_role keys; use `sb_publishable_...` for the client and `sb_secret_...` for server-only operations
- **Server actions return state, don't throw** — actions called via `useActionState` return `{ error: string | null }` so the form can render the error inline. Throwing causes Next.js to show the error boundary, which is wrong for predictable failures like validation errors. Reserve throws for true crashes
- **`"use server"` files only export async functions** — types and constants must live in sibling files (e.g., `form-state.ts`). Internal sync helpers go in a non-`"use server"` file like `_helpers.ts`. The barrel `actions.ts` is also non-`"use server"` so it can re-export anything
- **Active template names are unique per space** — partial unique index `(space_id, lower(trim(name))) WHERE active = true`. To handle duplicate-violation errors gracefully, action code checks for Postgres error code `23505` and returns a friendly message
- **`redirect()` must live outside try/catch** — `redirect()` works by throwing a Next.js sentinel error; if you catch it inside try/catch, you'll mistake the success case for a failure
- **Route-private components live in `_components/`** — every client component used by a route is in `routeFolder/_components/<ComponentName>/<ComponentName>.tsx`. The `_` prefix marks the folder as private to Next.js's router (no accidental routing). Each component gets its own subfolder, even if it has no helpers yet, so it's ready to grow
- **Sub-routes get their own `_components/`** — the edit page at `bills/[id]/edit/` has its own `_components/` next to it. Component locality matches route locality
- **Lifted client state for cross-component communication** — when two child client components need to share state (e.g., calendar selects a day → bills list highlights), wrap them in a single client parent that owns the state via `useState`. Use the `key={...}` prop on the wrapper to reset the state when an upstream identity changes (e.g., year/month)
- **Calendar grid is always 6×7 = 42 cells** — `buildCalendarGrid` pads with leading days from the previous month and trailing days from the next month so the grid height stays stable across navigation
- **Income entries are routed by their `expected_date`, not the viewed month** — when the user adds income on April's page with a date in June, `createIncomeEntry` parses the date, calls `getOrCreateMonth` for the target month, and stores the entry under that month's `month_id`. The lock check runs against the **target** month, not the viewed month, so adding income to a past locked month is blocked even when the page you're on is unlocked
- **Don't `setState` inside `useEffect` to react to action state** — the React 19 lint rule `react-hooks/set-state-in-effect` flags this. Use `useTransition` + a manual `handleX(formData)` function that calls the server action and handles success/error in the same callback. `useActionState` is still fine when you don't need to react to its state changes (e.g. server-side `redirect()` after success)
- **"Net so far" subtracts overdue unpaid bills** — in `/months/[year]/[month]/page.tsx`, `netSoFar` subtracts `paidBills` **and** `overdueUnpaidBills` (unpaid instances whose `due_date <= today`). The rationale: those bills represent money that should already be gone from the account, even if the user hasn't ticked them paid yet. If you ever refactor this math, keep the two filters separate — one by `paid`, one by `due_date` — so paid future-dated bills don't get double-counted
- **Calendar dot color encodes urgency** — `CalendarStrip` renders a **blue** dot for days with bills/expenses and a **red** dot when at least one bill due that day is overdue and unpaid. The page computes `daysWithOverdueBills` server-side using `todayYmd()` string comparison against `due_date`, so no client-side date math is needed
- **Date string helpers live in `src/helpers/date.ts`** — use `todayYmd()` (`"YYYY-MM-DD"`) for comparison against Postgres `date` columns and `currentYearMonth()` (`"YYYY-MM"`) as the default value for native `<input type="month">`. Both use server-local time and are plain string formatters — no timezone parsing involved, which is the whole point
- **Savings contributions use signed amounts** — the contributions form has two buttons ("Deposit" / "Withdraw") but a single `amount` column. `parseContributionFields` returns `signedAmount` (positive for deposits, negative for withdrawals). Downstream sums, balance math, and display logic all treat `amount` as pure algebra — never re-flip the sign based on the UI button
- **Savings contributions inherit access from their parent fund** — `savings_contributions` has no `space_id`. Its RLS policies (`0007`) walk the FK to `savings_funds` and call `is_active_member(f.space_id)` there. This is what makes household-shared funds work automatically once Piece 8 lands — no changes needed in this route when fund ownership spans multiple users
- **Monthly view's savings row is read-only** — `BalanceSection` shows "Saved this month" as a derived sum from `savings_contributions` scoped to the current month. There's no inline add/edit on the monthly page; all savings CRUD happens under `/savings`. The page does still pass `savingsNet` into both `netExpected` and `netSoFar` so the balance totals reflect the cash reality after deposits/withdrawals
