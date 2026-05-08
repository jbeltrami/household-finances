# Home Finances App

A personal finance planner. Each user manages their own monthly finances — income, recurring bills, one-off expenses, savings — and can download a PDF summary of any past month.

> Built on Supabase + Next.js + Vercel. Personal-only spaces; shared-space functionality is being phased out (see [`CLAUDE.md`](./CLAUDE.md) → Future improvements).

## Tech stack

- **Database + Auth**: Supabase (region: South America — São Paulo)
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **PDF rendering**: `@react-pdf/renderer`
- **Email** (Piece B): Hostinger SMTP via `nodemailer`
- **Cron** (Piece C): Vercel Cron
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
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<your-key>
SUPABASE_SECRET_KEY=sb_secret_<your-key>
```

All three values come from Supabase **Project Settings → API**:

| Var | Source | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | Public — safe in the browser bundle |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_...`) | Public — RLS-bound |
| `SUPABASE_SECRET_KEY` | Secret key (`sb_secret_...`) | **Server-only** — bypasses RLS, never exposed to the browser |

For Vercel, set these same variables under **Project Settings → Environment Variables** (Production / Preview / Development).

### 3. Apply migrations

Migrations live in `supabase/migrations/` and apply in filename order. Either:

- Paste each file's contents into Supabase **SQL Editor** in order, or
- Run `supabase db push` if you have the Supabase CLI wired up.

Current head: `0002_monthly_reports.sql`.

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
| `/spaces/[id]/months/[y]/[m]` | Monthly view — income, recurring bills, one-off expenses, savings, balance |
| `/spaces/[id]/bills` | Recurring bill templates (create / edit / deactivate) |
| `/spaces/[id]/savings` | Savings funds and contributions |
| `/spaces/[id]/reports` | Monthly PDF reports — per-month generate, bulk backfill, download |

## Architecture and conventions

Developer-facing details — the ledger data model, virtual template expansion, the Supabase client split (browser / server / admin), RLS patterns, route layout conventions, common gotchas — live in [`CLAUDE.md`](./CLAUDE.md).

## Build status

| Feature | Status |
|---|---|
| Supabase schema + Google OAuth + personal-space trigger | ✅ |
| Recurring bill templates | ✅ |
| Monthly view (income, bills, expenses, balance) | ✅ |
| Savings funds + contributions | ✅ |
| Shared spaces (parent linking, invite flow, aggregate view) | ✅ (slated for removal) |
| Monthly PDF reports — generation, storage, download (Piece A) | ✅ |
| Monthly PDF reports — settings page + email delivery via Hostinger SMTP (Piece B) | ⏳ next |
| Monthly PDF reports — Vercel cron job for end-of-month auto-send (Piece C) | ⏳ next |
| Removing shared spaces | ⏳ planned (after report feature lands) |
| Recurring income templates (biweekly / monthly cadence) | ⏳ planned |
