# Home Finances App

A personal finance planner. Each user manages their own monthly finances — income, recurring bills, one-off expenses — and can download a PDF summary of any past month.

> Built on Supabase + Next.js + Vercel. One personal space per user.

## Tech stack

- **Database + Auth**: Supabase (region: South America — São Paulo)
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **PDF rendering**: `@react-pdf/renderer`
- **Email**: Hostinger SMTP via `nodemailer`
- **Avisos**: daily email naming every Obrigação Vencida — Contas and parcelas de Financiamento — on by default
- **Cron**: Vercel Cron — monthly reports (`0 11 1 * *`) + daily overdue Avisos (`0 11 * * *`), both 08:00 São Paulo
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

Create a `.env.local` file at the project root (gitignored — never commit):

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<your-key>
SUPABASE_SECRET_KEY=sb_secret_<your-key>

# Email (Hostinger SMTP)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=<your-from-address>
SMTP_PASSWORD=<your-mailbox-password>
SMTP_FROM_NAME=Home Finances

# Cron auth
CRON_SECRET=<32+-char random string>
```

Where the Supabase values come from (**Project Settings → API**):

| Var | Source | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | Public — safe in the browser bundle |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_...`) | Public — RLS-bound |
| `SUPABASE_SECRET_KEY` | Secret key (`sb_secret_...`) | **Server-only** — bypasses RLS, never exposed to the browser |

The SMTP values come from your Hostinger control panel under **Emails → [your domain] → Connect Apps & Devices**. Generate `CRON_SECRET` with e.g. `openssl rand -hex 32`.

For Vercel, set all of these under **Project Settings → Environment Variables** (Production / Preview / Development).

### 3. Apply migrations

Migrations live in `supabase/migrations/` and apply in filename order. Either:

- Paste each file's contents into Supabase **SQL Editor** in order, or
- Run `supabase db push` if you have the Supabase CLI wired up.

Current head: `0015_email_sends.sql`.

### 4. Create the Storage bucket

In the Supabase dashboard → **Storage → New bucket**:

- **Name**: `monthly-reports`
- **Public**: off (private)
- No bucket policies needed — reads use signed URLs minted server-side, writes use the admin client.

### 5. Configure Google OAuth

In Supabase → **Authentication → Providers → Google**:

- Add a Google Cloud OAuth client ID + secret
- Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`

In **Authentication → URL Configuration**:

- Site URL: `http://localhost:3000` (update to your Vercel URL after deploying)
- Redirect URLs: `http://localhost:3000/**` (add your Vercel URL after deploying)

### 6. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). All routes are protected — you'll be redirected to `/login` if not signed in. On first sign-in a database trigger auto-creates your personal space.

## What's in the app

| Route | Purpose |
|---|---|
| `/months/[y]/[m]` | Monthly view — income, recurring bills, one-off expenses, balance |
| `/bills` | Recurring bill templates (create / edit / deactivate) |
| `/reports` | Monthly PDF reports — per-month generate, bulk backfill, download |
| `/settings` | Per-user settings — rename space, monthly-report email, overdue Avisos |

## Architecture and conventions

Developer-facing details live in the code itself. `CONTEXT.md` defines the domain vocabulary, `docs/adr/` records the decisions that would otherwise look arbitrary, and `history.md` covers how the schema got here.

### Adding a new API route

`/api/*` paths are **excluded from the auth proxy** (`src/proxy.ts`). The proxy redirects unauthenticated requests on user-facing pages to `/login`, but API routes are server-to-server endpoints (Vercel Cron, webhooks, internal tools) that don't get a redirect treatment — a JSON client doesn't want HTML back.

The trade-off: middleware doesn't provide any safety net for API routes. **Every API route must authenticate itself in its handler.** Two patterns:

- **Bearer token** (cron / machine-to-machine): check `Authorization: Bearer ${process.env.CRON_SECRET}` at the top of the handler and return `401` otherwise. See `src/app/api/cron/monthly-reports/route.ts` for the canonical shape.
- **Session-based** (user-initiated): call `await supabase.auth.getUser()` via the server client, return `401` on null, and gate any space-scoped query on RLS (`is_active_member`).

Never rely on the proxy to keep an API route private. RLS is the real security boundary; auth in the handler is what gates admin-client work and shapes useful error responses.

## Build status

| Feature | Status |
|---|---|
| Supabase schema + Google OAuth + personal-space trigger | ✅ |
| Recurring bill templates | ✅ |
| Monthly view (income, bills, expenses, balance) | ✅ |
| Monthly PDF reports — generation, storage, download | ✅ |
| Monthly PDF reports — settings page + email delivery via Hostinger SMTP | ✅ |
| Monthly PDF reports — Vercel cron job for end-of-month auto-send | ✅ |
| Overdue Avisos — daily email, stateless, Contas + parcelas | ✅ |
| Drop `[id]` segment from URLs (routes collapsed to `/months/[y]/[m]`, `/bills`, `/reports`, `/settings`) | ✅ |
| Recurring income templates (biweekly / monthly cadence) | ⏳ planned |
| UI translated to pt-BR (single-language app) | ✅ |
