# 02: Every email the app sends is logged

**What to build:** Nothing records that an email went out. "Did the daily Aviso
actually run, or was there simply nothing Vencida?" is currently unanswerable
from inside the app, and there is no basis on which anything could be rate
limited.

Record every email the app sends — daily Avisos, monthly reports, and manual
sends from either button — with the space it was for and when it went. Write the
row only after the send succeeds, so a failure leaves no trace of a mail that
never arrived.

Nothing is limited yet. This ticket only makes sending observable.

**A trap to close while building it.** This table will look exactly like the
per-Obrigação deduplication log that
`docs/adr/0002-avisos-are-stateless-and-repeat-daily.md` deliberately deleted,
and the next person to find it may reasonably decide the daily repeat is a bug
and fix it by reading this. Say so in the table's own comment: it exists for rate
limiting and for audit, and must never inform a decision about whether to send.
The distinction that keeps both designs true is that the cron **writes** here and
never **reads** here, so the Aviso stays a pure function of today's data.

**Blocked by:** 01.

**Status:** done

- [x] Every successful email leaves a record naming the space and the moment
- [x] A send that fails leaves no record
- [x] Both crons and both manual buttons are covered
- [x] The record is written by server-side code only, with no policy under which
      a browser could forge one
- [x] The table's comment states what it is for and that a send decision must
      never read it, and points at ADR-0002
- [x] The daily Aviso still sends purely on what is Vencida today, unchanged
