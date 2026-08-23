# Avisos are stateless and repeat daily

The daily Aviso keeps no record of what it has already told the user. Each run
reads the Obrigações that are Vencida right now, and if the list is non-empty it
sends an email naming all of them. A Conta that falls Vencida on the 5th and
stays unpaid is mailed about every morning until it is paid or the month rolls
over. Nothing is deduplicated, and nothing needs to be.

This is deliberate, and it replaces a design that did track sent alerts. The
first WhatsApp implementation kept an idempotency log — one row per notified
bill, one alert per overdue stretch — and paid a steep price for it. A Conta
occurrence has two possible identities depending on whether it has been
materialized yet, so the log carried two key shapes, an XOR CHECK, two partial
unique indexes, and explicit cross-checking for the case where an occurrence it
had already recorded as virtual later materialized under a fresh row id and
looked new. A re-arm path in `toggleEntryPaid` deleted both key shapes when a
Conta flipped to paid, so that un-ticking it would alert again. Every line of
that existed to make the alert quieter.

An intermediate design was considered and rejected on the way here: store the
set of Obrigações last mentioned, mail only when the set gains a member, and
re-nag every seven days. It gets the behaviour right, but it reintroduces the
whole problem — the stored keys have to stay stable across materialization,
which means a synthetic key scheme, which means the identity duality is back in
a different costume.

Sending daily makes the question disappear. The cron is a pure function of
today's data, rebuildable from nothing, with no stored state to drift.

## Consequences

Nothing records which Obrigações have been mentioned, so the cron cannot send
twice for the same reason — it can only send once per invocation. A double
invocation (a manual trigger, a redeploy, a retry) sends a second identical
email. This is accepted: the blast radius is one duplicate email to the space's
own owner.

The nag is bounded by month scope rather than by a counter. Avisos only consider
the current month, so an unpaid Obrigação can be mailed about at most once per
day until the 1st, when it falls out of scope along with the month that locked.

A Conta paid in real life but never ticked paid in the app generates a daily
email until the ledger is corrected. This is a feature: the alternative designs
notify once and then leave the wrong data sitting quietly forever.

`notification_settings.last_aviso_sent_at` records when the last Aviso went out
and is displayed in Configurações. It is a receipt, not state: the send decision
never reads it. Without it, silence would be ambiguous between "nothing is
Vencida" and "the cron is broken". Anything that starts consulting it to decide
whether to send has reintroduced the design this ADR rejects.

## Considered and rejected

**Per-Obrigação idempotency log** — one alert per overdue stretch, per bill. The
original WhatsApp design. Quietest of the options and by far the most machinery,
all of it in service of an identity problem that only exists because Conta
occurrences may or may not have rows.

**Store the last-notified key set, mail on growth, re-nag every seven days.**
Correct behaviour, and it avoids mailing about a set that merely shrank. Rejected
because stable keys across materialization are the hard part of the per-bill
design, and this keeps them.

**Summarise instead of naming** — count and total only, with a link into the
app. This was forced in the WhatsApp era, where message templates could not
contain newlines in their parameters. Email has no such constraint, and an alert
that makes the reader click to discover *which* bill is late is worse than one
that says so.
