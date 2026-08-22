# Mission: Building software you'd defend in a code review

## Why

João is building a real personal-finance app for friends and family, and using
it as the vehicle to become the kind of engineer whose schema decisions still
look right two years later. The goal is not more features — it is that the
next hard call (how to model a thing, how to migrate it live, where a type
should carry weight) gets made from reasoning rather than from pattern-matching
whatever the last codebase did.

## Success looks like

- Reaching for the right modelling primitive by name, and being able to say
  out loud why the alternative loses, before writing any SQL
- Evolving a live schema without a maintenance window, and knowing which
  changes genuinely require one
- Putting types where they prevent a real class of bug, and leaving them out
  where they only add ceremony
- Reading an unfamiliar Next.js codebase and predicting which side of the
  server/client boundary a given piece of code has to live on
- Turning a vague product idea into a spec, a set of shippable slices, and a
  written decision record — without being prompted through the steps

## Constraints

- Learning happens alongside shipping, in whatever time the app gets. Lessons
  must be short and completable in one sitting.
- Grounded in this repo wherever possible. Abstract examples land worse than
  code that is already running.
- Comfortable with the stack day to day, but some fundamentals were learned by
  pattern-matching rather than from first principles. Lessons can move fast,
  and should name the gap they are filling.
- Portuguese UI, English code. Domain examples use the app's own vocabulary.

## Out of scope

- Devops, deployment pipelines, and infrastructure beyond what Vercel and
  Supabase already do
- Frontend visual design and CSS craft
- Alternative stacks. The point is depth in this one, not breadth across many.
