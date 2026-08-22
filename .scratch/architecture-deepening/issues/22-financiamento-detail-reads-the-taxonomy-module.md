# 22: The Financiamento detail page reads the taxonomy module

**What to build:** The detail page asks for the outflow Categorias twice — once
active for the picker, once including deactivated so a loan filed under a retired
Categoria still shows it. It reads the shared module instead.

**Blocked by:** 21.

**Status:** done

- [x] The page reads the taxonomy module
- [x] The picker still offers only active Categorias
- [x] A Financiamento filed under a deactivated Categoria still shows it
- [x] Saving from that state does not silently clear the Categoria
