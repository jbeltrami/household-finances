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

The full schema lives in `supabase/migrations/0001_initial_schema.sql`. It includes all tables, RLS policies, and a trigger (`on_auth_user_created`) that auto-creates a personal space for each new user on first login.

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

### Middleware (`src/middleware.ts`)

Runs on every request (except static assets). Does two things:

1. **Session refresh** — calls `supabase.auth.getUser()` which automatically refreshes expired access tokens using the refresh token in cookies. This prevents users from being silently logged out after the access token expires (~1 hour).

2. **Route protection** — redirects unauthenticated users to `/login` and redirects authenticated users away from `/login` to `/`.

Public routes (not protected): `/login`, `/auth/callback`.

### Login flow

1. User visits any page → middleware redirects to `/login`
2. User clicks "Sign in with Google" → `signInWithOAuth` redirects to Google
3. User authenticates with Google → Google redirects back to `/auth/callback?code=...`
4. Callback route exchanges the code for a session → redirects to `/`
5. On first login, Supabase's `on_auth_user_created` trigger auto-creates a personal space

## Build order

| Piece | Scope                                                          | Status |
| ----- | -------------------------------------------------------------- | ------ |
| 1     | Supabase schema + auth + personal space auto-creation trigger  | Done   |
| 2     | Next.js scaffold + Supabase client setup + Google OAuth login  | Done   |
| 3     | Recurring bill templates — create, edit, deactivate            | Next   |
| 4     | Monthly view — navigate months, auto-generate bill instances   | —      |
| 5     | Income entries — add/edit/mark received within a month         | —      |
| 6     | One-off expenses + monthly balance calculation                 | —      |
| 7     | Savings funds — create fund, log contributions, running total  | —      |
| 8     | Shared spaces — household creation, invite flow, aggregate     | —      |
