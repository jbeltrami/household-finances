# 03: Manual sends are limited to three an hour

**What to build:** Both send buttons can be pressed as fast as they can be
clicked, and each press sends real mail through the account this app shares with
its owner's own address. A stuck loop or an impatient hand can spend that
account's sending reputation, which is not recoverable by deploying a fix.

Refuse a manual send once three have already gone out for that space within the
previous hour, counted as a rolling window rather than per clock hour — otherwise
three at the end of one hour and three at the start of the next arrive as six in
two minutes.

The budget is shared between the two buttons. What is being protected is the mail
account, not either feature, and one number is easier to reason about than two.

Three is chosen for the setup case: someone configuring Avisos sends a test,
changes something, sends again, checks the formatting, sends once more. Two would
lock them out mid-task, and being locked out of the button that proves the
feature works is how the feature gets switched off instead.

Tell the user when they can try again. A refusal that reads as a generic failure
is indistinguishable from the mail being broken, which is the opposite of what
this button is for.

The crons are never refused. They log, as of the previous ticket, but a daily job
throttled by a limit meant for a button is a bug.

**Blocked by:** 02.

**Status:** ready-for-agent

- [ ] A fourth manual send within a rolling hour is refused
- [ ] The refusal names the time the user can try again, inline rather than as an
      error page
- [ ] The two buttons draw on one shared allowance
- [ ] The window slides: sends drop out of the count as they age past an hour
- [ ] A refused attempt sends no mail and consumes no allowance
- [ ] The crons send regardless of how much manual sending has happened
- [ ] The window arithmetic is covered by tests that need no database and no
      clock, including the boundary where a send ages out
