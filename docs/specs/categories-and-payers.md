# Categorias e Pagadores

## Problem Statement

Today a Categoria is not something the user owns. It is a side effect of picking
an icon: choose the Wifi icon and the app silently files the Conta under
"Moradia". The seven category names are compiled into the app, so a user cannot
rename one, add one, retire one, or split one. If "Consumo" is the wrong word
for how this household thinks about food, that is simply the word forever.

Receitas have no such dimension at all. An income entry is a name, a date, an
amount, and a received flag. Users compensate by cramming structure into the
name — "Freelance XYZ" is a kind of income and an institution jammed into one
text field — which means the app holds the information but cannot count it.

The consequence is that the user cannot answer the two questions that motivate
keeping a finance app at all: over a period I choose, where did the money go,
and where did it come from?

## Solution

Give each space two lists it owns outright:

- **Categorias** — buckets that group money by kind, scoped to a direction.
  An income Categoria (Salário, Freelance) never appears where an outflow
  Categoria (Moradia, Saúde) belongs, and vice versa.
- **Pagadores** — the named institutions behind Receitas: an employer, a
  client, the government.

Every space starts with a sensible set of Categorias so nothing has to be built
from an empty screen, and every one of them can be renamed, recoloured,
re-iconed, deactivated, or deleted. Contas, Despesas, Receitas and
Financiamentos all carry an optional Categoria; Receitas additionally carry an
optional Pagador.

This spec covers the setup: the lists, the management screen, and wiring the
assignment into every place money is recorded. The date-range report those
lists exist to serve is deliberately a separate piece.

## User Stories

### Managing the lists

1. As a user, I want to see all my Categorias in one place, so that I can tell at a glance how my money is organised.
2. As a user, I want my outflow Categorias and my income Categorias listed separately, so that I am never offered "Moradia" as a source of income.
3. As a user, I want to see my Pagadores in the same place as my Categorias, so that I have one screen for everything that classifies money.
4. As a user, I want to create a new Categoria with a name, an icon and a colour, so that the app matches how I actually think about my spending.
5. As a user, I want to create a Pagador with a name and a colour, so that I can distinguish my employer from my clients at a glance.
6. As a user, I want to rename a Categoria, so that a word I chose badly at the start does not follow me forever.
7. As a user, I want a rename to apply to everything already filed under that Categoria, so that my history stays as one line instead of splitting in two.
8. As a user, I want to change a Categoria's icon and colour after creating it, so that I can tidy the list up without recreating anything.
9. As a user, I want to deactivate a Categoria I no longer use, so that it disappears from the pickers without erasing the history filed under it.
10. As a user, I want a deactivated Categoria to keep showing up in reports covering periods when I was using it, so that old months still add up.
11. As a user, I want to reuse the name of a Categoria I deactivated, so that retiring something does not permanently reserve its name.
12. As a user, I want to be stopped from creating two active Categorias with the same name in the same direction, so that my list does not fill with near-duplicates.
13. As a user, I want to use the same name on both sides — an income "Aluguel" and an outflow "Aluguel" — so that a word that genuinely means two things is not blocked.
14. As a user, I want to permanently delete a Categoria I created by mistake, so that a typo does not have to live on as a deactivated row.
15. As a user, I want deletion refused while entries still point at the Categoria, so that I cannot quietly detach months of history with one click.
16. As a user, I want to be told how many entries are blocking a deletion, so that I know whether to deactivate instead.
17. As a user, I want the lists sorted alphabetically, so that I can find an entry without hunting.
18. As a user, I want to reach the management screen from inside a Categoria picker, so that I can add a missing Categoria without abandoning the form I am filling in.

### Starting out

