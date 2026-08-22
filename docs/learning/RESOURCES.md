# Resources

## Knowledge

- [Kimball Group — "Slowly Changing Dimensions" (Ralph Kimball, 2008)](https://www.kimballgroup.com/2008/08/slowly-changing-dimensions/)
  The canonical vocabulary for "does this attribute overwrite or preserve
  history": Type 1 through Type 7. Written for warehouses, but the naming is
  what the whole industry uses. Use for: any argument about whether changing a
  value should rewrite the past.

- [Kimball Group — Dimensional Modeling Techniques (index)](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
  The full technique catalogue behind the SCD types. Use for: looking up a
  named pattern before inventing one.

- [The Database Programmer — "Denormalization Patterns" (Kenneth Downs, 2008)](http://database-programmer.blogspot.com/2008/04/denormalization-patterns.html)
  The transactional counterpart to Kimball. Its sidebar "Is FETCH Really
  Denormalizing?" makes the sharpest version of the argument: copying a price
  onto an order line is not denormalization, because the price paid is a
  *different fact* from the current catalogue price. Use for: deciding whether
  a copied column is duplication or a genuinely new fact.

- [Wikipedia — Slowly changing dimension](https://en.wikipedia.org/wiki/Slowly_changing_dimension)
  Fast reference for the type numbers when you need to look one up mid-argument.

## Wisdom (Communities)

Not yet discussed. Candidates to raise when the moment is right — a question
comes up that reading cannot settle:

- [r/PostgreSQL](https://reddit.com/r/PostgreSQL) — strong signal on schema and
  index design, low tolerance for hand-waving.
- [Supabase Discord](https://discord.supabase.com) — the fastest place to get an
  RLS policy critiqued by people who write them daily.

## Gaps

- **Next.js server/client boundary.** No high-trust source yet beyond the
  official docs. Needs a real one before a lesson on that mission strand.
- **Expand–contract migrations.** The pattern is well known in practice but
  the widely-cited write-ups are thin. Worth hunting for a better primary
  source than a blog post.
- **TypeScript modelling.** Nothing recorded yet. Matt Pocock's material is the
  obvious candidate given the skills already installed here, but it should be
  a specific article, not a whole catalogue.
