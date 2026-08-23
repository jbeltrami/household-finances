# 02: Notification settings replace the WhatsApp ones

**What to build:** WhatsApp leaves the product. The Meta account behind it is
banned, so the sender, the sandbox and everything built against them are dead
weight — and the settings table they left behind holds a boolean called `enabled`
that is about to stop meaning anything, because Avisos need a switch of their own.

Rename the monthly-report settings to cover notifications generally, split the
ambiguous flag into one per notification, and add the two fields the Aviso will
need: its own on-by-default switch and a nullable timestamp for when the last one
went out. Then delete the WhatsApp build entirely — client, settings actions,
toggle, the alert log and its re-arm path, the cron and its schedule entry, and
the Twilio configuration.

Monthly reports keep working exactly as they do today. Configurações simply no
longer offers WhatsApp.

**Blocked by:** None (can start immediately, in parallel with 01).

**Status:** done

- [x] The settings table is named for notifications, with one flag per
      notification rather than a shared `enabled`
- [x] Avisos default to on for every space, including spaces with no settings row
- [x] A nullable last-Aviso timestamp exists, unused for now
- [x] Both WhatsApp tables are dropped
- [x] The WhatsApp client, its three settings actions, its settings component and
      the alert-clearing path in the paid toggle are gone
- [x] The WhatsApp cron route and its schedule entry are gone
- [x] Nothing in the tree references Twilio, and the Twilio variables are out of
      the documented environment
- [x] Monthly report generation, sending and the opt-out toggle behave as before
- [x] Configurações renders without the WhatsApp card
- [x] README's Twilio section, its stack table entry and its cron schedule no
      longer mention WhatsApp, and the documented environment lists only
      variables the app still reads
