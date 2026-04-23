# Home Finances App — Project Context

## What this is

A personal finance planner for a small group of friends and family. Each user
manages their own monthly finances, with the option to link personal spaces into
a shared-space view (shared finances for couples, roommates, or any multi-person
group — not just households). Built on Supabase (database + auth) with a Next.js
frontend hosted on Vercel.

For historical build decisions (completed piece plans, migration narratives, repo snapshots), see `history.md`.

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

- **Month-by-month tracker** — the month is the primary *UI* container; the data layer is a date-keyed ledger (see below)
- **No fixed paycheck schedule** — users add income entries freely
- **Recurring bill templates expand virtually** — templates define recurrence rules; occurrences materialize as rows only when the user pays, overrides, or skips
- **Per-occurrence amount overrides** — overriding a bill's amount for one month writes an exception row in `entries` without touching the template or other months
- **Skip per occurrence** — a single occurrence of a recurring bill can be cancelled without affecting the template or other months
- **Past months auto-lock** — locked when a new month begins; unlocking requires a written reason stored in `month_unlocks`
- **Spaces with parent linking** — a personal space can be linked to a shared space; its entries roll up into the shared-space aggregate view
- **Data flows one way** — personal → shared only; a personal-space entry seen in the shared view is read-only there; the shared space can have its *own* entries (joint expenses), which are writable only from within the shared view; entries always belong to the space they were created in
- **Historical participation preserved** — when someone leaves a shared space, their past entries remain visible in historical months with correct attribution
- **Shared-space entries** — the shared space can also have its own entries (joint expenses not belonging to any specific member)
- **Savings funds** — live outside the monthly cycle; contributions are date-keyed; total = starting_balance + sum of all contributions
- **Google OAuth only** — first login auto-creates the user's personal space via a database trigger
- **Invite by email** — shared-space owners invite by email; pending invites wait for the person to sign up if they don't have an account yet; accepted/declined via dashboard banner

---

## Core concept: Spaces

A Space is a budget context. Types: `personal` and `shared`.

- Every user gets a **personal space** automatically on first login (DB trigger)
- Personal spaces can be **linked to a shared space** via `parent_space_id`
- The shared-space view aggregates entries from the shared space itself + all linked personal spaces
- Entries in a personal space are attributed to their owner in the shared-space view
- An unlinked personal space is fully private
- **Leaving a shared space preserves the link** — `space_members.left_at` gets set to gate future write access, but `parent_space_id` stays pointing at the shared space. This is what keeps historical entries visible in the aggregate view. Personal-space data is never touched on leave

---

## Data model

The ledger model — a single `entries` table unifies one-off expenses and exceptions to recurring templates. No more per-month bill-instance rows.

```sql
spaces
  id, name, type (personal | shared)
  created_by, parent_space_id (nullable), created_at

space_members
  space_id, user_id, role (owner | member)
  joined_at, left_at (nullable)          -- never hard deleted; left_at set on departure

invitations
  id, space_id, invited_email
  invited_by (user_id)
  status (pending | accepted | declined)
  created_at, responded_at
  unique (space_id, invited_email)

recurring_bill_templates
  id, space_id, name
  default_amount, currency, category (nullable), active, created_at
  cadence ('monthly' | 'weekly' | 'biweekly'), due_day, day_of_week, biweekly_anchor
  installments_total (nullable int), installments_start_month (nullable date, day=1)
  -- installments_total set => bounded series on monthly cadence; null => indefinite

entries
  id, space_id, date, name, amount, currency
  category (nullable), notes (nullable)
  paid (bool, default false)
  skipped (bool, default false)
  template_id (nullable fk -> recurring_bill_templates)
  installments_covered (int, default 1)
  created_at
  -- template_id NULL  => one-off entry (free-form)
  -- template_id SET   => exception row for that template occurrence on `date`
  -- Partial unique (template_id, date) WHERE template_id IS NOT NULL
  -- CHECK: skipped => template_id SET AND paid=false
  -- CHECK: installments_covered > 1 => template_id SET

month_unlocks
  space_id, year, month, reason, unlocked_at, unlocked_by
  PK (space_id, year, month)

income_entries
  id, space_id, expected_date, name, amount, currency, received, created_at

savings_funds
  id, space_id, name, currency, starting_balance, created_at

savings_contributions
  id, fund_id, date, amount (signed), notes, created_at
```

