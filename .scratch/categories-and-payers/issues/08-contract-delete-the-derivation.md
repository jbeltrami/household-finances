# 08: Contract — delete the derivation

**What to build:** Remove the old machinery now that nothing reads it. The icon registry stops doubling as the source of truth for classification: the function that derived a Categoria from an icon key goes, along with the one that picked a representative icon for a Categoria name, and the icon picker loses its group headings — those headings display compiled-in names, which would show a user "Moradia" while their own list says something else.

A follow-up migration then drops the Categoria text columns that migration 0012 deliberately left in place. They existed as the forensic record in case the backfill misfired; once production has been eyeballed and nothing reads them, they go.

This is last because every earlier ticket still reads or writes those columns.

**Blocked by:** 03, 04, 05, 06, 07.

**Status:** ready-for-agent

- [ ] The icon-to-Categoria derivation function is deleted and nothing references it
- [ ] The representative-icon-for-a-Categoria-name function is deleted and nothing references it
- [ ] The icon picker presents a flat set of icons with no category group headings
- [ ] A migration drops the Categoria text columns from entries and from Conta templates
- [ ] The full migration chain applies cleanly from scratch
- [ ] Assigning, displaying and aggregating Categorias all still work after the drop
- [ ] The project's documented highest-migration pointer is updated
