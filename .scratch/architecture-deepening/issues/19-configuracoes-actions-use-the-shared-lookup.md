# 19: The Configurações actions use the shared lookup

**What to build:** Renaming the space, the WhatsApp and monthly-report settings,
and every Categoria and Pagador action move onto the shared lookup. The four
actions that currently return their own differently-shaped unauthenticated result
are brought into line — including the one whose message carries a stray full stop.

**Blocked by:** 16.

**Status:** done

- [x] Every Configurações action uses the shared lookup
- [x] Every Categoria and Pagador action uses the shared lookup
- [x] Actions that return extra fields alongside an error keep returning them
- [x] The odd unauthenticated messages are normalised to one wording
- [x] Renaming the space still refreshes the name in the navigation immediately
- [x] Creating, renaming, deactivating and deleting a Categoria and a Pagador all
      still work
- [x] Deleting a Categoria still refuses while rows reference it, and still
      reports how many
- [x] A duplicate active Categoria or Pagador name still fails with a friendly
      message
