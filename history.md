# Home Finances App — Build History

Historical record of shipped work. `CLAUDE.md` holds the load-bearing context for current and future work; this file is for "why did we build it this way?" questions about the past.

---

## Build order

| Piece | Scope                                                                            | Status  |
| ----- | -------------------------------------------------------------------------------- | ------- |
| 1     | Supabase schema + auth + personal space auto-creation trigger                    | ✅ Done |
| 2     | Next.js scaffold + Supabase client setup + Google OAuth login flow               | ✅ Done |
| 3     | Recurring bill templates — create, edit, deactivate                              | ✅ Done |
| 4a    | Monthly view core — routes, on-demand creation, paid toggle, navigation          | ✅ Done |
| 4b    | Monthly view top calendar — calendar strip, badges, month picker dropdown        | ✅ Done |
| 5     | Income entries — add/edit/mark received within a month (one-off only)            | ✅ Done |
| 6     | One-off expenses + monthly balance calculation                                   | ✅ Done |
| 7     | Savings funds — create fund, log contributions, running total                    | ✅ Done |
| 8     | Shared spaces — URL refactor, invite flow, aggregate view, dashboard             | ✅ Done |
| —     | Ledger-model rewrite — merge bill_instances/one_off_expenses into entries        | ✅ Done |
| 9     | Recurring income templates — biweekly / monthly cadence, virtual expansion       | ⬜      |

---

## Piece 4 plan — Monthly view

The monthly view is the heart of the app. It's split into two sub-pieces so the basics ship before the calendar UI.

### Piece 4a — core monthly view

**Routing**

- `/spaces/[spaceId]/months/[year]/[month]` is the canonical monthly URL (e.g. `/spaces/abc/months/2026/04`). Year is 4-digit, month is 2-digit zero-padded
- `/` is the **dashboard** showing space cards with current-month summaries. Each card links to that space's current month. The dashboard replaced an earlier redirect
- Navbar has a space switcher dropdown + Bills/Savings/Settings links that track the viewed space

**On-demand month + instance creation**

- A `months` row is created **lazily** the first time a user navigates to that year/month for their personal space
- At creation time, the server enumerates all `active = true` recurring bill templates for that space and inserts a `bill_instances` row for each one, copying `default_amount` and computing `due_date` from `due_day` (or leaving it null if `due_day` is null)
- This is wrapped in a single transaction (or a database function) so the month and its instances appear atomically

**RLS policies (deferred from Piece 3)**

- Add policies for `months` and `bill_instances` so users can read/write rows in spaces they belong to
- This is what unblocks the cascade-amount feature from Piece 3

**Bills section of the page**

- Lists all `bill_instances` for the month, joined to their template for the name
- Each row: name, amount, due day (if set), paid checkbox
- Toggling paid is a server action that flips `bill_instances.paid`
- An "Edit amount" affordance per row that opens an inline edit (or a small modal) — sets `bill_instances.amount` for that month only, never touches the template. This is the per-instance override

**Month navigation**

- Prev / Next buttons that navigate to the adjacent `/spaces/[spaceId]/months/[year]/[month]`. Always available, even for months that don't exist yet (the destination route will create the row on demand)

**Past-month locking — check-on-read**

- A month is **effectively locked** if `(year, month) < (currentYear, currentMonth)` AND `unlock_reason IS NULL`
- A month is **effectively unlocked** if it's the current month, a future month, OR a past month where `unlock_reason` is set
- No scheduled job or DB trigger needed — the lock state is computed from the current date and the `unlock_reason` column on every read
- Schema change: drop the `locked` and `locked_at` columns from `months`. Keep only `unlock_reason`. With check-on-read, the boolean becomes redundant (and confusing — "what if locked=false but unlock_reason is set?"). Migration `0004` handles this
- The check-on-read helper lives server-side (e.g. `isMonthLocked({year, month, unlockReason})`) and is used in two places:
  1. The page render — to show read-only UI vs editable affordances
  2. Inside every mutation server action — defense in depth, so direct POST attempts also get rejected
