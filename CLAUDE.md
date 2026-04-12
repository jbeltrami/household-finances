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
| 4     | Monthly view — navigate months, auto-generate bill instances, paid/unpaid toggle | ⬜ Next |
| 5     | Income entries — add/edit/mark received within a month                           | ⬜      |
| 6     | One-off expenses + monthly balance calculation                                   | ⬜      |
| 7     | Savings funds — create fund, log contributions, running total                    | ⬜      |
| 8     | Shared spaces — household creation, invite flow, aggregate view                  | ⬜      |

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
│       └── 0003_bill_templates_unique_active_name.sql  ← partial unique index
├── src/
│   ├── app/
│   │   ├── layout.tsx                     ← root layout (HTML shell, fonts, navbar)
│   │   ├── page.tsx                       ← home page (protected)
│   │   ├── globals.css                    ← Tailwind imports
│   │   ├── login/
│   │   │   └── page.tsx                   ← Google OAuth login page
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts               ← OAuth callback handler
│   │   └── bills/                         ← recurring bill templates (Piece 3)
│   │       ├── page.tsx                   ← list + create form
│   │       ├── actions.ts                 ← barrel re-export of server actions
│   │       ├── actions/
│   │       │   ├── _helpers.ts            ← shared helpers (no "use server")
│   │       │   ├── create-bill-template.ts
│   │       │   ├── update-bill-template.ts
│   │       │   └── deactivate-bill-template.ts
│   │       ├── form-state.ts              ← FormState type + initial state
│   │       ├── CreateBillTemplateForm.tsx ← client component, useActionState
│   │       └── [id]/edit/
│   │           ├── page.tsx               ← edit page
│   │           └── EditBillTemplateForm.tsx
│   ├── components/
│   │   ├── Navbar.tsx                     ← server component, reads user
│   │   └── SignOutButton.tsx              ← client component
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts                  ← browser Supabase client
│   │       └── server.ts                  ← server Supabase client
│   ├── proxy.ts                           ← auth session refresh + route protection (Next.js 16+)
│   └── types/
│       └── database.ts                    ← generated or manual DB types
└── public/
```

---

## Key gotchas

- **RLS blocks everything by default** — tables need explicit policies before the app can read/write them; queries in the Supabase SQL editor run as superuser and bypass RLS
- **Data direction** — entries always belong to the space they were created in; the household view is a read-only aggregation, never a write target; never move or copy entries between spaces
- **Bill instance amounts** — always read from `bill_instances.amount`, never from the template, so per-month overrides are respected automatically
- **Month creation** — a `months` row must exist before inserting any income entries, bill instances, or one-off expenses for that month
- **Locked months** — check `months.locked` before any insert/update on child tables; the app should block edits and prompt for an unlock reason
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
