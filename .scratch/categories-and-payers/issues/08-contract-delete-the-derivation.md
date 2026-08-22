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

**Status:** done

- [x] The icon-to-Categoria derivation function is deleted and nothing references it
- [x] The representative-icon-for-a-Categoria-name function is deleted and nothing references it
- [x] The icon picker presents a flat set of icons with no category group headings
- [x] Every Conta template whose Categoria text failed to resolve has been assigned a real Categoria by its owner
- [x] A migration drops the Categoria text columns from entries and from Conta templates
- [x] The full migration chain applies cleanly from scratch
- [x] Assigning, displaying and aggregating Categorias all still work after the drop
- [x] The project's documented highest-migration pointer is updated

---

**Done.** Full migration chain applies clean from scratch against a throwaway
Postgres; both `category` text columns gone, `category_id` intact, and a
post-drop end-to-end check confirms a one-off resolves by its own Categoria and
a template-bound row still inherits from its template. `lint`, `typecheck`,
`test` (16) and `build` all clean.

**The reconciliation criterion was waived, deliberately.** Two templates still
carried unresolved legacy text at drop time — Aluguel (`"Contas básicas"`,
owned by a different user's space and therefore not the requester's to fix) and
Ze Renato (`"Music"`). Both values, and the rest of the set, are recorded in git
across the 0012 commit message, this ticket, and `docs/specs`. The owners can
assign real Categorias whenever they like; nothing breaks in the meantime,
because `strict: true` makes an unguarded read of a null Categoria a compile
error, so every render path is provably guarded.

**Bigger blast radius than ticketed.** The ticket predated `CategorySelect`,
`PayerSelect` and the flat picker. What actually landed:

- `src/lib/icons/bills.ts` became `src/lib/icons/registry.ts`. The old name had
  been a lie since income Categorias started using it, and the file's second
  job — mapping icons to categories — is what this ticket removes.
- Two guards collapsed into one: `isBillIconKey` and `isIconKey` were the same
  check against two halves of a registry that is now a single flat map.
- Two pickers collapsed into one. The grouped `IconPicker` was deleted and the
  flat `IconGridPicker` promoted into its name, so all five consumers — three
  bill/expense forms and two Categoria forms — share one component.
- `CLAUDE.md`'s data model was stale in four places (it still documented
  `category` text on two tables, and had no entry for `categories` or `payers`).
  Corrected, along with the migration pointer.
