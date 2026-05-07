-- --- monthly_reports ----------------------------------------
-- One row per generated monthly PDF report. Writes go through
-- the admin client only (cron + manual generate); RLS exposes
-- SELECT for direct space members only (is_active_member, not
-- can_read_space) so personal reports stay private to the owner
-- even when the personal space is linked into a shared space.
create table public.monthly_reports (
  id             uuid primary key default gen_random_uuid(),
  space_id       uuid not null references public.spaces(id) on delete cascade,
  year           int not null,
  month          int not null check (month between 1 and 12),
  storage_path   text not null,
  generated_at   timestamptz not null default now(),
  sent_at        timestamptz,
  unique (space_id, year, month)
);

alter table public.monthly_reports enable row level security;

create policy "Members can view reports in their spaces"
  on public.monthly_reports
  for select
  to authenticated
  using (public.is_active_member(space_id));

-- No insert/update/delete policies: all writes go through the
-- admin client (cron handler + manual generate action).
