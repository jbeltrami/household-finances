# 20: The report and Insights actions use the shared lookup

**What to build:** Generating, sending and downloading a monthly report, filling in
the missing ones, and saving the Insights parameters move onto the shared lookup.
The last batch.

The report actions reach the admin client, which bypasses every database policy, so
the session check in front of them is the only thing standing between a caller and
another user's PDF. It has to survive the move intact.

**Blocked by:** 16.

**Status:** done

- [x] Every report action uses the shared lookup
- [x] Saving the Insights parameters uses the shared lookup
- [x] The session check still runs before any admin-client work
- [x] Generating, regenerating, sending and downloading a report still work
- [x] Filling in the missing reports still works
- [x] A download still hands back a short-lived signed link rather than a public
      one
- [x] The cron entry points are untouched — they authenticate by token, not by
      session, and must not start depending on one
