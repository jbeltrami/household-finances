# Home Finances App

A personal finance planner for a small group of friends and family. Each user manages their own monthly finances, with the option to link personal spaces into a shared household view.

## Tech stack

- **Database + Auth**: Supabase (South America — São Paulo)
- **Frontend**: Next.js 16, TypeScript, Tailwind CSS
- **Hosting**: Vercel
- **Auth**: Google OAuth only (no email/password)

## Getting started

### Prerequisites

- Node.js 18+
- A Supabase project with Google OAuth configured

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env.local` file at the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<your-key>
```

Both values are in the Supabase dashboard under **Project Settings → API**.

> **Note**: `.env.local` is gitignored and must never be committed. For production (Vercel), set these same variables in **Project Settings → Environment Variables**.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login` since all routes are protected by default.

## Supabase configuration

### Database schema

The schema lives in `supabase/migrations/`:

| File | What it adds |
|---|---|
| `0001_initial_schema.sql` | All tables and the `on_auth_user_created` trigger that auto-creates a personal space on first login |
| `0002_rls_policies.sql` | Row Level Security enabled on all tables. Policies for `spaces`, `space_members`, and `recurring_bill_templates` (more added per piece) |
| `0003_bill_templates_unique_active_name.sql` | Partial unique index preventing two active templates with the same name in a space |
| `0004_months_locking_and_rls.sql` | Drops `locked` / `locked_at` from `months` (check-on-read locking). Adds SELECT/INSERT/UPDATE policies for `months` and `bill_instances` |
| `0005_income_entries_rls.sql` | SELECT/INSERT/UPDATE/DELETE policies for `income_entries` (Piece 5). DELETE is exposed because income entries are user-created freely |
| `0006_one_off_expenses_rls.sql` | SELECT/INSERT/UPDATE/DELETE policies for `one_off_expenses` (Piece 6) |
| `0007_savings_rls.sql` | SELECT/INSERT/UPDATE/DELETE policies for `savings_funds` and `savings_contributions` (Piece 7). Contribution policies walk the FK to the parent fund and reuse `is_active_member(space_id)` there, so household-shared funds inherit access automatically once Piece 8 lands |

Apply migrations by pasting their contents into the Supabase dashboard SQL editor in order. The `is_active_member(space_id)` helper function (defined in `0002`) is `SECURITY DEFINER` to avoid recursion when policies need to check membership against `space_members` itself.

### Auth provider

Google OAuth is the only auth method. Configure it in the Supabase dashboard under **Authentication → Providers → Google**. You need:

- A Google Cloud OAuth client ID and secret
- Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`

In **Authentication → URL Configuration**, set:

- Site URL: `http://localhost:3000` (update to your Vercel URL after first deploy)
- Redirect URLs: `http://localhost:3000/**` (add your Vercel URL after first deploy)

## Auth architecture

Authentication uses Supabase's cookie-based flow via `@supabase/ssr`, designed for server-rendered frameworks like Next.js.

### Supabase clients

Two client factories in `src/lib/supabase/`:

- **`client.ts`** — for Client Components (browser). Uses `createBrowserClient` which handles cookies automatically in the browser.
- **`server.ts`** — for Server Components and Route Handlers. Uses `createServerClient` with manual cookie access via Next.js's `cookies()` API.

Both read from the same env vars and produce functionally identical clients — the split exists because the browser and server access cookies differently.

### Proxy (`src/proxy.ts`)

Runs on every request (except static assets). Does two things:

1. **Session refresh** — calls `supabase.auth.getUser()` which automatically refreshes expired access tokens using the refresh token in cookies. This prevents users from being silently logged out after the access token expires (~1 hour).

2. **Route protection** — redirects unauthenticated users to `/login` and redirects authenticated users away from `/login` to `/`.

Public routes (not protected): `/login`, `/auth/callback`.

> **Note**: In Next.js 16+, the `middleware` file convention was renamed to `proxy`. Same functionality, clearer name.

