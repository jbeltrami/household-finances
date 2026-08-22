# Categories are referenced, not snapshotted

Every other attribute a materialized entry inherits from its recurring bill
template — name, amount, currency — is **copied** into the row at
materialization and frozen there. `category_id` deliberately is not: it is a
live foreign key, and on a template-bound row `NULL` means *inherit from the
template* rather than *uncategorised*. An amount is a fact about a payment that
happened, so freezing it is correct; a category is a classification of the bill
itself, so freezing it splits one bill's history across two categories at
whatever arbitrary date the user happened to reorganise their list. Recategorise
Claro from Moradia to Consumo and all thirty paid months move with it.

## Consequences

Category aggregation cannot read `entries` alone — rows with
`template_id IS NOT NULL AND category_id IS NULL` resolve through a join to
`recurring_bill_templates`. That join is the price of the decision and should
not be "optimised away" by reintroducing the copy.

`NULL` is overloaded: *inherit* on a template-bound row, *uncategorised* on a
one-off. `template_id` disambiguates it. The accepted limitation is that a
single occurrence cannot be explicitly un-categorised against a categorised
template.

## Considered and rejected

**Copy at materialization, then cascade on template edit.** Keeps aggregation a
single-table read, but reintroduces exactly the cascade step the ledger model
was built to eliminate (see CLAUDE.md → "Template edits flow through virtual
occurrences for free"), and a cascade that misses a row corrupts history
silently.

**Snapshot the category name as text, as the pre-migration schema did.** History
becomes immutable, but a rename then fractures the report into two lines
permanently and typos are unfixable — which defeats the point of making
categories user-managed at all.
