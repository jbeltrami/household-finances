# 02: Manage Pagadores

**What to build:** A third tab on the same management screen, listing the institutions that pay the user — an employer, a client, the government. A Pagador has a name and a colour and no icon: it renders as its initials on a coloured chip, because no icon set contains company logos and every employer would otherwise wear the same generic glyph. Create, rename, recolour, deactivate and delete-when-unreferenced all behave as they do for Categorias. The list starts empty in every space, since seeded institutions would be noise in someone else's finances.

**Blocked by:** 01 (shares the management screen shell and the CRUD action shape).

**Status:** ready-for-agent

- [ ] The management screen has a third tab for Pagadores
- [ ] Pagadores are listed alphabetically, each showing its initials on its colour
- [ ] A Pagador can be created with a name and a colour
- [ ] A Pagador can be renamed and recoloured
- [ ] Creating a second active Pagador with an existing name is refused with a readable message
- [ ] A Pagador can be deactivated, and its name then reused
- [ ] A Pagador with no references can be permanently deleted; one with references is refused with a count
- [ ] A brand-new space has no Pagadores