### How the monthly view works

A month is purely a UI lens over the date-keyed data layer. The page at `/spaces/[spaceId]/months/[year]/[month]` does the following:

1. Compute the date range `[first-of-month, last-of-month]`
2. Call `getEntriesForMonth(supabase, spaceIds, year, month)` — see `src/helpers/ledger.ts`. This returns `ResolvedEntry[]` by:
   - Selecting materialized entries in the date range (one-offs + template exceptions)
   - Walking each active template and expanding virtual occurrences in the range (monthly/weekly/biweekly)
   - Dropping virtual occurrences that already have a materialized exception
   - Filtering out `skipped` materialized rows
3. Fetch income and savings contributions by date range directly
4. Compute lock state: `(year, month)` strictly past AND no row in `month_unlocks` → locked

Virtual entries have `id = null`. Mutations on a virtual entry materialize a new row in `entries` first; mutations on materialized rows update/delete them directly.

### How the shared-space view works

Query: all entries from the shared space + all entries from spaces where
`parent_space_id = shared_space.id`. Entries are attributed by `space_id`
so the UI can show "João — Unimed R$1.200" vs "Maria — Gym R$150".

Past months retain attribution even after someone leaves, because entries carry
their original `space_id` permanently *and* `parent_space_id` stays set on leave.
The shared-space view labels departed members using `space_members.left_at`.

### How invitations work

1. Shared-space owner types an email address
2. An `invitations` row is created with `status: pending`
3. If the person already has an account, they see a dashboard banner on next login
4. If not, the invite waits — when they sign up with that email via Google, the banner appears
5. Accepting → `space_members` row created, `status` → accepted
6. Declining → `status` → declined, nothing else changes

---

## Auth flow

1. User lands on app → clicks "Sign in with Google"
2. Google OAuth → Supabase handles the redirect
3. On first login, a DB trigger (`on_auth_user_created`) fires:
   - Creates a `personal` space named after the user's Google display name
   - Adds the user as `owner` of that space
4. App checks for pending invitations matching the user's email
5. User lands on the dashboard at `/` (with invite banner if applicable)

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

## Next up — Piece 9: Recurring income templates

Income recurrence was originally considered alongside Piece 5 but split out so Piece 5 could ship simple one-off entries first. Income recurrence is harder than bill recurrence for one reason: real-world paychecks often follow a **biweekly cycle** (every other Thursday) that doesn't align with month boundaries. A given calendar month can contain 0, 1, 2, or 3 paychecks depending on alignment.

With the ledger model in place, this piece is a small extension:

**Data model sketch:**

```sql
recurring_income_templates
  id, space_id
  name, default_amount, currency
  cadence              -- 'biweekly' | 'monthly'
  biweekly_anchor      -- date, only set when cadence='biweekly'
  monthly_day          -- int 1-31, only set when cadence='monthly'
  active, created_at
  CHECK (
    (cadence = 'biweekly' AND biweekly_anchor IS NOT NULL AND monthly_day IS NULL) OR
    (cadence = 'monthly'  AND monthly_day IS NOT NULL AND biweekly_anchor IS NULL)
  )
```

`income_entries` will gain a nullable `template_id` and follow the same virtual-expansion + exception-row pattern as bills. The `expandTemplateForMonth` logic in `src/helpers/ledger.ts` already handles all three cadences and can be generalized for income.

**UI surface:**

- New `/spaces/[spaceId]/income` page mirroring `/spaces/[spaceId]/bills` (list active templates, create, edit, deactivate)
- Cadence picker in the create/edit form (Quinzenal / Mensal)
- Monthly view continues to support both template-generated entries and free-form one-offs

---

## Supabase

- Project region: South America (São Paulo)
- RLS: enabled on all tables
- Auth provider: Google OAuth only
- Migrations live in `supabase/migrations/` (see `history.md` for the evolution story)
- Current highest migration: `0001_baseline.sql` — next new migration should be `0002_*.sql`