### Login flow

1. User visits any page → proxy redirects to `/login`
2. User clicks "Sign in with Google" → `signInWithOAuth` redirects to Google
3. User authenticates with Google → Google redirects back to `/auth/callback?code=...`
4. Callback route exchanges the code for a session → redirects to `/`
5. On first login, Supabase's `on_auth_user_created` trigger auto-creates a personal space

## Recurring bill templates (Piece 3)

Templates live at `/bills`. They define the recurring bills tracked each month and are used to auto-generate `bill_instances` when a month is first visited (Piece 4).

### Capabilities

- **Create** — name, default amount, optional due day. Currency hardcoded to BRL for now
- **Edit** — full edit form at `/bills/[id]/edit`. Includes a "cascade" checkbox (default checked) that propagates the new amount to unpaid bill instances in the current and future months. Past months are left untouched
- **Deactivate** — soft-delete via `active = false`. Past `bill_instances` remain intact and continue to reference the deactivated template, preserving history
- **Duplicate name protection** — a partial unique index prevents two active templates with the same name (case- and whitespace-insensitive) in the same space. The action catches the Postgres unique-violation error and returns a friendly inline message

### File layout

```
src/app/bills/
├── page.tsx                                ← list + create form
├── actions.ts                              ← barrel re-export
├── actions/
│   ├── _helpers.ts                         ← shared helpers, NOT "use server"
│   ├── create-bill-template.ts             ← "use server"
│   ├── update-bill-template.ts             ← "use server"
│   └── deactivate-bill-template.ts         ← "use server"
├── form-state.ts                           ← FormState type + initial state
├── _components/
│   └── CreateBillTemplateForm/
│       └── CreateBillTemplateForm.tsx      ← client component, useActionState
└── [id]/edit/
    ├── page.tsx                            ← edit page
    └── _components/
        └── EditBillTemplateForm/
            └── EditBillTemplateForm.tsx    ← client component, useActionState
```

### Server action conventions used here

- **Each action in its own file**, with its own `"use server"` directive at the top
- **`actions.ts` is a barrel** — no `"use server"` so it can re-export anything (constants, types, async functions)
- **Sync helpers in `_helpers.ts`** — `"use server"` files can only export async functions, so utilities like `parseTemplateFields` live in a sibling file
- **Actions return `{ error: string | null }`** for predictable failures (validation, duplicate name) so forms can render the error inline via `useActionState`. Reserve throws for unexpected crashes
- **`redirect()` lives outside try/catch** — it works by throwing a Next.js sentinel error; catching it would misclassify the success case as a failure

## Monthly view (Pieces 4a, 4b, 5, 6, 7)

The monthly view at `/months/[year]/[month]` is the heart of the app. After sign-in, `/` redirects to the current month (e.g. `/months/2026/04`). Every month has its own bookmarkable URL.

### Layout

Two-column on desktop (`md:` and up), single-column on mobile:

- **Left column** (1/4 width): calendar strip — controls (prev/dropdown/next + Today) + 6×7 grid below
- **Right column** (3/4 width): unlock banner (when locked), Income section, Bills section, Net (expected) summary

The page wrapper uses `max-w-6xl` so the desktop layout has room. CalendarStrip's controls are stacked (prev + dropdown + next on row 1, Today full-width on row 2) so they fit a narrow column. On mobile, everything stacks vertically and the calendar grid is hidden via `hidden md:block`.

### Capabilities

