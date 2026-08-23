# 04: The send log is the only receipt

**What to build:** Two things now record that an Aviso went out. A timestamp on
the settings row, added when Configurações needed to tell "nothing is Vencida"
apart from "the cron is broken"; and the send log added in 02, which carries the
same fact plus which kind of mail it was and every send before the last one.

One fact with two homes drifts. The one that will drift is the timestamp,
because it is written in a single place that a future refactor can move or
forget, while the log is written by the one function both send paths funnel
through.

Configurações should read the log. The timestamp should stop existing.

**A note on how to remove it.** The migration that adds this column has not been
applied to any database yet — the whole notification-settings rename is still
pending. So the column should be removed from that migration rather than added
by it and dropped by a later one. Shipping a column whose entire history is
"created, then deleted, unused" is worse than never having written it. Confirm
the migration really is unapplied before doing this; if it has run anywhere, add
a new migration instead.

**Keep the warning alive.** ADR-0002 currently uses this timestamp as its worked
example of a receipt that a send decision must never read. That warning does not
go away with the column — it transfers to the log, where it matters more, since
a table of past sends looks far more like something you could deduplicate
against than a single timestamp does.

**Blocked by:** 02.

**Status:** ready-for-agent

- [ ] Configurações shows when the last Aviso went out, read from the send log
- [ ] A space that has never had one sent is still shown as such, distinctly
      from a date
- [ ] The reading uses the caller's own session rather than the admin client,
      since row-level security already scopes the log to its own space
- [ ] Only Avisos count towards it — a monthly report is not an Aviso
- [ ] Nothing writes the old timestamp, and no database has a column for it
- [ ] ADR-0002 makes its point about the send log, and still says plainly that
      nothing may read it to decide whether to send
