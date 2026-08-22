# 18: The Conta and Financiamento actions use the shared lookup

**What to build:** Creating, editing, deactivating and reactivating a Conta
recorrente, and every Financiamento action — creating one, recording an
amortização, marking a parcela paid, setting its Categoria, deactivating it — move
onto the shared lookup.

The Financiamento actions carry a second check that is not about the session and
must survive: a caller can name any Financiamento id, so each write confirms the
loan is actually visible to them before touching its child rows.

**Blocked by:** 16.

**Status:** done

- [x] Every Conta template action uses the shared lookup
- [x] Every Financiamento action uses the shared lookup
- [x] The ownership check on a caller-supplied Financiamento id is untouched
- [x] Creating, editing, deactivating and reactivating a Conta still work
- [x] A duplicate active Conta name still fails with a friendly message rather
      than a database error
- [x] Recording an amortização, deleting one, and marking a parcela paid still
      work
