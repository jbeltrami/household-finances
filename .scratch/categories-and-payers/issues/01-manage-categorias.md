# 01: Manage Categorias

**What to build:** A user can open Configurações and manage their own list of Categorias, split into two tabs — one for outflows (Contas, Despesas, Financiamentos) and one for Receitas. They can create a Categoria with a name, an icon and a colour; rename it; change its icon or colour; deactivate one they no longer use; and permanently delete one nothing references yet. Lists are alphabetical. Nothing else in the app consumes these lists yet — this ticket is about owning them.

This ticket also lands the shared read helper every later ticket depends on. It takes the direction as a required argument rather than an optional filter, so no future call site can accidentally offer an income Categoria where an outflow one belongs. The six income-oriented icon keys the database seed already references need registering, or the seeded income Categorias render as the fallback receipt icon.

**Blocked by:** None (can start immediately). Assumes migration 0012 has been pushed.

**Status:** done

- [x] Configurações links to a categories management screen with an outflow tab and an income tab
- [x] Each tab lists that direction's active Categorias alphabetically with icon, colour and name
- [x] A Categoria can be created with name, icon and colour; it appears in the correct tab immediately
- [x] A Categoria can be renamed, and its icon and colour changed, without recreating it
- [x] Creating a second active Categoria with an existing name in the same direction is refused with a readable message, not an error boundary
- [x] The same name is accepted across the two directions
- [x] A Categoria can be deactivated; it disappears from the list's active view but is not deleted
- [x] The name of a deactivated Categoria can be reused for a new one
- [x] A Categoria with no references can be permanently deleted
- [x] Deleting a Categoria that entries still reference is refused, and the message says how many reference it
- [x] The six income icon keys used by the database seed resolve to real icons rather than the fallback
- [x] Categoria reads go through one helper that requires the direction as an argument

---

**Done.** Typecheck and production build clean; route registered and
proxy-protected at runtime; reference-count query shape valid against all four
referencing tables in the live schema. The interactive criteria are implemented
but were not click-tested — that needs a Google OAuth session.

Note: `npm run lint` is broken repo-wide (typescript-eslint does not support
TS 7.0), so no lint ran on this code.