- **On-demand month + bill instance creation** — visiting a month that doesn't yet exist creates a `months` row and one `bill_instance` per active bill template, in one page render. Revisiting the same month reuses the existing data
- **Bills section** — list of `bill_instances` with name, due date, amount, paid/pending pill, and an Edit button for the per-instance amount override
- **Per-instance amount override** — saves only that single `bill_instance.amount`, leaving the template untouched
- **Income section (Piece 5)** — list of `income_entries` with name, expected date, amount, received/pending pill, Edit, and Delete. A `+` button next to the section heading opens a collapsible inline form for adding new entries
- **Income routes by date, not by viewed month** — if you add an entry on April's page with an expected date in June, the entry is stored under June's `month_id`. The action calls `getOrCreateMonth` to lazily create the target month if needed
- **One-off expenses (Piece 6)** — list of `one_off_expenses` with name, date, amount, optional category and notes, Edit, and Delete. Same collapsible add-form pattern as income. Expenses feed into the balance math
- **Calendar badges** — small outflow dot below the day number for days with bills or expenses, small green dot for days with income expected. When a day has both, both dots show side by side. **The outflow dot is red** when at least one bill due that day is overdue and unpaid; otherwise it's blue
- **Click-to-highlight** — clicking a current-month cell highlights it with a blue ring and adds a subtle blue background to matching bill, expense, and income rows. Clicking the same day toggles off; navigating to a different month resets
- **Calendar header** — prev/next arrows, single combined month dropdown (existing months from DB + next 6 months), and a Today button that resolves through `/` so it stays fresh
- **Balance summary** — shown below the sections when there's any data. Three rows:
  - **Saved this month** — sum of `savings_contributions.amount` (signed) scoped to this month. Read-only — savings CRUD lives at `/savings`
  - **Expected net** — `total_income − total_bills − total_expenses − savings_net`
  - **Net so far** — `received_income − paid_bills − overdue_unpaid_bills − total_expenses − savings_net`. The `overdue_unpaid_bills` term catches bills that are past their due date but not yet ticked as paid — they represent money that should already be gone, so they drag the real-time balance down even before the user toggles them
- **Past-month locking (check-on-read)** — a past month is locked unless it has an `unlock_reason`. The UI hides edit affordances on locked months, and every mutation server action re-checks before writing
- **Unlock flow** — amber banner with an inline form requiring a written reason (min 5 chars). On success the reason is stored in `months.unlock_reason`, the banner disappears, and editing is enabled

### File layout

```
src/app/months/[year]/[month]/
├── page.tsx                                       ← server component, fetches data
├── _helpers.ts                                    ← getOrCreateMonth, isMonthLocked,
│                                                     checkBillInstanceEditable, checkIncomeEntryEditable,
│                                                     monthUrl, prevMonth, nextMonth, dueDateFor,
│                                                     formatMonthLabel, capitalize,
│                                                     buildMonthOptions, YearMonth, MonthRow
├── actions.ts                                     ← barrel re-export
├── actions/
│   ├── toggle-bill-paid.ts                        ← "use server"
│   ├── update-bill-instance-amount.ts             ← "use server"
│   ├── unlock-month.ts                            ← "use server"
│   ├── create-income-entry.ts                     ← "use server" (lazy-creates target month)
│   ├── toggle-income-received.ts                  ← "use server"
│   ├── update-income-amount.ts                    ← "use server"
│   ├── delete-income-entry.ts                     ← "use server"
│   ├── create-one-off-expense.ts                  ← "use server"
│   ├── update-one-off-expense.ts                  ← "use server"
│   └── delete-one-off-expense.ts                  ← "use server"
├── form-state.ts                                  ← FormState type + initial state
├── _types.ts                                      ← row types + grouped props (BillRow, IncomeGroup, etc.)
└── _components/
    ├── MonthlyViewClient/
    │   └── MonthlyViewClient.tsx                  ← client wrapper, owns highlight state, two-column grid
    ├── CalendarStrip/
    │   ├── CalendarStrip.tsx                      ← client, controls + grid + bill/income/expense dots
    │   └── _helpers.ts                            ← buildCalendarGrid (private to component)
    ├── IncomeSection/
    │   └── IncomeSection.tsx                      ← heading, list, summary, add-form toggle
    ├── BillsSection/
    │   └── BillsSection.tsx                       ← heading, list, summary
    ├── ExpensesSection/
    │   └── ExpensesSection.tsx                    ← heading, list, summary, add-form toggle
    ├── BalanceSection/
    │   └── BalanceSection.tsx                     ← saved / expected net / net so far
    ├── BillInstanceRow/
    │   └── BillInstanceRow.tsx                    ← client, paid toggle + edit + highlight
    ├── IncomeEntryRow/
    │   └── IncomeEntryRow.tsx                     ← client, received toggle + edit + delete + highlight
    ├── ExpenseEntryRow/
    │   └── ExpenseEntryRow.tsx                    ← client, edit + delete + highlight
    ├── CreateIncomeEntryForm/
    │   └── CreateIncomeEntryForm.tsx              ← client, accordion form
    ├── CreateOneOffExpenseForm/
    │   └── CreateOneOffExpenseForm.tsx            ← client, accordion form
    └── UnlockBanner/
        └── UnlockBanner.tsx                       ← client, useActionState
```

