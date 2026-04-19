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

- **Month-by-month tracker** — the month is the primary container for all data
- **No fixed paycheck schedule** — users add income entries freely per month
- **Recurring bill templates** — defined once, instances auto-generated per month
- **Per-instance amount overrides** — a bill instance can differ from its template for that month only, without affecting the template or other months
- **Past months auto-lock** — locked when a new month begins; unlocking requires a written reason (no password re-entry)
- **Spaces with parent linking** — a personal space can be linked to a shared space; its entries roll up into the shared-space aggregate view
- **Data flows one way** — personal → shared only; a personal-space entry seen in the shared view is read-only there; the shared space can have its *own* entries (joint expenses), which are writable only from within the shared view; entries always belong to the space they were created in
- **Historical participation preserved** — when someone leaves a shared space, their past entries remain visible in historical months with correct attribution
- **Shared-space entries** — the shared space can also have its own entries (joint expenses not belonging to any specific member)
- **Savings funds** — live outside the monthly cycle; contributions are logged per month; total = starting_balance + sum of all contributions
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

```sql
spaces
  id, name, type (personal | shared)
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
  unlock_reason (nullable), created_at
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
that space. Past months lock automatically (check-on-read); editing requires an unlock reason.

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

- New `/spaces/[spaceId]/income` page mirroring `/spaces/[spaceId]/bills` (list active templates, create, edit, deactivate)
- Cadence picker in the create/edit form (Quinzenal / Mensal)
- Monthly view continues to support both template-generated entries and free-form one-offs

This piece is strictly additive to Piece 5: existing one-off entries stay valid, the `template_id` column is nullable.

---

## Supabase

- Project region: South America (São Paulo)
- RLS: enabled on all tables
- Auth provider: Google OAuth only
- Migrations live in `supabase/migrations/` (see `history.md` for detailed descriptions of each migration)
- Current highest migration: `0012_invitee_join_policy.sql` — next new migration should be `0013_*.sql`

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
- **Data direction** — entries always belong to the space they were created in; personal-space entries seen in the shared-space view are read-only there; shared-space entries (joint expenses) are writable only from within the shared view; never move or copy entries between spaces
- **Bill instance amounts** — always read from `bill_instances.amount`, never from the template, so per-month overrides are respected automatically
- **Month creation is lazy; bill-instance sync runs on every read** — a `months` row is created on demand the first time a user navigates to a `/spaces/[spaceId]/months/[year]/[month]` route. `getOrCreateMonth` also calls `syncBillInstances` on **every** read (not just on creation), which backfills a `bill_instances` row for every active template that doesn't yet have one in that month. This handles the case where a template is created after the month row already exists, as well as template reactivation and post-unlock editing. The sync is idempotent — a SELECT for existing instances, a filter, and an INSERT of only the missing rows. Races between concurrent visits are handled by the `(month_id, template_id)` unique constraint; the loser's INSERT gets a 23505 which the helper silently swallows
- **Locked months — check-on-read** — a month is effectively locked when `(year, month)` is strictly in the past AND `unlock_reason IS NULL`. The `months.locked` / `locked_at` columns were dropped in `0004`. Use `isMonthLocked({ year, month, unlock_reason })` in both the page render and every mutation server action (defense in depth)
- **Date-only columns + timezone trap** — Postgres `date` values come back as `"YYYY-MM-DD"` strings. `new Date("2026-04-01")` parses as UTC midnight, which in negative-offset timezones formats as the previous day. Always format with `Intl.DateTimeFormat(..., { timeZone: "UTC" })` for calendar-date fields
- **Member departure** — never hard delete `space_members` rows; set `left_at` instead so historical months retain attribution; label departed members in the shared-space view using `left_at`. `parent_space_id` on the personal space is **not** cleared on leave, so the historical link from personal → shared is preserved
- **Shared-space aggregate queries** — always query by `space_id IN (shared_space_id, ...linked_personal_space_ids)`, computed from `parent_space_id` at query time, not from current `space_members` membership. Because `parent_space_id` is preserved on leave, this naturally includes historical entries from departed members
- **SELECT is cross-space, writes are not** — since migration `0010`, every SELECT policy on a domain table uses `can_read_space(space_id)`, which returns true for direct membership OR indirect membership via `parent_space_id`. This is what lets the shared-space aggregate query see rows from other members' personal spaces. INSERT/UPDATE/DELETE policies deliberately still use `is_active_member(space_id)` — a shared-space member must NOT be able to mutate another member's personal-space entries from the shared view. If you add a new domain table, SELECT should use `can_read_space`, writes should use `is_active_member`. Match the pattern
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
- **"Net so far" subtracts overdue unpaid bills** — in `/spaces/[spaceId]/months/[year]/[month]/page.tsx`, `netSoFar` subtracts `paidBills` **and** `overdueUnpaidBills` (unpaid instances whose `due_date <= today`). The rationale: those bills represent money that should already be gone from the account, even if the user hasn't ticked them paid yet. If you ever refactor this math, keep the two filters separate — one by `paid`, one by `due_date` — so paid future-dated bills don't get double-counted
- **Calendar dot color encodes urgency** — `CalendarStrip` renders a **blue** dot for days with bills/expenses and a **red** dot when at least one bill due that day is overdue and unpaid. The page computes `daysWithOverdueBills` server-side using `todayYmd()` string comparison against `due_date`, so no client-side date math is needed
- **Date string helpers live in `src/helpers/date.ts`** — use `todayYmd()` (`"YYYY-MM-DD"`) for comparison against Postgres `date` columns and `currentYearMonth()` (`"YYYY-MM"`) as the default value for native `<input type="month">`. Both use server-local time and are plain string formatters — no timezone parsing involved, which is the whole point
- **Savings contributions use signed amounts** — the contributions form has two buttons ("Deposit" / "Withdraw") but a single `amount` column. `parseContributionFields` returns `signedAmount` (positive for deposits, negative for withdrawals). Downstream sums, balance math, and display logic all treat `amount` as pure algebra — never re-flip the sign based on the UI button
- **Savings contributions inherit access from their parent fund** — `savings_contributions` has no `space_id`. Its RLS policies (`0007`) walk the FK to `savings_funds` and call `is_active_member(f.space_id)` there. This is what makes shared-space funds work automatically — no extra wiring needed when fund ownership spans multiple users
- **Monthly view's savings row is read-only** — `BalanceSection` shows "Saved this month" as a derived sum from `savings_contributions` scoped to the current month. There's no inline add/edit on the monthly page; all savings CRUD happens under `/spaces/[spaceId]/savings`. The page does still pass `savingsNet` into both `netExpected` and `netSoFar` so the balance totals reflect the cash reality after deposits/withdrawals
- **Supabase INSERT + `.select()` + RLS chicken-and-egg** — if you create a row and immediately need its ID via `.select().single()`, PostgREST evaluates the RETURNING clause against the SELECT RLS policy. If the SELECT policy requires membership that doesn't exist yet (e.g. creating a space before adding yourself as a member), the RETURNING is blocked and Supabase surfaces an RLS error. Fix: generate the UUID client-side with `crypto.randomUUID()` and pass it in the insert, bypassing the need for `.select().single()` entirely
- **RLS subqueries are subject to other tables' RLS** — a `WITH CHECK` expression that subqueries another table runs under the caller's RLS context. If the target table's SELECT policy blocks the lookup (e.g. checking `spaces.created_by` when the user can't read that space yet), the policy silently fails. Always wrap cross-table checks in SECURITY DEFINER helper functions (like `is_space_creator`, `has_accepted_invitation`) to bypass the other table's RLS. Convention: name them `is_X` / `has_X`, mark them `SECURITY DEFINER STABLE`, lock `search_path = public`
- **`revalidatePath("/", "layout")` for membership changes** — creating a shared space, accepting an invite, or declining one changes the user's membership list. The Navbar reads memberships server-side in the root layout, which Next.js caches across navigations. Call `revalidatePath("/", "layout")` in any action that modifies `space_members` to bust this cache and make the Navbar dropdown update immediately
