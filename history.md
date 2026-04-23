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
| 9     | Recurring income templates — biweekly / monthly cadence, instance generation     | ⬜      |

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

## Migration history

Detailed per-migration descriptions. The short form lives in `CLAUDE.md`.

- `0001_initial_schema.sql` — initial tables and trigger
- `0002_rls_policies.sql` — RLS enabled on all tables; SELECT/INSERT/UPDATE/DELETE policies for `spaces`, `space_members`, and `recurring_bill_templates`
- `0003_bill_templates_unique_active_name.sql` — partial unique index preventing two active templates with the same name in a space
- `0004_months_locking_and_rls.sql` — dropped `locked` / `locked_at` columns from `months` (check-on-read locking); added SELECT/INSERT/UPDATE policies for `months` and `bill_instances`
- `0005_income_entries_rls.sql` — SELECT/INSERT/UPDATE/DELETE policies for `income_entries` (Piece 5)
- `0006_one_off_expenses_rls.sql` — SELECT/INSERT/UPDATE/DELETE policies for `one_off_expenses` (Piece 6)
- `0007_savings_rls.sql` — SELECT/INSERT/UPDATE/DELETE policies for `savings_funds` and `savings_contributions` (Piece 7). Contribution policies walk the FK to the parent fund and reuse `is_active_member(space_id)` there, so funds in shared spaces inherit access automatically
- `0008_drop_household_type.sql` — drops `household` from the `spaces.type` CHECK constraint, leaving `personal | shared`. Cleanup for Piece 8's terminology alignment — "household" was one motivating use case, not a distinct type
- `0009_invitations_rls.sql` — introduces `is_space_owner(space_id)` helper (mirrors `is_active_member` but filters by `role = 'owner'`) and adds SELECT/INSERT/UPDATE/DELETE policies for `invitations`. SELECT is visible to active members of the space OR the invitee (email-matched via `auth.jwt() ->> 'email'`); INSERT/DELETE are owner-only; UPDATE is restricted to the invitee (accept / decline flow). Owner "revoke" uses DELETE rather than a 4th status value
- `0010_cross_space_reads.sql` — introduces `can_read_space(space_id)` helper (direct active membership OR indirect via `parent_space_id` pointing at a shared space I'm in) and swaps every existing SELECT policy on domain tables (`spaces`, `recurring_bill_templates`, `months`, `bill_instances`, `income_entries`, `one_off_expenses`, `savings_funds`, `savings_contributions`) from `is_active_member` to `can_read_space`. INSERT/UPDATE/DELETE policies are deliberately **not** touched — writes stay narrow so shared-space members can't mutate other members' personal-space entries from the shared view. This is what makes the shared-space aggregate query work end-to-end without silently dropping rows
- `0011_spaces_mutation_policies.sql` — INSERT on `spaces` (type must be `'shared'`, `created_by = auth.uid()`), UPDATE on `spaces` (`created_by = auth.uid()` — covers linking personal spaces and renaming shared spaces you created), INSERT on `space_members` via `is_space_creator` SECURITY DEFINER helper (`user_id = auth.uid()` AND space's `created_by = auth.uid()` — bootstrap: the creator adds themselves as the first member)
- `0012_invitee_join_policy.sql` — INSERT on `space_members` for invitees via `has_accepted_invitation` SECURITY DEFINER helper. The invitee must have an accepted invitation (status = 'accepted') matching their JWT email for the target space before they can insert a membership row. This companion to 0011's creator policy completes the two-path membership creation model: creators bootstrap via `is_space_creator`, invitees join via `has_accepted_invitation`
- `0013_bill_recurrence.sql` — adds `cadence` ('monthly' | 'weekly' | 'biweekly'), `day_of_week`, and `biweekly_anchor` columns to `recurring_bill_templates` with a CHECK constraint enforcing valid combinations (monthly requires no weekday/anchor; weekly requires a weekday; biweekly requires both). Also replaces the `(month_id, template_id)` unique constraint on `bill_instances` with two partial unique indexes, one for rows with a `due_date` and one for rows without, so weekly/biweekly templates can have multiple instances per month (one per due date)
- `0014_bill_installments.sql` — adds `installments_total` (nullable int) and `installments_start_month` (nullable date, day must be 1) to `recurring_bill_templates` with a CHECK enforcing "both null OR both set AND total > 0 AND cadence = 'monthly'". Also adds `installments_covered` (int, default 1, > 0) to `bill_instances` so a single payment can represent multiple installments (prepayment). Non-installment bills keep covered = 1 and are unaffected

---

## Repo structure (snapshot)

Point-in-time tree as of Piece 8 completion. Drifts as new files are added — refer to the working tree, not this snapshot.

```
home-finances-app/
├── CLAUDE.md
├── history.md
├── .env.local                             ← never commit (in .gitignore)
├── supabase/
│   └── migrations/
│       ├── 0001_initial_schema.sql
│       ├── 0002_rls_policies.sql
│       ├── 0003_bill_templates_unique_active_name.sql
│       ├── 0004_months_locking_and_rls.sql
│       ├── 0005_income_entries_rls.sql
│       ├── 0006_one_off_expenses_rls.sql
│       ├── 0007_savings_rls.sql
│       ├── 0008_drop_household_type.sql
│       ├── 0009_invitations_rls.sql
│       ├── 0010_cross_space_reads.sql
│       ├── 0011_spaces_mutation_policies.sql
│       └── 0012_invitee_join_policy.sql
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
│   │           ├── months/                ← monthly view
│   │           │   └── [year]/[month]/
│   │           │       ├── page.tsx
│   │           │       ├── _helpers.ts    ← getOrCreateMonth, syncBillInstances, isMonthLocked
│   │           │       ├── actions.ts
│   │           │       ├── actions/
│   │           │       ├── form-state.ts
│   │           │       ├── _types.ts
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
│   │   ├── date.ts                        ← todayYmd(), currentYearMonth()
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