19. As a new user, I want my space to arrive with usable Categorias already in it, so that my first Conta can be filed without any setup.
20. As a new user, I want the starting outflow Categorias to be Moradia, Saúde, Transporte, Consumo, Família, Lazer and Financeiro, so that the common cases are covered.
21. As a new user, I want the starting income Categorias to be Salário, Freelance, Restituição, Vendas, Investimentos and Reembolso, so that ordinary household income has somewhere to go.
22. As a new user, I want no Pagadores pre-created, so that a list of strangers' institutions is not sitting in my space.
23. As an existing user, I want my Contas and Despesas to already be filed under the Categoria their icon implied, so that the change does not hand me a blank slate and years of untagged history.
24. As an existing user, I want anything the migration could not match to land in "Sem categoria" rather than be guessed at, so that I am not lied to about where my money went.

### Classifying money

25. As a user, I want to pick a Categoria when creating a Conta, so that every occurrence of that bill is counted in the right bucket.
26. As a user, I want to pick a Categoria when recording a Despesa, so that one-off spending is counted alongside my recurring bills.
27. As a user, I want to pick a Categoria for a Financiamento, so that my largest monthly outflow is not missing from the totals.
28. As a user, I want to pick a Categoria for a Receita, so that I can tell salary apart from freelance work.
29. As a user, I want to pick a Pagador for a Receita, so that I can tell which client or employer the money came from.
30. As a user, I want to leave the Categoria blank, so that logging a Despesa quickly stays quick.
31. As a user, I want to leave the Pagador blank, so that money with no obvious institution behind it does not need a fake one.
32. As a user, I want uncategorised money reported in its own bucket rather than hidden, so that the totals still reconcile.
33. As a user, I want to create a Pagador while filling in a Receita, so that a new client does not force me to leave the form.
34. As a user, I want an icon on a Conta that is independent of its Categoria, so that Netflix can wear a film icon while filed under Lazer.
35. As a user, I want a Conta with no icon of its own to display its Categoria's icon, so that leaving the icon blank still looks deliberate.
36. As a user, I want deactivated Categorias hidden from every picker, so that retiring one actually stops me using it.

### Recurring bills and inheritance

37. As a user, I want changing a Conta template's Categoria to move that bill's whole history, so that recategorising Claro from Moradia to Consumo does not split it across two lines at an arbitrary date.
38. As a user, I want every future occurrence of a recurring Conta to follow its template's Categoria automatically, so that I never have to re-tag the same bill month after month.
39. As a user, I want the amount I actually paid to stay frozen on a paid occurrence, so that recategorising never rewrites what a payment cost.

### Receitas

40. As a user, I want the name on a Receita to be optional, so that I stop having to invent a label when the Pagador and Categoria already say everything.
41. As a user, I want a Receita with no name to display as its Pagador and Categoria, so that the row is still readable in the monthly view.
42. As a user, I want my existing Receita names left exactly as I typed them, so that the migration does not reinterpret my records.
43. As a user, I want to add a name to a Receita anyway when it needs one, so that "Venda da bicicleta" is still expressible.

## Implementation Decisions

### Schema (migration 0012, already written and verified)

Two new space-scoped tables, RLS gated on `is_active_member` like every other
domain table:

```
categories
  id, space_id, kind ('income' | 'outflow'), name
  icon (nullable), color (not null, default 'slate'), active, created_at
  partial unique (space_id, kind, lower(trim(name))) WHERE active

payers
  id, space_id, name, color, active, created_at
  partial unique (space_id, lower(trim(name))) WHERE active
```

`kind` is `'income' | 'outflow'`, never `'expense'`. The glossary binds
*expense* to Despesas specifically, so an `'expense'` Categoria would read as
excluding Contas — the reverse of the intent. *Outflow* is the umbrella term
covering Contas, Despesas and Financiamentos.

`icon` and `color` are short string keys resolved by a registry in application
code, with no CHECK constraint, matching the convention set by the icon columns
in 0007 and 0008: the set of valid keys grows without a schema migration.

Referencing columns, all nullable, all `ON DELETE SET NULL`:
`recurring_bill_templates.category_id`, `entries.category_id`,
`financings.category_id`, `income_entries.category_id`,
`income_entries.payer_id`. `income_entries.name` becomes nullable.

