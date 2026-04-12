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
├── CreateBillTemplateForm.tsx              ← client component, useActionState
└── [id]/edit/
    ├── page.tsx                            ← edit page
    └── EditBillTemplateForm.tsx            ← client component, useActionState
```

### Server action conventions used here

- **Each action in its own file**, with its own `"use server"` directive at the top
- **`actions.ts` is a barrel** — no `"use server"` so it can re-export anything (constants, types, async functions)
- **Sync helpers in `_helpers.ts`** — `"use server"` files can only export async functions, so utilities like `parseTemplateFields` live in a sibling file
- **Actions return `{ error: string | null }`** for predictable failures (validation, duplicate name) so forms can render the error inline via `useActionState`. Reserve throws for unexpected crashes
- **`redirect()` lives outside try/catch** — it works by throwing a Next.js sentinel error; catching it would misclassify the success case as a failure

## Build order

| Piece | Scope                                                          | Status |
| ----- | -------------------------------------------------------------- | ------ |
| 1     | Supabase schema + auth + personal space auto-creation trigger  | Done   |
| 2     | Next.js scaffold + Supabase client setup + Google OAuth login  | Done   |
| 3     | Recurring bill templates — create, edit, deactivate            | Done   |
| 4     | Monthly view — navigate months, auto-generate bill instances   | Next   |
| 5     | Income entries — add/edit/mark received within a month         | —      |
| 6     | One-off expenses + monthly balance calculation                 | —      |
| 7     | Savings funds — create fund, log contributions, running total  | —      |
| 8     | Shared spaces — household creation, invite flow, aggregate     | —      |
