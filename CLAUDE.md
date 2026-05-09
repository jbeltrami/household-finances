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
| Frontend        | Next.js + Tailwind CSS                       |
| PDF rendering   | `@react-pdf/renderer` (server-side)          |
| Email           | Hostinger SMTP + `nodemailer` (`from: joao@jbeltrami.com`) |
| WhatsApp        | Twilio WhatsApp (sandbox, direct REST — no SDK)            |
| Cron            | Vercel Cron — monthly reports (`0 11 1 * *`) + daily WhatsApp overdue check (`0 11 * * *`), both 08:00 São Paulo |
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
- **Google OAuth only** — first login auto-creates the user's personal space via a database trigger
- **Invite by email** — shared-space owners invite by email; pending invites wait for the person to sign up if they don't have an account yet; accepted/declined via dashboard banner
- **Monthly PDF reports** — on the 1st of each month at 08:00 São Paulo, a Vercel Cron generates a PDF mirroring the monthly view for each opted-in personal space and emails it (with the PDF attached) to the owner. PDFs are also browseable at `/spaces/[id]/reports` with manual generate / regenerate / send / download. Per-space opt-out lives at `/spaces/[id]/settings`. Personal spaces only — shared-space members do not get auto-emailed reports
- **WhatsApp overdue alerts** — opt-in (default off). Per-space settings at `/spaces/[id]/settings` capture an E.164 phone and an enabled flag. A daily Vercel Cron (`0 11 * * *` — 08:00 São Paulo) finds bills whose `date <= yesterday AND paid=false AND template_id IS NOT NULL`, scoped to the current month (past months are locked, so out of scope), and sends a single pt-BR digest message via Twilio WhatsApp. One alert per bill, ever (idempotency log: `whatsapp_notifications_sent`). One-off entries (`template_id IS NULL`) are expenses, not obligations, and never trigger alerts. Currently uses Twilio's free sandbox number — recipients must send `join <code>` to `+1 415 523 8886` once before any message lands

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

monthly_reports
  id, space_id, year, month
  storage_path                          -- {space_id}/{year}-{month}.pdf
  generated_at, sent_at (nullable)      -- sent_at null until the email goes out
  unique (space_id, year, month)        -- idempotency lock for cron + regenerate

monthly_report_settings
  space_id PK, enabled (bool, default true)
  -- Absence of a row = enabled (default-on). Cron filter is:
  -- personal spaces MINUS rows where enabled = false.
```

### How the monthly view works

A month is purely a UI lens over the date-keyed data layer. The page at `/spaces/[spaceId]/months/[year]/[month]` does the following:

1. Compute the date range `[first-of-month, last-of-month]`
2. Call `getEntriesForMonth(supabase, spaceIds, year, month)` — see `src/helpers/ledger.ts`. This returns `ResolvedEntry[]` by:
   - Selecting materialized entries in the date range (one-offs + template exceptions)
   - Walking each active template and expanding virtual occurrences in the range (monthly/weekly/biweekly)
   - Dropping virtual occurrences that already have a materialized exception
   - Filtering out `skipped` materialized rows
3. Fetch income by date range directly
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

## Future improvements

- **Removing shared spaces.** The shared-space concept (the `parent_space_id` linkage, shared-space aggregate views, the `can_read_space` cross-space SELECT pattern, the invitation flow) is slated for removal once the monthly-report feature lands. The app simplifies back to one personal space per user. New domain tables added in the meantime should prefer `is_active_member` over `can_read_space` for SELECT policies (already the case for `monthly_reports`).
- **Language picker (i18n).** UI labels are currently English-only; pt-BR appears only in user-facing artifacts (PDF body, email body, monthly view month labels). Future work: a per-user language preference (pt-BR / en-US) that flips both the UI surface and the document/email language consistently. Stored on the user (or per-space) and respected by both server-rendered text and the PDF/email templates.
- **Recurring income templates.** Income recurrence was split out so Piece 5 could ship simple one-off entries first. Real-world paychecks often follow a **biweekly cycle** (every other Thursday) that doesn't align with month boundaries — a calendar month can contain 0–3 paychecks depending on alignment. With the ledger model in place this is a small extension: a `recurring_income_templates` table mirroring `recurring_bill_templates` (cadence: `biweekly | monthly`, anchor or due-day), `income_entries` gaining a nullable `template_id` and following the same virtual-expansion + exception-row pattern as bills, and a new `/spaces/[id]/income` page mirroring `/bills`. The `expandTemplateForMonth` helper in `src/helpers/ledger.ts` already handles all three cadences and can be generalized for income.

---

## Supabase

- Project region: South America (São Paulo)
- RLS: enabled on all tables
- Auth provider: Google OAuth only
- Migrations live in `supabase/migrations/` (see `history.md` for the evolution story)
- Current highest migration: `0005_drop_savings.sql` — next new migration should be `0006_*.sql`

### Environment variables

Create a `.env.local` file at the project root (never commit this file):

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
SUPABASE_SECRET_KEY=<your-secret-key>
```

