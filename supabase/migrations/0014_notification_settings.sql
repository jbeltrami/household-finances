-- --- notification_settings ----------------------------------
-- monthly_report_settings held one boolean called `enabled`, which
-- was unambiguous while the monthly report was the only thing a
-- space could switch off. The daily Aviso needs its own switch, and
-- two booleans called `enabled` and something else is a trap: the
-- table is renamed for what it holds, and the flag is renamed for
-- which notification it governs.
--
-- Both notifications keep the default-on / absence-means-enabled
-- pattern. A space with no row here receives everything.
alter table public.monthly_report_settings
  rename to notification_settings;

alter table public.notification_settings
  rename column enabled to monthly_report_enabled;

alter table public.notification_settings
  add column overdue_alert_enabled boolean not null default true;

-- The policies survive the table rename, but their names still say
-- "report settings" and would misdescribe the Aviso flag.
alter policy "Members can view report settings in their spaces"
  on public.notification_settings
  rename to "Members can view notification settings in their spaces";

alter policy "Members can create report settings in their spaces"
  on public.notification_settings
  rename to "Members can create notification settings in their spaces";

alter policy "Members can update report settings in their spaces"
  on public.notification_settings
  rename to "Members can update notification settings in their spaces";

-- --- drop the WhatsApp build ---------------------------------
-- The Meta account behind the sender was banned, and Avisos go out
-- by email instead. Nothing reads these tables any more.
--
-- whatsapp_notifications_sent was the per-bill idempotency log: one
-- row per notified Obrigação, keyed by entry_id for a materialized
-- row and by (template_id, occurrence_date) for a virtual one, with
-- a CHECK enforcing exactly one of the two. That duality is the
-- complexity the email Aviso avoids by keeping no record at all.
drop table if exists public.whatsapp_notifications_sent;
drop table if exists public.whatsapp_notification_settings;