### Environment variables

Create a `.env.local` file at the project root (never commit this file):

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
```

Both values are found in Supabase under **Project Settings → API**.

---

## Code organization pattern

Every route follows the same structure. Apply this pattern when adding new routes or components.

**Types** — each route has a `_types.ts` at its root. Domain row types (`EntryRow`, `IncomeRow`) and grouped props (`BillsGroup`, `IncomeGroup`) live here. Components import from this file instead of defining local duplicates.

**Props** — each component defines a local (non-exported) `Props` type that accepts only the slice of data it needs. Parent components fan out the right slice to each child.

**Actions** — one server action per file under `actions/`, each with its own `"use server"` directive. A barrel `actions.ts` re-exports them (no `"use server"` on the barrel). `FormState` and sync helpers live in sibling files (`form-state.ts`, `_helpers.ts`).

**Section components** — each domain section (income, bills, expenses, balance, templates) is its own component under `_components/SectionName/SectionName.tsx`. Sections own their heading, empty state, list rendering, summary stats, and add-form toggle. The page server component fetches data and delegates rendering to sections.

**Row components** — each list item is its own component. Rows own their edit/delete state, transitions, and highlight logic. State stays local to the row.

**Create forms** — each create form is its own component. Forms own their submission state and call `onSuccess` to notify the parent.

**Shared utilities** — cross-route helpers live in `src/helpers/`. Key files:
- `date.ts` — formatters, range builders, Postgres-date string utilities
- `lock.ts` — `isMonthLocked`, `checkDateEditable`, `checkEntryEditable`, `fetchMonthUnlock`
- `ledger.ts` — `ResolvedEntry`, `getEntriesForMonth`, `expandTemplateForMonth`, installment math
- `paths.ts`, `format.ts`, `spaces.ts` — URL builders, currency/date formatters, space-lookup helpers

Route-specific helpers live in the route's `_helpers.ts`. Third-party integrations (Supabase clients, etc.) live in `src/lib/`.

---

## Key gotchas

- **RLS blocks everything by default** — tables need explicit policies before the app can read/write them; queries in the Supabase SQL editor run as superuser and bypass RLS
- **Data direction** — entries always belong to the space they were created in; personal-space entries seen in the shared-space view are read-only there; shared-space entries (joint expenses) are writable only from within the shared view; never move or copy entries between spaces
- **Virtual vs materialized entries** — an `EntryRow` with `id = null` is virtual (a template occurrence with no DB row yet). Mutations must materialize it first. Component code doesn't care which is which — `getEntriesForMonth` unifies them. Server actions accept a discriminated-union target: `{ kind: "materialized", entryId }` or `{ kind: "virtual", templateId, date, spaceId }`
- **Template edits flow through virtual occurrences for free** — changing `default_amount` on a template automatically propagates to every unpaid, non-overridden occurrence, because those are computed from the template at query time. Only materialized rows (overrides, paid, skipped) stay frozen. No "cascade" step needed anymore
- **Lock state lives in `month_unlocks`** — a past month is effectively locked unless a row exists in `month_unlocks(space_id, year, month)`. Use `isMonthLocked({year, month, hasUnlock})` for the pure check in page renders; use `checkDateEditable(supabase, spaceId, date)` or `checkEntryEditable(supabase, entryId)` in mutation server actions for the full look-up-and-check
- **Date-only columns + timezone trap** — Postgres `date` values come back as `"YYYY-MM-DD"` strings. `new Date("2026-04-01")` parses as UTC midnight, which in negative-offset timezones formats as the previous day. Always format with `Intl.DateTimeFormat(..., { timeZone: "UTC" })` for calendar-date fields. `src/helpers/date.ts` has `formatDateYmd`, `parseYearMonthFromYmd`, `getMonthRange` that stay in string-space
- **Member departure** — never hard delete `space_members` rows; set `left_at` instead so historical months retain attribution; label departed members in the shared-space view using `left_at`. `parent_space_id` on the personal space is **not** cleared on leave, so the historical link from personal → shared is preserved
- **Shared-space aggregate queries** — always query by `space_id IN (shared_space_id, ...linked_personal_space_ids)`, computed from `parent_space_id` at query time, not from current `space_members` membership. Because `parent_space_id` is preserved on leave, this naturally includes historical entries from departed members
- **SELECT is cross-space, writes are not** — every SELECT policy on a domain table uses `can_read_space(space_id)`, which returns true for direct membership OR indirect membership via `parent_space_id`. This is what lets the shared-space aggregate query see rows from other members' personal spaces. INSERT/UPDATE/DELETE policies use `is_active_member(space_id)` — a shared-space member must NOT be able to mutate another member's personal-space entries from the shared view. If you add a new domain table, SELECT should use `can_read_space`, writes should use `is_active_member`. Match the pattern
- **Invitations** — match pending invites by email on every login; a dashboard banner surfaces them; unique constraint on (space_id, invited_email) prevents duplicate invites
- **Trigger naming** — the personal space trigger is `on_auth_user_created` on `auth.users`; do not drop or rename it
- **Never commit .env.local** — Supabase URL and publishable key must stay out of the repository
- **Supabase client split** — use `@/lib/supabase/client` in Client Components (browser) and `@/lib/supabase/server` in Server Components / Route Handlers; never mix them
- **Proxy runs on every request** — `src/proxy.ts` (formerly `middleware.ts`, renamed in Next.js 16+) refreshes the auth session and protects routes; `/login` and `/auth/callback` are public, everything else requires authentication
- **Publishable key (not anon key)** — Supabase deprecated legacy anon/service_role keys; use `sb_publishable_...` for the client and `sb_secret_...` for server-only operations
- **Server actions return state, don't throw** — actions called via `useActionState` return `{ error: string | null }` so the form can render the error inline. Throwing causes Next.js to show the error boundary, which is wrong for predictable failures like validation errors. Reserve throws for true crashes. Toggle-style actions invoked via `useTransition` can throw because there's no action-state surface to render against
- **`"use server"` files only export async functions** — types and constants must live in sibling files (e.g., `form-state.ts`). Internal sync helpers go in a non-`"use server"` file like `_helpers.ts`. The barrel `actions.ts` is also non-`"use server"` so it can re-export anything
- **Active template names are unique per space** — partial unique index `(space_id, lower(trim(name))) WHERE active = true`. To handle duplicate-violation errors gracefully, action code checks for Postgres error code `23505` and returns a friendly message
- **`redirect()` must live outside try/catch** — `redirect()` works by throwing a Next.js sentinel error; if you catch it inside try/catch, you'll mistake the success case for a failure
- **Route-private components live in `_components/`** — every client component used by a route is in `routeFolder/_components/<ComponentName>/<ComponentName>.tsx`. The `_` prefix marks the folder as private to Next.js's router (no accidental routing). Each component gets its own subfolder, even if it has no helpers yet, so it's ready to grow
- **Sub-routes get their own `_components/`** — the edit page at `bills/[id]/edit/` has its own `_components/` next to it. Component locality matches route locality
- **Lifted client state for cross-component communication** — when two child client components need to share state (e.g., calendar selects a day → bills list highlights), wrap them in a single client parent that owns the state via `useState`. Use the `key={...}` prop on the wrapper to reset the state when an upstream identity changes (e.g., year/month)
- **Calendar grid is always 6×7 = 42 cells** — `buildCalendarGrid` pads with leading days from the previous month and trailing days from the next month so the grid height stays stable across navigation
- **Entries route by their `date`, not the viewed month** — when the user adds an entry on April's page with a date in June, the action inserts under that date and revalidates both the viewed and target months' paths. The lock check runs against the target date's month, so adding to a past locked month is blocked even when the page you're on is unlocked
- **Don't `setState` inside `useEffect` to react to action state** — the React 19 lint rule `react-hooks/set-state-in-effect` flags this. Use `useTransition` + a manual `handleX(formData)` function that calls the server action and handles success/error in the same callback. `useActionState` is still fine when you don't need to react to its state changes (e.g. server-side `redirect()` after success)
- **"Net so far" subtracts overdue unpaid bills** — `netSoFar` subtracts `paidBills` **and** `overdueUnpaidBills` (unpaid entries whose `date <= today`). The rationale: those bills represent money that should already be gone from the account, even if the user hasn't ticked them paid yet. If you ever refactor this math, keep the two filters separate — one by `paid`, one by `date` — so paid future-dated bills don't get double-counted
- **Calendar dot color encodes urgency** — `CalendarStrip` renders a **blue** dot for days with bills/expenses and a **red** dot when at least one bill due that day is overdue and unpaid. The page computes `daysWithOverdueBills` server-side using `todayYmd()` string comparison against each entry's `date`, so no client-side date math is needed
- **Date string helpers live in `src/helpers/date.ts`** — use `todayYmd()` (`"YYYY-MM-DD"`) for comparison against Postgres `date` columns and `currentYearMonth()` (`"YYYY-MM"`) as the default value for native `<input type="month">`. `getMonthRange(year, month)` returns inclusive `{start, end}` strings for date-range queries. All plain string formatters — no timezone parsing involved
- **Savings contributions use signed amounts** — the form has two buttons ("Deposit" / "Withdraw") but a single `amount` column. `parseContributionFields` returns `signedAmount` (positive for deposits, negative for withdrawals). Downstream sums, balance math, and display logic all treat `amount` as pure algebra — never re-flip the sign based on the UI button
- **Savings contributions inherit access from their parent fund** — `savings_contributions` has no `space_id`. Its RLS policies walk the FK to `savings_funds` and call `is_active_member(f.space_id)` or `can_read_space(f.space_id)` there. This is what makes shared-space funds work automatically — no extra wiring needed when fund ownership spans multiple users
- **Monthly view's savings row is read-only** — `BalanceSection` shows "Saved this month" as a derived sum from `savings_contributions` scoped to the current month (date range, not `month_id`). There's no inline add/edit on the monthly page; all savings CRUD happens under `/spaces/[spaceId]/savings`. The page does still pass `savingsNet` into both `netExpected` and `netSoFar` so the balance totals reflect the cash reality after deposits/withdrawals
- **Supabase INSERT + `.select()` + RLS chicken-and-egg** — if you create a row and immediately need its ID via `.select().single()`, PostgREST evaluates the RETURNING clause against the SELECT RLS policy. If the SELECT policy requires membership that doesn't exist yet (e.g. creating a space before adding yourself as a member), the RETURNING is blocked and Supabase surfaces an RLS error. Fix: generate the UUID client-side with `crypto.randomUUID()` and pass it in the insert, bypassing the need for `.select().single()` entirely
- **RLS subqueries are subject to other tables' RLS** — a `WITH CHECK` expression that subqueries another table runs under the caller's RLS context. If the target table's SELECT policy blocks the lookup, the policy silently fails. Always wrap cross-table checks in SECURITY DEFINER helper functions (like `is_space_creator`, `has_accepted_invitation`) to bypass the other table's RLS. Convention: name them `is_X` / `has_X`, mark them `SECURITY DEFINER STABLE`, lock `search_path = public`
- **Installment bills compress the schedule virtually** — a template with `installments_total` emits one virtual occurrence per month starting at `installments_start_month`. Paying an entry with `installments_covered > 1` is a prepayment — one payment absorbing multiple installments; amount auto-scales to `default × covered`. The expansion helper in `ledger.ts` shifts the effective end earlier by `sum(covered - 1) across paid entries`, so the total generated coverage always lands at `installments_total` with no row-deletion dance. Progress in the UI is `sum(covered for paid) / installments_total`. Installments are gated to monthly cadence; a CHECK constraint enforces this alongside `day(start_month) = 1`
- **`revalidatePath("/", "layout")` for membership changes** — creating a shared space, accepting an invite, or declining one changes the user's membership list. The Navbar reads memberships server-side in the root layout, which Next.js caches across navigations. Call `revalidatePath("/", "layout")` in any action that modifies `space_members` to bust this cache and make the Navbar dropdown update immediately
