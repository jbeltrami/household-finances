-- --- monthly_report_settings -------------------------------
-- Per-space toggle for the monthly-report email. Absence of a
-- row means "enabled" (default-on behavior); a row with
-- enabled=false means the user opted out. Cron loop reads:
--   personal spaces MINUS rows where enabled = false
create table public.monthly_report_settings (
  space_id   uuid primary key references public.spaces(id) on delete cascade,
  enabled    boolean not null default true
);

alter table public.monthly_report_settings enable row level security;

create policy "Members can view report settings in their spaces"
  on public.monthly_report_settings
  for select
  to authenticated
  using (public.is_active_member(space_id));

create policy "Members can create report settings in their spaces"
  on public.monthly_report_settings
  for insert
  to authenticated
  with check (public.is_active_member(space_id));

create policy "Members can update report settings in their spaces"
  on public.monthly_report_settings
  for update
  to authenticated
  using (public.is_active_member(space_id))
  with check (public.is_active_member(space_id));

-- No DELETE policy: toggling off is an UPDATE, not a delete.
