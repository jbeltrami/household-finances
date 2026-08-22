# 02: Manage Pagadores

**What to build:** A third tab on the same management screen, listing the institutions that pay the user — an employer, a client, the government. A Pagador has a name and a colour and no icon: it renders as its initials on a coloured chip, because no icon set contains company logos and every employer would otherwise wear the same generic glyph. Create, rename, recolour, deactivate and delete-when-unreferenced all behave as they do for Categorias. The list starts empty in every space, since seeded institutions would be noise in someone else's finances.

**Blocked by:** 01 (shares the management screen shell and the CRUD action shape).

**Status:** done

- [x] The management screen has a third tab for Pagadores
- [x] Pagadores are listed alphabetically, each showing its initials on its colour
- [x] A Pagador can be created with a name and a colour
- [x] A Pagador can be renamed and recoloured
- [x] Creating a second active Pagador with an existing name is refused with a readable message
- [x] A Pagador can be deactivated, and its name then reused
- [x] A Pagador with no references can be permanently deleted; one with references is refused with a count
- [x] A brand-new space has no Pagadores

---

**Done.** Typecheck and production build clean; `payerInitials` checked against
one-word, multi-word, single-character and whitespace-only names. Interactive
criteria are implemented but not click-tested — that needs a signed-in session.

Note: the "create a Pagador from inside the Receita form" story is **not** here —
it belongs to ticket 05, which builds that form. This ticket delivers the
management screen only.
