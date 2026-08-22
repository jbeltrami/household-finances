# 08: Contract — delete the derivation

**What to build:** Remove the old machinery now that nothing reads it. The icon registry stops doubling as the source of truth for classification: the function that derived a Categoria from an icon key goes, along with the one that picked a representative icon for a Categoria name, and the icon picker loses its group headings — those headings display compiled-in names, which would show a user "Moradia" while their own list says something else.

A follow-up migration then drops the Categoria text columns that migration 0012 deliberately left in place. They existed as the forensic record in case the backfill misfired; once production has been eyeballed and nothing reads them, they go.

This is last because every earlier ticket still reads or writes those columns.

**Do not drop the text columns until the unresolved Conta templates are
reconciled.** Migration 0012 assumed the old Categoria text was always one of
the seven icon-group names. Production proved otherwise: seven active Conta
templates across two spaces carry free-text predating the icon derivation —
"House", "Occam", "Contas básicas", "Health", "Music" — which resolved to
nothing. Those bills and the 46 entries inheriting from them currently read as
"Sem categoria". The text column is the only remaining record of what their
owners meant, so dropping it before someone assigns real Categorias destroys
the evidence. Reconciliation is a user decision about their own vocabulary,
not a mapping to guess at: once tickets 01 and 03 ship, it is a few minutes of
assigning Categorias in the management screen.

**Blocked by:** 03, 04, 05, 06, 07.

**Status:** ready-for-agent

- [ ] The icon-to-Categoria derivation function is deleted and nothing references it
- [ ] The representative-icon-for-a-Categoria-name function is deleted and nothing references it
- [ ] The icon picker presents a flat set of icons with no category group headings
- [ ] Every Conta template whose Categoria text failed to resolve has been assigned a real Categoria by its owner
- [ ] A migration drops the Categoria text columns from entries and from Conta templates
- [ ] The full migration chain applies cleanly from scratch
- [ ] Assigning, displaying and aggregating Categorias all still work after the drop
- [ ] The project's documented highest-migration pointer is updated