All three values are found in Supabase under **Project Settings → API**. The secret key (`sb_secret_...`) is used by the admin client for service-role operations and must never be exposed to the browser bundle (no `NEXT_PUBLIC_` prefix).

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
- `types.ts` — exported type vocabulary: `ResolvedEntry`, `TemplateRecurrence`, `InstallmentProgress`, `EditCheckResult`. Helper files import their types from here rather than declaring them inline, so the type surface stays grep-able
- `date.ts` — formatters, range builders, Postgres-date string utilities
- `lock.ts` — `isMonthLocked`, `checkDateEditable`, `checkEntryEditable`, `fetchMonthUnlock`
- `ledger.ts` — `getEntriesForMonth`, `expandTemplateForMonth`, installment math
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
- **API routes are exempt from the proxy** — the matcher in `src/proxy.ts` excludes `/api/*`. Server-to-server endpoints (Vercel Cron, the WhatsApp test endpoint, future webhooks) authenticate via Bearer token in the handler, not via session cookies, so a redirect to `/login` would silently break them. **Every new API route must auth itself** — either Bearer-token at the top of the handler (cron-style, see `src/app/api/cron/monthly-reports/route.ts`) or `auth.getUser()` + 401-on-null (session-style). Never lean on the proxy to gate `/api/*` — RLS is the real security boundary and the handler check is what protects admin-client code paths
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
- **Supabase INSERT + `.select()` + RLS chicken-and-egg** — if you create a row and immediately need its ID via `.select().single()`, PostgREST evaluates the RETURNING clause against the SELECT RLS policy. If the SELECT policy requires membership that doesn't exist yet (e.g. creating a space before adding yourself as a member), the RETURNING is blocked and Supabase surfaces an RLS error. Fix: generate the UUID client-side with `crypto.randomUUID()` and pass it in the insert, bypassing the need for `.select().single()` entirely
- **RLS subqueries are subject to other tables' RLS** — a `WITH CHECK` expression that subqueries another table runs under the caller's RLS context. If the target table's SELECT policy blocks the lookup, the policy silently fails. Always wrap cross-table checks in SECURITY DEFINER helper functions (like `is_space_creator`, `has_accepted_invitation`) to bypass the other table's RLS. Convention: name them `is_X` / `has_X`, mark them `SECURITY DEFINER STABLE`, lock `search_path = public`
- **Installment bills compress the schedule virtually** — a template with `installments_total` emits one virtual occurrence per month starting at `installments_start_month`. Paying an entry with `installments_covered > 1` is a prepayment — one payment absorbing multiple installments; amount auto-scales to `default × covered`. The expansion helper in `ledger.ts` shifts the effective end earlier by `sum(covered - 1) across paid entries`, so the total generated coverage always lands at `installments_total` with no row-deletion dance. Progress in the UI is `sum(covered for paid) / installments_total`. Installments are gated to monthly cadence; a CHECK constraint enforces this alongside `day(start_month) = 1`
- **`revalidatePath("/", "layout")` for membership changes** — creating a shared space, accepting an invite, or declining one changes the user's membership list. The Navbar reads memberships server-side in the root layout, which Next.js caches across navigations. Call `revalidatePath("/", "layout")` in any action that modifies `space_members` to bust this cache and make the Navbar dropdown update immediately
- **Admin client bypasses RLS** — `src/lib/supabase/admin.ts` uses `SUPABASE_SECRET_KEY` and skips every policy. Use it only for server-only operations (cron, storage uploads, privileged writes) and only after the user-session client has validated ownership. Never expose admin-client results directly in user-facing data without an upstream RLS-equivalent check
- **`@react-pdf/renderer` is server-only** — pulls in Node Buffer and filesystem internals. The PDF component (`src/lib/pdf/MonthlyReportPdf.tsx`) and any helper that imports it (notably `src/helpers/reports.ts`) must never be reached from a client component's import chain. Bundler errors here are confusing — when you see one, trace the import chain first
- **Private storage bucket → signed URLs** — the `monthly-reports` bucket is private with no policies (deny-all). Reads happen via `createSignedUrl(path, ttlSeconds)` minted by the admin client; the user-session SELECT on `monthly_reports` is what authorizes the user to obtain the URL in the first place. Default TTL is 5 minutes — short enough that a leaked URL expires before it matters
- **Prefer `is_active_member` for new tables (transitional)** — the historical pattern in this codebase is `can_read_space` for SELECT policies on new domain tables (so shared-space aggregates Just Work). With shared-space removal coming, `is_active_member` is now the future-proof default and is what `monthly_reports` uses. Pattern-match to `is_active_member` for any new domain table during this transition
- **Server actions can `redirect()` to external URLs but it's brittle** — for the report-download flow, the action returns the signed URL as a string and the client does `window.location.href = url`. This bypasses Next.js's external-redirect handling, which can be unreliable when invoked through `useTransition`, and lets the browser handle attachment-disposition cleanly. Prefer this pattern for any "navigate to a one-off external URL" action
- **WhatsApp overdue cron — `template_id IS NOT NULL` is mandatory** — the `entries` table mixes one-off expenses (`template_id IS NULL`) and recurring-bill exceptions/virtual occurrences (`template_id IS NOT NULL`). For "overdue alert" semantics, only the latter qualify — one-off entries are historical records of money already spent (or planned standalone purchases), not obligations needing a reminder. Any new "due-date" / "past-due" / "reminder" feature must inherit this filter. Note: the existing `netSoFar` balance math intentionally treats *all* unpaid past-dated entries as overdue (that's a cash-reality calculation, not an obligation reminder) — different question, different filter
- **WhatsApp idempotency lives in `whatsapp_notifications_sent`** — one row per (notified bill). Materialized rows key by `(space_id, entry_id)`; virtual recurring occurrences key by `(space_id, template_id, occurrence_date)`. A CHECK enforces exactly-one-of, and two partial unique indexes enforce no-double-notify on each side. The cron also handles the cross-case where a virtual occurrence we already notified gets materialized later — by checking the template-key set against materialized entries too, so we don't re-alert. All writes go through the admin client; SELECT is `is_active_member` for an eventual history UI
- **Twilio WhatsApp uses direct REST, not the SDK** — `src/lib/whatsapp/client.ts` calls Twilio's Messages endpoint via `fetch` with HTTP Basic auth (Account SID + Auth Token). The full `twilio` SDK is ~5 MB for capabilities we don't use. Sandbox vs production: in sandbox we send free-form text bodies and the recipient must opt in via `join <code>`; in production we'd switch to a Meta-approved Content Template SID and remove the join step. The client function takes a body string today — when we graduate to production, refactor to take a template ID + variables instead
