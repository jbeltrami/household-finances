# Security named as the top concern; taught as a boundary question

João named security as "one of the biggest concerns I have about this project"
— the first time he has volunteered a topic rather than accepting one. The
concern is well founded in kind but not in degree: the audit found the app
already correct on the mistakes that actually sink small Supabase projects, and
weak in one place he had not considered.

## Implications

- **The anxiety is about not knowing where to look, not about a broken app.**
  The teaching move is therefore to hand over a *decision procedure* rather
  than a list of vulnerabilities. Lesson 02 leads with "where is the boundary"
  because "am I secure?" is unanswerable while "does this code path still tell
  the truth about who is asking?" is checkable line by line.
- **He is already on the right side of the classic errors** — `getUser()` over
  `getSession()`, `search_path` pinned on the `SECURITY DEFINER` function,
  `timingSafeEqual` on the cron secret, fail-closed when the secret is unset,
  no write policies on machine-written tables. These were probably absorbed by
  pattern-matching, which per record 0001 means they will not generalise until
  named. The lesson names them.
- **The real gap is enforcement, not knowledge.** The `spaceId` invariant is
  held by comments and habit. A future action that takes `spaceId` from a form
  and forwards it to an admin-backed helper would read like every existing call
  site and leak every space. This is the shape of bug his mission cares about —
  one the type system could prevent and currently does not.
- **Rate limiting was the blind spot.** Nothing throttles the email-sending
  actions. Not a data-confidentiality issue, which is where his attention was,
  but the most concrete live gap. Worth noting that his instinct pointed at
  the well-defended side.

## Open thread

ADR-0003 argues *against* a branded `SessionScopedSpaceId` type for a
one-person codebase, and the lesson invites him to push back on that. His
answer will say a lot about where he sits on the types-as-ceremony question —
which is the second strand of the mission and has no learning record yet.

## Evidence

Asked for "the basics about security and what this project is doing right vs
what can be improved", explicitly paired with a request for ADRs — consistent
with the record-01 observation that process artefacts are valued. Audit
findings drawn from reading all seven admin-client call sites, the proxy
matcher, `is_active_member`, the cron auth helper and the storage policies.
