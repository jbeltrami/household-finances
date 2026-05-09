-- --- whatsapp_notification_settings -------------------------
-- Per-personal-space toggle for the "bill overdue" WhatsApp
-- nudge. Default OFF — opt-in feature. The phone is stored in
-- E.164 format (e.g. +5511987654321). A CHECK keeps the table
-- in a coherent state: enabled=true requires a phone, and any
-- stored phone must match E.164 shape.
create table public.whatsapp_notification_settings (
  space_id   uuid primary key references public.spaces(id) on delete cascade,
  enabled    boolean not null default false,
  phone_e164 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (enabled = false or phone_e164 is not null),
  check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{6,14}$')
);

alter table public.whatsapp_notification_settings enable row level security;

create policy "Members can view whatsapp settings in their spaces"
  on public.whatsapp_notification_settings
  for select
  to authenticated
  using (public.is_active_member(space_id));

create policy "Members can create whatsapp settings in their spaces"
  on public.whatsapp_notification_settings
  for insert
  to authenticated
  with check (public.is_active_member(space_id));

create policy "Members can update whatsapp settings in their spaces"
  on public.whatsapp_notification_settings
  for update
  to authenticated
  using (public.is_active_member(space_id))
  with check (public.is_active_member(space_id));

-- --- whatsapp_notifications_sent -----------------------------
-- Idempotency log: one row per overdue bill we've messaged
-- about. The cron filters candidates by joining to this table,
-- so a paid bill or a re-run never produces a duplicate alert.
--
-- A row is keyed by either entry_id (materialized one-off or
-- exception) OR (template_id, occurrence_date) (virtual
-- recurring occurrence we expanded at query time). Exactly one
-- side is set; the CHECK enforces the XOR.
--
-- Writes happen through the admin client only (cron handler);
-- SELECT is exposed to members for an eventual "history" UI.
create table public.whatsapp_notifications_sent (
  id              uuid primary key default gen_random_uuid(),
  space_id        uuid not null references public.spaces(id) on delete cascade,
  entry_id        uuid references public.entries(id) on delete cascade,
  template_id     uuid references public.recurring_bill_templates(id) on delete cascade,
  occurrence_date date not null,
  sent_at         timestamptz not null default now(),
  check ((entry_id is null) <> (template_id is null))
);

create unique index whatsapp_notif_entry_unique
  on public.whatsapp_notifications_sent (space_id, entry_id)
  where entry_id is not null;

create unique index whatsapp_notif_template_unique
  on public.whatsapp_notifications_sent (space_id, template_id, occurrence_date)
  where template_id is not null;

alter table public.whatsapp_notifications_sent enable row level security;

create policy "Members can view whatsapp notification log in their spaces"
  on public.whatsapp_notifications_sent
  for select
  to authenticated
  using (public.is_active_member(space_id));

-- No insert/update/delete policies: all writes go through the
-- admin client (cron handler).
