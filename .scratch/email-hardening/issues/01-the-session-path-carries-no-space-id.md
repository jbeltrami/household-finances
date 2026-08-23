# 01: The session path carries no space id

**What to build:** The helper that sends an Aviso takes a space id and then uses
the admin client, which ignores row-level security entirely. It cannot check
that the caller was entitled to that space, so it trusts whoever called it. Every
caller is correct today, and nothing in the type system says they have to be — a
space id resolved from the session and one read out of a form field are the same
type, so the mistake compiles.

Give the browser-reachable path no id to pass. The settings test button reaches
the mail helper through an entry point that resolves the space from the session
itself, so there is no parameter to forge. The space-scoped helper stays for the
daily cron, which legitimately acts for every space in turn and is gated by its
Bearer token rather than by a session.

The monthly report helper takes a report id rather than a space id and its action
already verifies ownership before calling. Give it the same shape anyway, so the
two read alike and neither invites the pattern back.

Nothing changes for anyone using the app. The point is that the dangerous call
stops being expressible.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The settings test button sends without any id crossing the boundary from
      the browser
- [ ] The reports send button does the same
- [ ] The id-taking helpers remain available to the crons, which need them
- [ ] Sending a test Aviso and sending a monthly report both behave exactly as
      before, including when there is nothing Vencida
- [ ] A user still cannot cause mail to be sent for a space that is not theirs
- [ ] ADR-0003 describes the split as done rather than as the right end state,
      and says what is left holding the invariant for the cron-scoped helpers
