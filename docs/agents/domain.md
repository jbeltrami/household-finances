# Domain docs

How the engineering skills should read this repo's domain documentation before
touching the code.

## Read these first

- `CONTEXT.md` at the repo root. It is a glossary and nothing else: the terms
  the project uses, the code name each one maps to, and the synonyms to avoid.
  The interface is Portuguese and the code is English, so most concepts carry
  two names.
- `docs/adr/`, for any decision that touches the area you are about to change.

This repo is single-context. There is no `CONTEXT-MAP.md` and no per-directory
ADR folder.

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-categories-are-referenced-not-snapshotted.md
│   ├── 0002-avisos-are-stateless-and-repeat-daily.md
│   ├── 0003-the-database-is-the-security-boundary.md
│   ├── 0004-every-api-route-authenticates-itself.md
│   └── 0005-project-actuals-live-in-the-entries-ledger.md
└── src/
```

If one of these files is missing, carry on without saying anything. Do not flag
the absence and do not offer to create them upfront. `/domain-modeling` writes
them when a term or a decision actually gets settled.

## Use the glossary's words

When your output names a domain concept, in an issue title, a refactor
proposal, a hypothesis or a test name, use the term as `CONTEXT.md` defines it.
Each entry lists the synonyms to avoid; do not drift to them. Write Conta, not
boleto. Write Despesa, not gasto.

A concept missing from the glossary is a signal. Either you are inventing
language the project does not use, which is worth reconsidering, or there is a
real gap worth noting for `/domain-modeling`.

## Flag ADR conflicts

If what you are proposing contradicts an ADR, say so rather than quietly
overriding it:

> Contradicts ADR-0003 (the database is the security boundary), but worth
> reopening because...
