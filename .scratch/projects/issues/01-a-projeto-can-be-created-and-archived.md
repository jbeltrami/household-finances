# 01: A Projeto can be created and archived

**What to build:** A user can create a Projeto — a finite, named effort money is
spent toward — see it listed, rename it, and archive it when the effort is done.
No money is attached yet. This ticket makes the thing exist and lands the whole
additive schema the later tickets build on.

The schema arrives in one migration rather than five, the way `0012` landed
Categorias and Pagadores together. Everything in it is additive and nullable, so
old application code keeps working against the new schema and it can be pushed
before the app is deployed. Two of the three tables have no reader until ticket
03.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Migration `0017` creates `projects`, `project_budget_lines` and
      `project_budget_revisions`, all space-scoped
- [ ] It adds nullable `project_id` and `budget_line_id` to `entries`, and a
      nullable `project_id` to `recurring_bill_templates` and to `financings`
- [ ] `budget_line_id` is `ON DELETE SET NULL`, so an Item can be deleted
      without touching the spending that pointed at it
- [ ] The migration is additive only: no drops, no NOT NULL changes
- [ ] RLS on all three tables follows the established pattern — SELECT via
      `can_read_space`, writes via `is_active_member`
- [ ] A partial unique index on `(space_id, lower(trim(name))) where active`
      mirrors the one on `recurring_bill_templates` and `categories`
- [ ] Item names are unique per Projeto by the same partial-unique pattern
- [ ] `Projetos` appears in the nav, listing Ativos, with Arquivados behind a
      toggle
- [ ] A Projeto is created with a name, an icon and a colour drawn from the
      existing icon and palette registries
- [ ] A Projeto can be renamed, re-iconed and recoloured
- [ ] A Projeto can be archived and un-archived, and archiving changes no figure
      anywhere
- [ ] The name of an archived Projeto can be reused by a new one
- [ ] Deleting a Projeto is refused when anything references it, enforced in the
      action layer

## Further notes

The delete guard is deliberately **not** `ON DELETE RESTRICT` on
`entries.project_id`. Everything cascades from `spaces`, and a restrict there
would make deleting a space fail.
