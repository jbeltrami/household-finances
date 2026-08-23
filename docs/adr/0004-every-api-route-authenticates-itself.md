# Every API route authenticates itself

`src/proxy.ts` refreshes the session and redirects unauthenticated traffic to
`/login`, and its matcher excludes `/api`. API routes therefore receive no
protection from it whatsoever. Every one of them authenticates in its own
handler, and any new one must too.

The exclusion is deliberate. These endpoints are server-to-server — Vercel Cron
today, webhooks later — and answering a machine client with an HTML redirect to
a login page is a failure that looks like a success: status 200, no data, no
error. Excluding them from the proxy is right. Forgetting that they are excluded
is what makes an endpoint public.

Two shapes are permitted:

**Bearer token**, for machine callers. `isAuthorizedCron` compares
`Authorization` against `CRON_SECRET` with `timingSafeEqual`, so a wrong guess
takes the same time as a right one and the secret cannot be recovered a byte at
a time. It **fails closed**: if `CRON_SECRET` is unset the function returns
false and nothing is authorized, because the alternative — treating an absent
secret as no requirement — turns a missing environment variable into an open
endpoint, reachable by anyone who sends the literal string `Bearer undefined`.

**Session**, for browser callers: `auth.getUser()` and a 401 when it returns
null. `getUser()` and not `getSession()` — Supabase is explicit that you should
"never trust `supabase.auth.getSession()` inside server code", because it reads
from storage without revalidating the token against the auth server.

## Consequences

A route that authenticates neither way is reachable by anyone on the internet
who knows its path, and nothing in the build, the type system or the linter will
say so. The failure is silent and total, and it looks identical to a working
route in every code review that does not specifically go looking.

Both current routes use the admin client, so an unauthenticated route here is
not a leak of one user's data but of every user's. This ADR and
`docs/adr/0003-the-database-is-the-security-boundary.md` are the same rule seen
from two sides: RLS is the boundary, these routes stand outside it, and the
handler check is the only thing holding the line.

Route handlers are the one place in this codebase where a missing line of code —
rather than a wrong one — is the vulnerability.

## Considered and rejected

**Extend the proxy to cover `/api` and let it gate everything.** One place to
get right instead of one per route. Rejected because the proxy's response is a
redirect, which is the wrong answer for a JSON client, and because a cron
authenticating by Bearer token has no session for the proxy to inspect — it
would be redirected on every run.

**A shared wrapper — `withCronAuth(handler)` — so the check cannot be
forgotten.** Genuinely better than a convention, and worth adopting if a third
route appears. With two routes it would be one indirection over two call sites,
and the failure it prevents is not "wrote the check wrong" but "did not know a
check was needed", which a wrapper only fixes if you already know to reach for
it.