### Design notes

- **Lazy month creation handles races** — two concurrent visits to a brand-new month would both try to INSERT. The helper catches the unique-violation error (`23505`) and re-fetches, so the loser still gets the row without double-generating instances
- **Check-on-read locking is a pure function** — `isMonthLocked({ year, month, unlock_reason })` compares against today's date. Current and future months are always editable; past months are editable only if `unlock_reason` is set. No scheduled jobs, no drift
- **Defense in depth on mutations** — every mutation action (toggle, edit, delete) fetches the row's month via a nested select and runs `isMonthLocked` before writing. If the UI somehow lets a click through, the server still rejects it. For income creation specifically, the lock check runs against the **target** month derived from `expected_date`, not the viewed month
- **UTC timezone for due/expected date display** — `date` columns in Postgres come back as `YYYY-MM-DD` strings. Parsing them with `new Date(...)` treats them as UTC midnight, which shifts to the previous day in Brazilian time (UTC-3). Row components format with `Intl.DateTimeFormat(..., { timeZone: "UTC" })`. For pure-day comparisons (calendar highlight, badge dots) we parse the day directly from the string instead of going through `Date`
- **Today button points to `/`** — not a hardcoded current-month URL. If the page sits open past midnight, clicking Today still resolves to the real current month via the redirect
- **Lifted client state for cross-component highlight** — `MonthlyViewClient` owns `useState<number | null>(null)` for the highlighted day. `CalendarStrip` writes via `onSelectDay`; `BillInstanceRow` and `IncomeEntryRow` both read `highlightedDay` and apply a background style. The wrapper uses `key={` `${year}-${month}` `}` so navigating to a different month remounts and resets the state automatically
- **Calendar grid is always 42 cells** — `buildCalendarGrid(year, month)` pads with leading days from the previous month and trailing days from the next month so the grid height stays stable across navigation. Padding cells are non-interactive; current-month cells are buttons
- **`useTransition` over `useActionState` when you need to react to success/failure** — `useActionState` is fine when there's nothing to do after a successful submit (e.g. server-side `redirect()`), but combining it with `useEffect` to derive client state from `isPending` trips the React 19 `react-hooks/set-state-in-effect` lint rule. The cleaner pattern: `useTransition` + a manual `handleX(formData)` that calls the server action and handles success/error in the same callback. `BillInstanceRow`, `IncomeEntryRow`, and `CreateIncomeEntryForm` all use this pattern

## Savings funds (Piece 7)

Savings funds live at `/savings` and exist **outside** the monthly cycle. A fund has a `starting_balance`; movements are logged per month as `savings_contributions`. The running total is `starting_balance + sum(contributions)`.

### Capabilities

