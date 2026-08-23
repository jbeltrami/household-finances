# The database is the security boundary, not the application

Every domain table has RLS enabled and a policy expressed in terms of
`is_active_member(space_id)`, which reduces to `auth.uid() = spaces.created_by`.
No query anywhere in the app is trusted to scope itself. A page that forgot its
`.eq("space_id", …)` returns the caller's own rows regardless, because Postgres
applies the policy rather than the caller.

That is the whole design, and it only holds while one thing stays true.

Supabase issues two keys. The publishable key is RLS-bound and safe in the
browser. The secret key runs as `service_role`, which carries the `BYPASSRLS`
attribute and, in Supabase's own words, will "skip any and all Row Level
Security policies". `src/lib/supabase/admin.ts` uses that key. Every call it
makes sees every row in every space belonging to every user.

The app needs it. A cron has no session to bind a policy to, storage uploads run
without a user, and the log tables have no write policies precisely so that only
server-side code can write them. So the admin client is not avoidable — it is a
scalpel that has to be handled with a rule attached.

**The rule: the admin client may only be reached after a user-session client has
established who is calling and which space is theirs.** Concretely, any
`spaceId` handed to admin-backed code must have come from `requireSession` or
`resolveSession` — never from a form field, a route parameter, or any other
value the caller chose.

## Consequences

`performOverdueAlertSend` and `performMonthlyReportSend` both take a `spaceId`
and both use the admin client. Neither can verify that the caller was entitled
to that space, so both carry the obligation in their doc comment and both push
it onto whoever calls them. Today every caller satisfies it: the two crons
authenticate by Bearer token and legitimately act for all spaces, and the two
server actions resolve the space from the session.

This is the sharp edge. A future action that accepts `spaceId` as a parameter
from the client and forwards it to either helper reads exactly like the existing
code, passes review, type-checks, and hands any authenticated user the contents
of any other user's space. Nothing in the type system distinguishes a `spaceId`
that came from a session from one that came from a request body.

`download-report` shows the shape to copy: it resolves the report through the
**user-session** client, so RLS decides whether that row is visible at all, and
only then uses the admin client to mint a signed URL for the path it just proved
the user could see.

## Considered and rejected

**Do everything with the user-session client.** Removes the risk entirely, and
is impossible: a cron has no session, and the write-policy-free log and report
tables exist so that a compromised browser cannot forge rows into them.

**Have the helpers resolve the space themselves** rather than accept it. This
genuinely closes the hole — a helper that calls `getPersonalSpaceId` internally
cannot be handed someone else's space. It is rejected only for the crons, which
must act on every space in turn and so need the parameter. The right end state
is probably a split: a session-scoped entry point that takes no `spaceId`, and a
cron-scoped one that does. Worth doing before the second person touches this
code.

**Encode the provenance in the type** — a `SessionScopedSpaceId` branded type
that only `requireSession` can produce. Correct in principle and the only
mechanical enforcement available, but it threads a new type through every
signature between the session and the query. Reconsider if this codebase ever
grows past one contributor.