Two invariants Postgres cannot express and application code must uphold: a
referenced Categoria must have the matching `kind`, and it must belong to the
same space. The first is upheld by routing every read through a kind-filtered
helper; the second by RLS.

### Categories are referenced, not snapshotted

On a template-bound entry, `category_id IS NULL` means *inherit from the
template*. On a one-off it means *uncategorised*. `template_id` disambiguates
the overloaded null. This is deliberately unlike `name` and `amount`, which are
frozen into the row at materialisation. The reasoning and the rejected
alternatives are recorded in ADR 0001; the practical consequence is that
category aggregation joins `recurring_bill_templates` for the null case, and
that join must not be optimised away by reintroducing the copy.

An accepted limitation: a single occurrence cannot be explicitly
*un*-categorised against a categorised template.

### Seeding and backfill

An `AFTER INSERT ON spaces` trigger seeds thirteen Categorias into every new
space, kept separate from `handle_new_user` so a space created any other way
still gets its taxonomy. The seed function is `SECURITY DEFINER` and therefore
has `EXECUTE` revoked from `public`, `anon` and `authenticated` — it takes a
space id and writes, so leaving it callable would let any signed-in user seed
into someone else's space. This mirrors the lockdown 0010 applied to
`handle_new_user`.

The backfill matches the old `category` text against the freshly seeded names,
case-insensitively. Template-bound entries are deliberately skipped so they
inherit. Unmatched text stays NULL. The old text columns survive this migration
and are dropped in `0013_drop_category_text.sql` once the backfill is confirmed
in production — they are the only forensic record if the mapping misfires.

### Application modules

**Icon registry.** The registry currently doubles as the category source of
truth: entries carry a `category` field and `categoryFor()` reads it. That
coupling is what this work removes. The registry flattens to icon key, label and
component; the picker loses its category group headings, which would otherwise
display compiled-in names while the user's actual Categorias say something else.
`categoryFor` and `representativeIconForCategory` are deleted once the report
page reads `categories.icon` instead. Six income-oriented icon keys are owed,
referenced by the seed but not yet registered: `banknote`, `laptop`, `landmark`,
`tag`, `trending-up`, `rotate-ccw`.

**Taxonomy helper.** A new helper module owns all reads of `categories` and
`payers`. Its category-fetching function takes `kind` as a required argument
rather than an optional filter, so no call site can forget it and surface income
Categorias in an outflow picker.

**Ledger resolution.** `getEntriesForMonth` already joins templates to resolve
name and amount for virtual occurrences; category resolution follows the same
path. The resolved entry type gains the Categoria's identity, name, icon and
colour, replacing the current bare `category` string. Row components read the
resolved value and no longer care whether it came from the row or its template.

**Management screen.** A sub-route under Configurações rather than a seventh
sidebar entry: this is configuration visited twice a year, and the sidebar is
already at six items. Three tabs — outflow Categorias, income Categorias,
Pagadores — each an alphabetical list with inline create, edit, deactivate and
delete. Deletion is refused with a count while references exist.

**Forms.** The Conta template form, the Despesa form, the Receita form and the
Financiamento form each gain a Categoria select; the Receita form additionally
gains a Pagador select with inline creation. Both selects are optional and list
only active rows of the correct kind. The Receita name field becomes optional.

**Actions.** The create and update actions for templates, one-off entries,
income and financings stop deriving `category` from the icon and start
persisting the submitted `category_id`. The three materialisation paths —
`toggle-entry-paid`, `override-entry-amount`, `skip-entry-occurrence` — stop
copying the template's category into the new row and leave `category_id` NULL so
it inherits. New actions cover category and payer CRUD. All follow the existing
convention: one action per file, `FormState` returned rather than thrown,
`23505` mapped to a friendly duplicate-name message.