- Unlocking a past month: "Unlock" button opens a small form requiring a written reason. Submitting it stores the reason in `unlock_reason` and re-renders the page with the edit affordances enabled
- Re-locking is not exposed in the UI for now. Once unlocked, a past month stays unlocked

**Out of scope for 4a**

- Income entries (Piece 5)
- One-off expenses + balance calculation (Piece 6)
- Calendar UI (Piece 4b)

### Piece 4b — top calendar strip

A calendar strip displayed **above the monthly view content**, only on `/spaces/[spaceId]/months/*` routes (not on `/bills` or other pages). Hidden on small screens (`md:` breakpoint and up only).

**Layout**

- Sits at the top of the monthly view, above the bills/income/expense sections
- Contains the calendar grid plus a row of controls

**Controls (left-to-right)**

- Prev month button
- Month dropdown — shows past months that have a `months` row in the DB, plus the next 6 months from today (even if they don't exist yet — selecting one navigates and triggers on-demand creation)
- Year dropdown — same logic
- Next month button
- "Today" button — jumps to the current month

**Calendar grid**

- Standard month grid (Sun–Sat or Mon–Sun, decide later) for the **currently viewed** month, not always today's month
- Each day cell shows the day number
- Days with `bill_instances` due that day get a **badge** — a small dot or count indicator
- Clicking a day **highlights** the bills due that day in the main bills list (e.g. scrolls to them and adds a temporary highlight class)

**State**

- The calendar follows the URL — `/months/2026/04` → calendar shows April 2026
- The "Today" button is just a link to `/months/<current YYYY/MM>`
- Highlighted day is local UI state (client component, no URL state)

**Out of scope for 4b**

- Drag-and-drop to reschedule bills
- Year-at-a-glance heatmap
- Mobile drawer for the calendar (hidden on mobile entirely for now)

### Two-column layout (shipped alongside Piece 5)

The monthly view uses a two-column grid on desktop (`md:` and up), single column on mobile:

- **Left column — `md:col-span-1` of `md:grid-cols-4`**: calendar strip (controls + grid)
- **Right column — `md:col-span-3`**: income section, bills section, net (expected) section

Mobile stays single-column with the calendar grid hidden via the existing `hidden md:block` class on the grid. The page wrapper uses `max-w-6xl` so the desktop layout has room to breathe. CalendarStrip's controls are stacked (prev/dropdown/next on row 1, Today on row 2, full width) so they fit in a narrow desktop column.

---

## Piece 7 plan — Savings funds

Savings funds live outside the monthly cycle. A fund has a `starting_balance` and a set of per-month `savings_contributions` that roll up into `runningTotal = starting_balance + sum(contributions)`.

**Management route: `/spaces/[spaceId]/savings`**

- List of the user's funds with their running totals. Click a fund → `/spaces/[spaceId]/savings/[id]` detail page.
- Detail page exposes: rename, running-total summary (starting balance, net contributions, current total), contribution history grouped by month, and a form to log new contributions.
- Fund-level UX deliberately minimal for Piece 7: no deactivate/archive yet. Schema has no `active` column; the follow-up decision is whether to add one or allow hard delete.

**Contributions**

- A contribution belongs to both a fund and a month. The month is chosen via a native `<input type="month">` (yields `"YYYY-MM"`) and lazy-created via `getOrCreateMonth` if it doesn't exist — same idiom as income entries routing by `expected_date`.
- **Signed amounts** — contributions use a single `amount` column but the form has two buttons, **Deposit** and **Withdraw**. The action parses the button's `type` field and flips the sign: deposits positive, withdrawals negative. `parseContributionFields` returns `signedAmount`, so the DB and all downstream sums can treat contributions as pure algebra.
- **Lock enforcement** runs against the **target** month (the one in the form), not any page-level month, and lives in the server actions (not RLS) — same defense-in-depth approach as income/expenses.
- **Access control is inherited.** `savings_contributions` has no `space_id`; its RLS policy walks the FK to `savings_funds` and calls `is_active_member(f.space_id)` there. When a fund lives in a shared space (Piece 8), all active shared-space members automatically get CRUD on its contributions.

**Monthly view integration (one row only)**

- The `/spaces/[spaceId]/months/[year]/[month]` page fetches the sum of `savings_contributions.amount` for the current month across every accessible fund and passes it to `BalanceSection` as `savingsNet`.
- `BalanceSection` renders a single **"Saved this month"** row inside the balance card. No inline add/edit — the savings UI lives at `/spaces/[spaceId]/savings`.
- `savingsNet` is subtracted from both `netExpected` and `netSoFar`. A deposit (positive) reduces the month's net (money moved out of checking); a withdrawal (negative) increases it (money came back). Because signs are baked in, the math is a single subtraction in both places.

**Out of scope for Piece 7**

- Fund deactivate/archive/delete
- Contribution-level reporting across months (only per-fund detail page has history for now)
- Shared-space fund sharing UX (enabled by RLS, but invite/link flow is Piece 8)

---

## Piece 8 plan — Shared spaces

Shared spaces (shared finances) let multiple users collaborate on a joint budget while each retaining their own private personal space. The whole piece is the biggest refactor in the build order because every existing route has to learn about a space context.

### Product model

- A **shared space** is a `space` with `type = 'shared'`. It has members (`space_members`) and can have its own entries (joint expenses, joint income, joint savings funds).
- Personal spaces can link to a shared space via `parent_space_id`. A personal space can have at most one parent at a time.
- The **shared-space view** is an aggregate: entries from the shared space + entries from every personal space whose `parent_space_id` points at it. Rows from a non-current space render attributed (e.g. "João — Unimed") and without edit affordances.
- The shared space itself is a normal write target for joint entries. The read-only part of the view is the rolled-up personal-space rows, not the whole view.
- **Option X (leave model)**: leaving a shared space sets `space_members.left_at` but does NOT clear `parent_space_id`. Historical entries stay visible in the aggregate view, departed members get a label in the UI.

### URL structure

All data routes live under `/spaces/[spaceId]/...`. This is the biggest refactor in Piece 8:

- `/spaces/[spaceId]/months/[year]/[month]` (was `/months/[year]/[month]`)
- `/spaces/[spaceId]/bills` (was `/bills`)
- `/spaces/[spaceId]/savings` (was `/savings`)
- `/spaces/[spaceId]/settings` — rename, invite, revoke, member list
- `/spaces/new` — create a new shared space

Every page knows its space context from the URL. Server components resolve `spaceId` from params and query by it instead of looking up a "personal space" implicitly. RLS ensures the user only sees spaces they're a member of; a stale or forged spaceId just returns empty results.

### Dashboard at `/`

The root route stops being a redirect and becomes a real page: a launchpad showing the user's spaces as cards.

- **Pending invitations** — top section, only rendered when there are any. One row per invite with the inviting space, who invited them, Accept / Decline buttons.
- **Your spaces** — one card per active membership (always includes the personal space; adds one per shared space). Each card shows:
  - Space name + type badge (`Personal` / `Shared`)
  - For shared spaces: member initials/avatars
  - Current-month snapshot: **Net so far**, **Still to pay**, **Savings this month**
  - Three deep links: **This month →**, **Bills →**, **Savings →**
  - The whole card is clickable and routes to `/spaces/[id]/months/[current]`
- **`+ Create shared space`** button routes to `/spaces/new`

### Aggregate query helper

A shared helper (probably in `src/lib/spaces/` or similar) takes a `spaceId` and returns the list of space_ids to query:

- For a `personal` space: `[personalId]`
- For a `shared` space: `[sharedId, ...childPersonalSpaceIds]`, where children are computed from `parent_space_id`

Every data fetch in the monthly view, bills, and savings routes calls through this helper. The space type decides whether entries render as writable or as read-only attributed rows.

### Invitation flow

1. Owner enters an email on the shared-space settings page
2. `invitations` row created with `status = 'pending'`, unique on `(space_id, invited_email)`
3. On every request, a server component checks for pending invitations where `invited_email = user.email`
4. If any exist, a banner renders (either on the dashboard or globally) with Accept / Decline
5. **Accept**: creates a `space_members` row (role = `member`, `left_at = null`), sets the invitee's personal space `parent_space_id` to the shared space, marks the invite `accepted`
6. **Decline**: marks the invite `declined`, nothing else
7. The owner can see pending invitations and revoke them from the settings page

### Build steps

Piece 8 shipped in small, check-in-able steps:

0. ✅ **Terminology alignment (docs only)** — drop "household" for "shared space" / "shared finances"
1. ✅ **Schema cleanup migration** — `0008_drop_household_type.sql`
2. ✅ **Invitations RLS** — `0009_invitations_rls.sql` + `0010_cross_space_reads.sql`
3. ✅ **URL refactor** — `/spaces/[spaceId]/...` for all data routes; `src/helpers/paths.ts` centralizes URL builders
4. ✅ **Space switcher** — `NavbarNav` client component with dropdown + URL-aware Bills/Savings/Settings links
5. ✅ **Create shared space** — `/spaces/new` + `0011_spaces_mutation_policies.sql` (INSERT spaces, UPDATE spaces, INSERT space_members via `is_space_creator`)
6. ✅ **Shared-space settings** — `/spaces/[spaceId]/settings` with rename, invite, revoke, member list
7. ✅ **Invitation banner** — `InvitationBanner` in root layout + `0012_invitee_join_policy.sql` (INSERT space_members via `has_accepted_invitation`)
8. ✅ **Aggregate query layer** — `getAggregateSpaceIds` + `getSpaceAttributions` in `src/helpers/spaces.ts`; monthly view queries across all month IDs; rows carry `space_id` + `readOnly` / `attribution` props
9. ✅ **Dashboard at `/`** — space cards with current-month summaries (Net so far, Still to pay, Saved this month) + deep links + stretched-link pattern for clickable cards
10. ✅ **Final docs pass**

### Out of scope for Piece 8

- Leave shared space / remove member (UX needs its own pass)
- Email or push notifications for invites (in-app banner only)
- Multi-parent personal spaces (a personal space can belong to one shared space at a time)
- Charts, activity feeds, cross-space rollups on the dashboard

---

## Ledger-model rewrite

After Piece 8, the data model was reworked from "months-as-rows" to "ledger" while preserving the monthly UI. This sat between Pieces 8 and 9 because the old model made recurring-income a bigger lift than it should have been, and the cracks in bill-instance materialization (sync-on-read, "cascade to future unpaid", installment-row deletion) were only going to multiply.

### Motivating tension

The prior schema had three tables for "money-out events":
- `bill_instances` (template-generated, one row per template per month)
- `one_off_expenses` (free-form)
- `months` (per-space container with `unlock_reason`)

Every bill visible in the monthly view was a real row. When a user visited a month, `getOrCreateMonth` created the `months` row if missing and `syncBillInstances` backfilled any bill instances the templates should have produced. Template changes required a cascade step. Installment prepayments required deleting unpaid future rows so the next visit would regenerate them correctly.

The core realization: the *only* reason bills were materialized was to hold per-month state (amount overrides, paid, installments_covered). If that state could be held in a single "exceptions" table and everything else computed from the templates, the sync / cascade / installment-deletion logic all disappeared.

### Target model

A single `entries` table carries one-offs (`template_id IS NULL`) and template exceptions (`template_id IS NOT NULL`). Recurring occurrences that haven't been touched by the user don't exist in the database — they're expanded at query time by `expandTemplateForMonth` in `src/helpers/ledger.ts`. The monthly view calls `getEntriesForMonth`, which merges virtual occurrences with materialized exceptions and hands the UI a unified `ResolvedEntry[]`.

Ancillary changes:
- `months` → `month_unlocks` (tiny side table, row only exists when a past month is explicitly unlocked)
- `income_entries.month_id` → `expected_date` (date-range queries instead of month joins)
- `savings_contributions.month_id` → `date` (same)
- `recurring_bill_templates.category` (optional, inherited by generated/materialized entries)
- `entries.skipped` boolean for the per-occurrence skip feature

### Decisions made during the rewrite

- **Wipe data, don't migrate.** This is a personal app; the cost of a data transform script was higher than the cost of re-entering data. A single baseline migration drops the old schema and creates the new one.
- **Squash migrations into one baseline.** `history.md` preserves the evolution story in prose; the file-level history of 0001-0014 became redundant once the schema was replaced wholesale. The rewrite shipped as `0015_ledger_rewrite.sql` (with DROPs at the top, coexisting with the old migrations during development), then the cleanup commit renamed it to `0001_baseline.sql` and deleted the old files.
- **Virtual + exceptions, not eager materialization.** The Google Calendar recurring-event model. A row only appears in `entries` when the user pays, overrides, or skips an occurrence. Template changes automatically flow into every untouched occurrence since those are computed at query time.
- **No cascade checkbox on template edits.** The prior "apply amount change to future unpaid instances" checkbox became redundant — untouched occurrences ARE the template. Only materialized exceptions stay frozen, which is usually what the user wants anyway.
- **Skip feature added in the same rollout.** Schema supports it (`skipped` boolean + CHECK), UI exposes a per-row "Skip" button next to the paid/pending toggle.
- **Installment math simplified.** Effective-end shift stays the same formula (`paidExtra = sum(covered - 1) across paid entries`), but now it's applied at expansion time rather than by deleting unpaid future rows. The "prepayment" flow is a single INSERT instead of an INSERT + DELETE.
- **One big-bang rollout, no dual-schema phase.** For a personal app the extra work to handle both schemas in code wasn't worth it.

### Scope

- New migration `0015_ledger_rewrite.sql` (later renamed `0001_baseline.sql`) that drops the prior schema and recreates everything from scratch.
- New helpers `src/helpers/ledger.ts`, `src/helpers/lock.ts`; expanded `src/helpers/date.ts`.
- All bill/expense/income/savings server actions rewritten.
- All monthly-view, bills, dashboard, and savings pages rewired.
- All row/section/form components updated for the `EntryRow` + virtual-target shape.
- `CLAUDE.md` rewritten to describe the ledger model.
- Migration files 0001-0014 deleted in the cleanup commit; the baseline lives alone.

### Build steps

1. ✅ Schema — new baseline migration (`0015_ledger_rewrite.sql` initially, later `0001_baseline.sql`)
2. ✅ Shared helpers — `ledger.ts`, `lock.ts`, expanded `date.ts`
3. ✅ Server actions — unified `entries`-oriented action layer with materialized/virtual target union
4. ✅ Monthly view rewire — page, components, calendar strip use `getEntriesForMonth`
5. ✅ Bills page + templates — `category` field, virtual-expansion installment progress, no cascade checkbox
6. ✅ Dashboard + savings + income — consistent date-range querying
7. ✅ Docs — `CLAUDE.md` rewritten, this `history.md` section added
8. ✅ Cleanup — dead-code removal, migration file squash, rename to `0001_baseline.sql`

### What didn't change

- Route structure (still `/spaces/[spaceId]/months/[year]/[month]`)
- RLS strategy (SELECT via `can_read_space`, writes via `is_active_member`)
- Auth flow, invitation flow, space-linking model
- Monthly view layout, calendar strip, navbar/dashboard UI chrome
- Brazilian-Portuguese conventions (currency formatting, weekday labels)

---

## Migration history

The repository now holds a single `0001_baseline.sql` — the consolidated, post-rewrite schema. The prior 0001-0014 files were deleted in the ledger-rewrite cleanup commit; their content is captured in prose below so the evolution is still legible.

### Current

- `0001_baseline.sql` — the whole schema after the ledger-model rewrite. Defines `spaces`, `space_members`, `invitations`, `recurring_bill_templates` (with `category`, cadence, installments), `entries` (unified ledger — one-offs + exceptions), `month_unlocks`, `income_entries` (date-keyed), `savings_funds`, `savings_contributions` (date-keyed). RLS helpers `is_active_member`, `is_space_owner`, `can_read_space`, `is_space_creator`, `has_accepted_invitation`. Policies follow the same pattern: SELECT via `can_read_space`, writes via `is_active_member`. The `on_auth_user_created` trigger still auto-creates a personal space on first Google login.

### Historical (pre-rewrite — files deleted)

These migrations built up the "months-as-rows" schema. They're gone from the repo but retained here for the narrative:

- `0001_initial_schema.sql` — initial tables and the `on_auth_user_created` trigger
- `0002_rls_policies.sql` — RLS enabled everywhere; SELECT/INSERT/UPDATE/DELETE policies for `spaces`, `space_members`, and `recurring_bill_templates`
- `0003_bill_templates_unique_active_name.sql` — partial unique index preventing duplicate active template names per space
- `0004_months_locking_and_rls.sql` — dropped `locked` / `locked_at` from `months` (check-on-read locking); added policies for `months` and `bill_instances`
- `0005_income_entries_rls.sql` — SELECT/INSERT/UPDATE/DELETE for `income_entries`
- `0006_one_off_expenses_rls.sql` — SELECT/INSERT/UPDATE/DELETE for `one_off_expenses`
- `0007_savings_rls.sql` — policies for `savings_funds` and `savings_contributions` (the latter walks the fund FK for access inheritance)
- `0008_drop_household_type.sql` — tightened `spaces.type` CHECK to `personal | shared` (dropping `household`)
- `0009_invitations_rls.sql` — introduced `is_space_owner`; added SELECT/INSERT/UPDATE/DELETE for `invitations`
- `0010_cross_space_reads.sql` — introduced `can_read_space`; widened SELECT on domain tables to include child personal spaces of shared spaces the user is in
- `0011_spaces_mutation_policies.sql` — INSERT/UPDATE on `spaces`, bootstrap INSERT on `space_members` via `is_space_creator`
- `0012_invitee_join_policy.sql` — invitee INSERT on `space_members` via `has_accepted_invitation`
- `0013_bill_recurrence.sql` — added `cadence`, `day_of_week`, `biweekly_anchor` to templates; replaced the `(month_id, template_id)` unique constraint on `bill_instances` with two partial unique indexes to support weekly/biweekly
- `0014_bill_installments.sql` — added `installments_total`, `installments_start_month` on templates; added `installments_covered` on `bill_instances`
- `0015_ledger_rewrite.sql` — the transitional rewrite migration that shipped with the code changes. It dropped the whole prior schema and recreated it in the ledger shape. Lived alongside 0001-0014 during development, then got renamed to `0001_baseline.sql` and had its DROP block removed in the cleanup commit that deleted 0001-0014.

---

## Repo structure (snapshot)

Point-in-time tree as of the ledger-rewrite cleanup. Drifts as new files are added — refer to the working tree, not this snapshot.

```
home-finances-app/
├── CLAUDE.md
├── history.md
├── .env.local                             ← never commit (in .gitignore)
├── supabase/
│   └── migrations/
│       └── 0001_baseline.sql              ← consolidated post-rewrite schema
├── src/
│   ├── app/
│   │   ├── layout.tsx                     ← root layout (HTML shell, fonts, navbar, invitation banner)
│   │   ├── page.tsx                       ← dashboard: space cards with current-month summaries + deep links
│   │   ├── globals.css
│   │   ├── login/page.tsx
│   │   ├── auth/callback/route.ts
│   │   └── spaces/
│   │       ├── new/                       ← create shared space
│   │       │   ├── page.tsx
│   │       │   └── action.ts
│   │       └── [spaceId]/                 ← all data routes live under a space context
│   │           ├── bills/                 ← recurring bill templates
│   │           │   ├── page.tsx
│   │           │   ├── _types.ts
│   │           │   ├── actions.ts         ← barrel re-export
│   │           │   ├── actions/
│   │           │   │   ├── _helpers.ts
│   │           │   │   ├── create-bill-template.ts
│   │           │   │   ├── update-bill-template.ts
│   │           │   │   └── deactivate-bill-template.ts
│   │           │   ├── form-state.ts
│   │           │   ├── _components/
│   │           │   │   ├── CreateBillTemplateForm/
│   │           │   │   └── ActiveTemplatesSection/
│   │           │   └── [id]/edit/
│   │           ├── savings/               ← savings funds
│   │           │   ├── page.tsx
│   │           │   ├── _types.ts
│   │           │   ├── actions.ts
│   │           │   ├── actions/
│   │           │   │   ├── _helpers.ts
│   │           │   │   ├── create-savings-fund.ts
│   │           │   │   ├── update-savings-fund.ts
│   │           │   │   ├── create-savings-contribution.ts
│   │           │   │   ├── update-savings-contribution.ts
│   │           │   │   └── delete-savings-contribution.ts
│   │           │   ├── form-state.ts
│   │           │   ├── _components/
│   │           │   └── [id]/              ← fund detail page
│   │           ├── months/                ← monthly view (UI lens over the date-keyed ledger)
│   │           │   └── [year]/[month]/
│   │           │       ├── page.tsx       ← calls getEntriesForMonth
│   │           │       ├── _helpers.ts    ← buildMonthOptions, prevMonth/nextMonth, capitalize
│   │           │       ├── actions.ts     ← barrel + target-type re-exports
│   │           │       ├── actions/
│   │           │       │   ├── toggle-entry-paid.ts       ← virtual or materialized
│   │           │       │   ├── override-entry-amount.ts
│   │           │       │   ├── skip-entry-occurrence.ts
│   │           │       │   ├── create-one-off-entry.ts
│   │           │       │   ├── update-entry.ts
│   │           │       │   ├── delete-entry.ts
│   │           │       │   ├── create-income-entry.ts
│   │           │       │   ├── update-income-entry.ts
│   │           │       │   ├── toggle-income-received.ts
│   │           │       │   ├── delete-income-entry.ts
│   │           │       │   └── unlock-month.ts            ← inserts into month_unlocks
│   │           │       ├── form-state.ts
│   │           │       ├── _types.ts                      ← EntryRow, BillsGroup, ExpensesGroup, etc.
│   │           │       └── _components/
│   │           └── settings/              ← shared-space settings
│   │               ├── page.tsx
│   │               ├── actions.ts
│   │               └── _components/
│   ├── components/
│   │   ├── Navbar.tsx                     ← server component, fetches memberships
│   │   ├── NavbarNav.tsx                  ← client, space switcher + Bills/Savings/Settings links
│   │   ├── InvitationBanner/
│   │   └── SignOutButton.tsx
│   ├── helpers/
│   │   ├── format.ts                      ← brlFormatter, dateFormatter
│   │   ├── date.ts                        ← todayYmd(), currentYearMonth(), getMonthRange,
│   │   │                                    formatDateYmd, parseYearMonthFromYmd, addMonthsYm,
│   │   │                                    formatMonthLabel, dueDateFor
│   │   ├── lock.ts                        ← isMonthLocked, fetchMonthUnlock,
│   │   │                                    checkDateEditable, checkEntryEditable,
│   │   │                                    checkIncomeEntryEditable, checkSavingsContributionEditable
│   │   ├── ledger.ts                      ← ResolvedEntry, getEntriesForMonth,
│   │   │                                    expandTemplateForMonth, computeInstallmentProgress
│   │   ├── paths.ts                       ← URL builders
│   │   └── spaces.ts                      ← getPersonalSpaceId, getAggregateSpaceIds, getSpaceAttributions
│   ├── lib/
│   │   └── supabase/                      ← third-party integrations only
│   │       ├── client.ts
│   │       └── server.ts
│   ├── proxy.ts                           ← auth session refresh + route protection (Next.js 16+)
│   └── types/database.ts
└── public/
```
