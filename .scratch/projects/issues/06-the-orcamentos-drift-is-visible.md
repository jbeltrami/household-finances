# 06: The Orçamento's drift is visible

**What to build:** A Projeto reports what it was originally budgeted alongside
what it is budgeted now, and a timeline of every change between them. The
interesting fact about a reforma is rarely the final number; it is that it grew,
when, and why.

The current Orçamento is always the live sum of the Items and is never stored. A
revision row is an annotation on a timeline, not the mechanism that changes a
number.

Revisions are automatic. An explicit "Revisar orçamento" button was designed and
rejected: it makes the whole feature depend on the user remembering to declare a
revision in the middle of a reforma, and a timeline with gaps is worse than one
with unlabelled points.

**Blocked by:** 03.

**Status:** ready-for-agent

- [ ] A revision row is written when a Projeto is created, carrying its initial
      total, so "orçado 40.000" always has a source
- [ ] A revision is written whenever the total changes, coalesced to one per
      save
- [ ] The reason is prompted and can be skipped
- [ ] The current Orçamento is computed from the Items and never stored
- [ ] The Projeto page shows the original against the current total
- [ ] The timeline lists revisions with their dates and reasons
- [ ] Adding an Item mid-Projeto produces a revision rather than silently
      raising what the Projeto is said to have originally cost

## Further notes

That last criterion is the reason revisions are project-level rather than
per-Item. With open Items, per-Item before-and-after is not enough: add
`Projeto elétrico` at 7.000 in month four and the original 40.000 silently
becomes 47.000, erasing precisely the drift this ticket exists to show.