**Aggregation.** `getCategorySpendForRange` currently reads a flat
`entries.category` text column. It gains the template join for inherited
categories, and its return type carries the Categoria's identity and colour so
callers can render consistently. Wiring Financiamento spend into the same
totals belongs to the report piece, not this one.

## Testing Decisions

The repository has no test runner and no test files today, so this spec
introduces testing rather than extending it. That makes seam choice the main
decision, and the answer is to add as few as possible.

**What makes a good test here.** Tests should exercise observable behaviour
through a module's public interface, not its internals. A test that asserts
"an entry whose template is filed under Moradia counts toward Moradia even
though its own category_id is null" is testing behaviour. A test that asserts a
particular SQL string was built, or that a helper was called, is testing
implementation and will break on every refactor while catching nothing.

**The seam: one.** Split `getCategorySpendForRange` into a thin Supabase fetch
and a pure fold over the rows it returns. The fold takes entries, templates and
categories as plain data and returns per-Categoria totals. All the logic worth
protecting lives in that function:

- inheritance — a template-bound row with a null category resolves through its
  template
- override — a template-bound row with a category of its own wins over the
  template's
- the paid/unpaid rule — Contas count only when paid, Despesas always count
- skipped rows are excluded
- uncategorised money accumulates into its own bucket rather than vanishing
- deactivated Categorias still appear when historical rows reference them

The Supabase query on the other side of the split stays a thin uninteresting
wrapper and is not tested.

**Prior art.** There is none in-repo. The nearest thing is the pure-function
style already used in `src/helpers/` — `expandTemplateForMonth`, the
amortisation schedule builder, and the date string helpers are all pure and
directly callable, which is why this seam sits naturally alongside them rather
than introducing a foreign pattern.

**Database-level behaviour** — the seed trigger, the partial unique index,
`ON DELETE SET NULL`, and the backfill mapping — was verified during design by
applying the full migration chain to a throwaway Postgres container with the
Supabase `auth` schema shimmed, planting representative legacy rows, and
asserting the resulting state. That was a one-off harness, not a checked-in
suite. Promoting it to a repeatable script is worth doing if migrations keep
carrying data transformations, but it is not part of this spec.

## Out of Scope

- **The date-range report.** The whole point of the lists, and deliberately its
  own piece. Semantics settled so far: received-only for Receitas, a merged
  outflow total per Categoria with the Contas/Despesas split beneath it, and
  Financiamento spend unioned in. The range UI, and whether the new report
  replaces the existing annual category page or sits beside it, remain open.
- **Merging two Categorias.** The right eventual answer to "I made both Consumo
  and Alimentação"; deactivation covers the need for now.
- **Manual reordering.** Alphabetical only. No sort column, no drag and drop.
- **Per-occurrence Categoria override in the UI.** The schema permits it; no
  form exposes it.
- **Counterparties on outflows.** Pagador is income-only. On the outflow side
  the counterparty is already the Conta's own name. Adding `payer_id` to
  templates and entries later would be additive.
- **Parsing existing Receita names.** "Freelance XYZ" is not split into a
  Categoria and a Pagador. A wrong guess writes bad data into history nobody
  will audit.
- **Recurring income templates.** Unrelated, still listed under future
  improvements.
- **Dropping the old `category` text columns.** Deliberately deferred to 0013.

## Further Notes

Vocabulary is recorded in `CONTEXT.md`: **Categoria**, **Pagador**, and a note
on why *Fonte* names neither — in pt-BR *fonte de renda* reads as the kind of
income, which is Categoria, while the word is equally reachable for the
institution, which is Pagador.

The inheritance decision is ADR 0001, and both it and the `kind` enum are
recorded as gotchas in `CLAUDE.md`.

Migration 0012 is written and verified against a local Postgres but has not been
pushed. Because pushing the schema and deploying the application are separate
steps, there is a brief window where one runs against the other. Nothing in 0012
is destructive — it only adds tables, adds nullable columns, and relaxes a NOT
NULL — so old application code continues to work against the new schema, and the
schema should be pushed first.