- **`/savings`** — list of the user's funds with running totals, plus a collapsible form to create a new fund
- **`/savings/[id]`** — fund detail page: rename, running-total card (starting balance, net contributions, current total), full contribution history grouped by month, and a form to log deposits/withdrawals against any month (native `<input type="month">`)
- **Deposits and withdrawals** — a single amount column with a signed value. The form offers two buttons (Deposit / Withdraw); the action flips the sign so the DB stores positive for deposits and negative for withdrawals. All downstream sums are pure algebra
- **Lazy target-month creation** — logging a contribution against a month that doesn't exist yet triggers the same `getOrCreateMonth` idiom as income entries. Lock enforcement runs against the **target** month
- **Monthly view integration** — the `/months/[year]/[month]` page shows a single read-only "Saved this month" row in the balance card, summing every contribution scoped to that month across every accessible fund. `savingsNet` is subtracted from both `netExpected` and `netSoFar`

### File layout

```
src/app/savings/
├── page.tsx                                       ← list funds + create form
├── _types.ts                                      ← SavingsFundRow, SavingsContributionRow
├── actions.ts                                     ← barrel re-export
├── actions/
│   ├── _helpers.ts                                ← parseFundFields, parseContributionFields (signed), fetchContributionContext
│   ├── create-savings-fund.ts                     ← "use server"
│   ├── update-savings-fund.ts                     ← "use server"
│   ├── create-savings-contribution.ts             ← "use server" (lazy-creates target month, lock check)
│   ├── update-savings-contribution.ts             ← "use server"
│   └── delete-savings-contribution.ts             ← "use server"
├── form-state.ts                                  ← FormState type + initial state
├── _components/
│   ├── CreateSavingsFundForm/
│   │   └── CreateSavingsFundForm.tsx              ← client, accordion form
│   ├── FundsListSection/
│   │   └── FundsListSection.tsx                   ← heading, empty state, list
│   └── SavingsFundRow/
│       └── SavingsFundRow.tsx                     ← client, links to fund detail
└── [id]/
    ├── page.tsx                                   ← running total + contribution history
    └── _components/
        ├── EditFundNameForm/
        │   └── EditFundNameForm.tsx               ← client, inline rename
        ├── CreateContributionForm/
        │   └── CreateContributionForm.tsx         ← client, deposit/withdraw + month picker
        ├── ContributionsSection/
        │   └── ContributionsSection.tsx           ← month-grouped history
        └── ContributionRow/
            └── ContributionRow.tsx                ← client, edit + delete
```

### Design notes

- **Access inheritance via FK** — `savings_contributions` has no `space_id`. RLS policies (`0007`) walk the FK to `savings_funds` and call `is_active_member(f.space_id)` there. When Piece 8 lands and a fund lives in a household space, every active household member automatically gets CRUD on its contributions — no changes needed in this route
- **Signed amounts everywhere** — the contribution form posts an amount + type, but the action normalizes that into a single `signedAmount` before any DB write. Downstream code (running totals, balance math, row display) never re-derives the sign from a UI flag
- **Fat-DB separation** — the route follows the same Server-Component-reads / Server-Action-writes split as the rest of the app. Reads happen in `page.tsx` via `createClient()` during render; writes happen in `"use server"` actions invoked via `useActionState` / `useTransition`. RLS is the single source of truth for access control

## Build order

| Piece | Scope                                                          | Status |
| ----- | -------------------------------------------------------------- | ------ |
| 1     | Supabase schema + auth + personal space auto-creation trigger  | Done   |
| 2     | Next.js scaffold + Supabase client setup + Google OAuth login  | Done   |
| 3     | Recurring bill templates — create, edit, deactivate            | Done   |
| 4a    | Monthly view core — routes, on-demand creation, paid toggle    | Done   |
| 4b    | Monthly view top calendar — calendar strip, badges, picker     | Done   |
| 5     | Income entries — add/edit/mark received (one-off only)         | Done           |
| 6     | One-off expenses + monthly balance calculation                 | Done           |
| 7     | Savings funds — create fund, log contributions, running total  | In progress    |
| 8     | Shared spaces — household creation, invite flow, aggregate     | —              |
| 9     | Recurring income templates — biweekly / monthly cadence        | —              |
