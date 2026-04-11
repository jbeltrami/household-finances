-- ============================================================
-- HOME FINANCES APP — DATABASE SCHEMA
-- Migration: 0001_initial_schema.sql
-- ============================================================
-- Run this entire block in the Supabase SQL Editor.
-- Order matters — tables are created before their dependents.
-- ============================================================


-- ============================================================
-- 1. SPACES
-- A space is a budget context. Every user gets a personal space
-- on signup (via trigger below). Spaces can be linked to a
-- parent (e.g. personal space linked to a household space).
-- Data always flows personal → household, never the reverse.
-- The household view is a read-only aggregation.
-- ============================================================
create table public.spaces (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  type            text not null check (type in ('personal', 'household', 'shared')),
  created_by      uuid not null references auth.users(id) on delete cascade,
  parent_space_id uuid references public.spaces(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- 2. SPACE MEMBERS
-- Tracks who belongs to which space and their role.
-- Rows are NEVER hard deleted — left_at is set instead.
-- This preserves historical attribution in past months even
-- after someone leaves a household.
-- ============================================================
create table public.space_members (
  space_id   uuid not null references public.spaces(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('owner', 'member')),
  joined_at  timestamptz not null default now(),
  left_at    timestamptz,                    -- set on departure, row kept forever
  primary key (space_id, user_id)
);

-- ============================================================
-- 3. INVITATIONS
-- Household owners invite by email. If the invited person
-- doesn't have an account yet, the invitation waits until
-- they sign up with that email via Google OAuth.
-- On login, the app checks for pending invitations matching
-- the user's email and surfaces them as a dashboard banner.
-- ============================================================
create table public.invitations (
  id             uuid primary key default gen_random_uuid(),
  space_id       uuid not null references public.spaces(id) on delete cascade,
  invited_email  text not null,
  invited_by     uuid not null references auth.users(id) on delete cascade,
  status         text not null default 'pending'
                   check (status in ('pending', 'accepted', 'declined')),
  created_at     timestamptz not null default now(),
  responded_at   timestamptz,
  unique (space_id, invited_email)           -- no duplicate invites to the same space
);

-- ============================================================
-- 4. RECURRING BILL TEMPLATES
-- Defined once per space. Each month, instances are generated
-- from active templates automatically (handled in app logic).
-- Deactivating a template stops future instances without
-- deleting historical ones.
-- ============================================================
create table public.recurring_bill_templates (
  id             uuid primary key default gen_random_uuid(),
  space_id       uuid not null references public.spaces(id) on delete cascade,
  name           text not null,
  default_amount numeric(12, 2) not null,
  currency       text not null default 'BRL',
  due_day        int check (due_day between 1 and 31), -- approximate day of month
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ============================================================
-- 5. MONTHS
-- One row per space per calendar month. Created on demand
-- when a user first navigates to that month.
-- Locking prevents edits to past months; unlocking requires
-- a written reason.
-- ============================================================
create table public.months (
  id             uuid primary key default gen_random_uuid(),
  space_id       uuid not null references public.spaces(id) on delete cascade,
  year           int not null,
  month          int not null check (month between 1 and 12),
  locked         boolean not null default false,
  locked_at      timestamptz,
  unlock_reason  text,
  created_at     timestamptz not null default now(),
  unique (space_id, year, month)             -- one row per space per calendar month
);

-- ============================================================
-- 6. INCOME ENTRIES
-- User adds these manually each month. Each entry has its own
-- received toggle — mark it when the money actually arrives.
-- ============================================================
create table public.income_entries (
  id            uuid primary key default gen_random_uuid(),
  month_id      uuid not null references public.months(id) on delete cascade,
  space_id      uuid not null references public.spaces(id) on delete cascade,
  name          text not null,
  amount        numeric(12, 2) not null,
  currency      text not null default 'BRL',
  expected_date date,
  received      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- 7. BILL INSTANCES
-- Auto-generated from templates when a month is opened.
-- Amount defaults to the template's default_amount but can
-- be overridden for that month only — template is untouched.
-- Always read amount from bill_instances, never from template.
-- ============================================================
create table public.bill_instances (
  id           uuid primary key default gen_random_uuid(),
  month_id     uuid not null references public.months(id) on delete cascade,
  template_id  uuid not null references public.recurring_bill_templates(id) on delete cascade,
  space_id     uuid not null references public.spaces(id) on delete cascade,
  amount       numeric(12, 2) not null,      -- may differ from template default_amount
  due_date     date,
  paid         boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (month_id, template_id)             -- one instance per template per month
);

-- ============================================================
-- 8. ONE-OFF EXPENSES
-- Non-recurring manual expenses added to a specific month.
-- ============================================================
create table public.one_off_expenses (
  id          uuid primary key default gen_random_uuid(),
  month_id    uuid not null references public.months(id) on delete cascade,
  space_id    uuid not null references public.spaces(id) on delete cascade,
  name        text not null,
  amount      numeric(12, 2) not null,
  currency    text not null default 'BRL',
  date        date,
  category    text,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 9. SAVINGS FUNDS
-- Lives outside the monthly cycle. Has a starting balance
-- which is the baseline before any contributions.
-- Total = starting_balance + sum of all contributions.
-- ============================================================
create table public.savings_funds (
  id               uuid primary key default gen_random_uuid(),
  space_id         uuid not null references public.spaces(id) on delete cascade,
  name             text not null,
  currency         text not null default 'BRL',
  starting_balance numeric(12, 2) not null default 0,
  created_at       timestamptz not null default now()
);

-- ============================================================
-- 10. SAVINGS CONTRIBUTIONS
-- Manual additions to a savings fund, logged per month.
-- ============================================================
create table public.savings_contributions (
  id          uuid primary key default gen_random_uuid(),
  fund_id     uuid not null references public.savings_funds(id) on delete cascade,
  month_id    uuid not null references public.months(id) on delete cascade,
  amount      numeric(12, 2) not null,
  notes       text,
  created_at  timestamptz not null default now()
);


-- ============================================================
-- TRIGGER — AUTO-CREATE PERSONAL SPACE ON SIGNUP
-- Fires when Supabase inserts a new row into auth.users
-- (i.e. first Google login). Creates a personal space and
-- adds the user as its owner automatically.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_space_id uuid;
begin
  insert into public.spaces (name, type, created_by)
  values (
    coalesce(new.raw_user_meta_data->>'full_name', 'My Space'),
    'personal',
    new.id
  )
  returning id into new_space_id;

  insert into public.space_members (space_id, user_id, role)
  values (new_space_id, new.id, 'owner');

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
