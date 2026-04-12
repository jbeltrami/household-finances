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

## Monthly view (Piece 4a + 4b)

The monthly view at `/months/[year]/[month]` is the heart of the app. After sign-in, `/` redirects to the current month (e.g. `/months/2026/04`). Every month has its own bookmarkable URL.

### Capabilities

- **On-demand month + bill instance creation** — visiting a month that doesn't yet exist creates a `months` row and one `bill_instance` per active bill template, in one page render. Revisiting the same month reuses the existing data
- **Paid / pending toggle** — clicking the status pill on any bill flips `bill_instances.paid` via a server action
- **Per-instance amount override** — "Edit" opens an inline input. Saving updates only that one `bill_instance.amount`, leaving the template untouched (this is how "Unimed was R$1.200 just this month" is modeled)
- **Past-month locking (check-on-read)** — a past month is locked unless it has an `unlock_reason`. The UI hides edit affordances and the paid toggle, and every mutation server action re-checks before writing
- **Unlock flow** — an amber banner on locked months opens an inline form requiring a written reason (min 5 chars). On success the reason is stored in `months.unlock_reason`, the banner vanishes, and the bills become editable
- **Calendar strip header (4b)** — at the top of the page, a controls row with prev/next arrows, a single combined month dropdown (chronological list of all months that exist in DB plus the next 6 months), and a Today button that resolves through `/` so it stays fresh
- **Calendar grid (4b, desktop only)** — Sun-first 6×7 = 42-cell grid below the controls. Each cell shows its day number; days with bills due get a small blue dot below; today is highlighted with a filled blue circle; days from adjacent months are faded
- **Click a day to highlight bills (4b)** — clicking a current-month cell highlights it with a blue ring and applies a subtle blue background to bill rows whose due date falls on that day. Clicking the same cell toggles off; navigating to a different month resets

### File layout

```
src/app/months/[year]/[month]/
├── page.tsx                                       ← server component, fetches data
├── _helpers.ts                                    ← getOrCreateMonth, isMonthLocked,
│                                                     checkBillInstanceEditable, monthUrl,
│                                                     prevMonth, nextMonth, dueDateFor,
│                                                     formatMonthLabel, capitalize,
│                                                     buildMonthOptions, YearMonth, MonthRow
├── actions.ts                                     ← barrel re-export
├── actions/
│   ├── toggle-bill-paid.ts                        ← "use server"
│   ├── update-bill-instance-amount.ts             ← "use server"
│   └── unlock-month.ts                            ← "use server"
├── form-state.ts                                  ← FormState type + initial state
└── _components/
    ├── MonthlyViewClient/
    │   └── MonthlyViewClient.tsx                  ← client wrapper, owns highlight state
    ├── CalendarStrip/
    │   ├── CalendarStrip.tsx                      ← client, controls + grid + badges
    │   └── _helpers.ts                            ← buildCalendarGrid (private to component)
    ├── BillInstanceRow/
    │   └── BillInstanceRow.tsx                    ← client, paid toggle + edit + highlight
    └── UnlockBanner/
        └── UnlockBanner.tsx                       ← client, useActionState
```

### Design notes

- **Lazy month creation handles races** — two concurrent visits to a brand-new month would both try to INSERT. The helper catches the unique-violation error (`23505`) and re-fetches, so the loser still gets the row without double-generating instances
- **Check-on-read locking is a pure function** — `isMonthLocked({ year, month, unlock_reason })` compares against today's date. Current and future months are always editable; past months are editable only if `unlock_reason` is set. No scheduled jobs, no drift
- **Defense in depth on mutations** — every mutation action (`toggleBillPaid`, `updateBillInstanceAmount`) fetches the bill's month via a nested select and runs `isMonthLocked` before writing. If the UI somehow lets a click through, the server still rejects it
- **UTC timezone for due date display** — `date` columns in Postgres come back as `YYYY-MM-DD` strings. Parsing them with `new Date(...)` treats them as UTC midnight, which shifts to the previous day in Brazilian time (UTC-3). The row component formats with `Intl.DateTimeFormat(..., { timeZone: "UTC" })`. For pure-day comparisons (calendar highlight, badge dots) we parse the day directly from the string instead of going through `Date`
- **Today button points to `/`** — not a hardcoded current-month URL. If the page sits open past midnight, clicking Today still resolves to the real current month via the redirect
- **Lifted client state for cross-component highlight** — `MonthlyViewClient` is a thin client wrapper that owns `useState<number | null>(null)` for the highlighted day. `CalendarStrip` writes via `onSelectDay`; `BillInstanceRow` reads `highlightedDay` and applies a background style. The wrapper has a `key={` `${year}-${month}` `}` so navigating to a different month remounts and resets the state automatically
- **Calendar grid is always 42 cells** — `buildCalendarGrid(year, month)` pads with leading days from the previous month and trailing days from the next month so the grid height stays stable across navigation. Padding cells are non-interactive; current-month cells are buttons

## Build order

| Piece | Scope                                                          | Status |
| ----- | -------------------------------------------------------------- | ------ |
| 1     | Supabase schema + auth + personal space auto-creation trigger  | Done   |
| 2     | Next.js scaffold + Supabase client setup + Google OAuth login  | Done   |
| 3     | Recurring bill templates — create, edit, deactivate            | Done   |
| 4a    | Monthly view core — routes, on-demand creation, paid toggle    | Done   |
| 4b    | Monthly view top calendar — calendar strip, badges, picker     | Done   |
| 5     | Income entries — add/edit/mark received (one-off only)         | Next   |
| 6     | One-off expenses + monthly balance calculation                 | —      |
| 7     | Savings funds — create fund, log contributions, running total  | —      |
| 8     | Shared spaces — household creation, invite flow, aggregate     | —      |
| 9     | Recurring income templates — biweekly / monthly cadence        | —      |
