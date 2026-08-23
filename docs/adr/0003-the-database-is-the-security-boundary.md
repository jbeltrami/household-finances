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

Each mail helper has two entry points, and which one a caller may use is the
whole point of the split.

The **cron-scoped** ones — `sendOverdueAlertForSpace` and
`sendMonthlyReportForId` — take an id and use the admin client. They cannot
verify anything about their caller, and they do not try to. They exist because
the daily and monthly runs legitimately act for every space in turn, and they
are gated by a Bearer token rather than by a session. Both are now reachable
only from the two cron route handlers.

The **session-scoped** ones — `sendOverdueAlertForCurrentUser` and
`sendMonthlyReportForCurrentUser` — are what anything a browser can reach must
call. The first takes no id at all: it resolves the space from the session
cookie itself, so there is no parameter for a form field to supply. The second
must take a report id, because which month to re-send is genuinely the user's
choice — so instead it performs the ownership proof internally, in the order
that matters: the user-session client looks the report up so RLS decides whether
it is visible, and only then is `created_by` checked against the caller.

That difference is worth stating plainly, because it is the general rule. When
an id is not the user's choice, do not accept one. When it is, accept it but own
the check rather than delegating it to every caller.

What the old shape risked, for the record: both helpers derive their recipient
from `spaces.created_by` and mail the space's **owner**, so a forged id would
have sent a stranger an email full of their own data — unsolicited mail and a
wasted SMTP budget, not a disclosure, since the caller never sees the contents.
The disclosure version is the one nobody has written: an admin-backed helper
that **returns** data to its caller. `getSpaceSummary(admin, spaceId)` would
leak outright, and the invariant exists to make that function safe on the day
someone writes it.

`download-report` shows the shape to copy: it resolves the report through the
**user-session** client, so RLS decides whether that row is visible at all, and
only then uses the admin client to mint a signed URL for the path it just proved
the user could see.

## Considered and rejected

**Do everything with the user-session client.** Removes the risk entirely, and
is impossible: a cron has no session, and the write-policy-free log and report
tables exist so that a compromised browser cannot forge rows into them.

**Have every helper resolve the space itself,** with no id parameter anywhere.
Rejected, because the crons must act on each space in turn and so genuinely need
one. The split above is what this became instead: the id survives only where it
is needed, on entry points a browser cannot reach.

**Encode the provenance in the type** — a `SessionScopedSpaceId` branded type
that only `requireSession` can produce, making the bad call fail to compile.
The only mechanical enforcement available, and it threads a new type through
every signature between the session and the query. Rejected because the split
above removes the parameter from the reachable path entirely, which gets most of
the same protection for the cost of two wrapper functions and no new type. It
becomes worth reconsidering the day an admin-backed helper **returns** space
data to its caller, when the consequence stops being unwanted mail and starts
being disclosure.
