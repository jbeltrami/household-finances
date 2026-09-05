# 04: Money inside a Projeto is classified once

**What to build:** An Item points at a Categoria, and spending filed under that
Item inherits it. The user picks "Materiais" inside the Reforma and the category
report still sees "Casa", without anyone classifying the same payment twice.

This extends ADR 0001 rather than changing it. A Categoria on a Conta template
is a classification of the bill itself, so a template-bound row keeps resolving
through its template even when it also belongs to a Projeto. The Item is the
fallback for one-offs.

The accepted cost is a third meaning for a NULL `category_id`: inherit from the
template, inherit from the Item, or genuinely uncategorised. `template_id` and
`budget_line_id` disambiguate it. ADR 0001 already named this overload as the
price of the referenced-not-snapshotted decision.

**Blocked by:** 03.

**Status:** ready-for-agent

- [ ] An Item may point at a Categoria, and only outflow Categorias are offered
- [ ] A one-off with an Item and no Categoria of its own resolves through the
      Item's Categoria
- [ ] A template-bound row that also belongs to a Projeto still resolves through
      its template
- [ ] A row whose Item has no Categoria is reported as uncategorised, not filed
      under the Projeto
- [ ] The category fold takes the Items and applies the order template, then
      Item, then uncategorised, tested through its interface on plain data
- [ ] `project_budget_lines` is added to the referencing-tables list in the
      taxonomy module, so the Categoria delete guard counts Items
- [ ] Deleting a Categoria referenced only by an Item is refused and reports the
      count, like any other reference

## Further notes

The referencing-tables list is a real trap. It is the single place "can I delete
this Categoria?" is answered, its own comment says to add to it when a new table
gains a `category_id`, and the FK is `ON DELETE SET NULL` — so forgetting it
does not error, it silently drops an Item's Categoria the next time a user tidies
their list.

Only outflow Categorias are offered because Postgres cannot enforce direction
across tables; the taxonomy module makes it a type error instead, and that
invariant has to be honoured here too.
