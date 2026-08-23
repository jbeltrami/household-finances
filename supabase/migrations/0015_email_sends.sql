-- --- email_sends ---------------------------------------------
-- One row per email this app has actually sent: the daily Aviso,
-- the monthly report, and the manual sends of either. Written only
-- after the transport accepts the message, so a failed send leaves
-- no trace of mail that never arrived.
--
-- READ THIS BEFORE USING IT FOR ANYTHING ELSE.
--
-- This table exists for exactly two purposes: rate limiting the
-- manual send buttons, and answering "did it actually send?" It
-- must never inform a decision about *whether* to send.
--
-- That warning is here because this table looks precisely like the
-- per-Obrigação idempotency log that
-- docs/adr/0002-avisos-are-stateless-and-repeat-daily.md
-- deliberately deleted. Someone will find the daily Aviso repeating,
-- reasonably conclude it is a bug, notice this table, and fix the
-- "bug" by reading it. That would undo the decision, and reintroduce
-- the key-stability problem the ADR describes.
--
-- The line that keeps both designs true: the cron WRITES here and
-- never READS here. The Aviso stays a pure function of what is
-- Vencida today.
create table public.email_sends (
  id       uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  kind     text not null check (kind in ('overdue_alert', 'monthly_report')),
  sent_at  timestamptz not null default now()
);

comment on table public.email_sends is
  'Audit + rate limiting only. Never read this to decide whether to send; '
  'see docs/adr/0002-avisos-are-stateless-and-repeat-daily.md.';

-- The rate-limit query is "how many for this space since a moment",
-- so the index leads on space_id and orders by time within it.
create index email_sends_space_sent_at
  on public.email_sends (space_id, sent_at desc);

alter table public.email_sends enable row level security;

create policy "Members can view email sends in their spaces"
  on public.email_sends
  for select
  to authenticated
  using (public.is_active_member(space_id));

-- No insert/update/delete policies, deliberately. Every write goes
-- through the admin client in server-side code, so a compromised
-- browser cannot forge a send record — which matters once the rate
-- limit reads this, because a forged row would be a denial of
-- service and a deleted one would lift the limit.
