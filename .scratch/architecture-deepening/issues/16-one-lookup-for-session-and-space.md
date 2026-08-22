# 16: One lookup for session and space

**What to build:** Every server action opens by asking twice who is calling: once
for the signed-in user, once for their space. The two are always wanted together,
and answering them separately means either can be forgotten.

This ticket adds one module that answers both, in the two shapes the codebase
needs — a throwing form for actions invoked through a transition, and a
state-returning form for actions rendered against a form. No caller changes yet.

Ownership is already enforced by the database: a space is only visible to the user
who owns it, so failing to find one is the unauthenticated case. The module says
that once instead of forty actions each saying it in their own words.

Tickets 17–20 migrate the call sites in batches, so nothing has to change at once.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] One module returns the calling user and their space from a single lookup
- [ ] It offers a throwing form and a state-returning form
- [ ] Both use one Portuguese wording for the unauthenticated case
- [ ] The per-request memoisation on the space lookup is preserved, so callers in
      one request still share a round trip
- [ ] Existing helpers keep working and no call site changes in this ticket
