# Teaching notes

Working notes on how João wants to be taught. Read this before designing a
lesson.

## Workspace location

This workspace lives at `docs/learning/`, not the repo root. The teach skill
defaults to the current directory, but the root already holds `CONTEXT.md`,
`history.md`, `docs/` and `.scratch/`; adding seven more
top-level entries would bury them. Everything else follows the skill's
structure — `MISSION.md`, `RESOURCES.md`, `lessons/`, `reference/`,
`assets/`, `learning-records/` — just one level down.

## Observed preferences

Drawn from the categories-and-payers sessions, not from asking.

- **Wants to be argued with before building.** Opened the feature with
  `grill-with-docs` and worked four full rounds of questions before a line of
  code existed. Lessons should challenge, not just present.
- **Answers "go with recommendation" often.** Lead with a clear position and
  the reasoning behind it rather than laying out options neutrally. When he
  overrides, he does it decisively and briefly — so the recommendation is
  doing real work.
- **Cares about decisions being written down.** Accepted an ADR, a glossary,
  a spec, and eight tickets without pushback, and asked for ticket status to
  be maintained. Process artefacts are valued, not tolerated.
- **Portuguese UI, English code.** The glossary in `CONTEXT.md` carries both
  names for each concept. Lessons in English; domain examples in the app's
  own vocabulary (Receita, Conta, Despesa, Categoria, Pagador).
- **Learns by shipping.** The stated purpose of the whole project is testing
  and learning. Lessons should attach to code that actually exists in this
  repo wherever possible.

## Open

- **Lesson 01 outcome unknown.** "Freeze or Follow" is written but no learning
  record claims he has learned it — he accepted the inherit-vs-snapshot
  recommendation during the grilling rather than deriving it, which is not the
  same thing. Ask how the quiz went before building on it; the answers to Q4
  and Q5 are the ones that tell you whether the rule generalised or just the
  example landed.
- **Three mission strands, one spine.** Data modelling is the throughline for
  now. Next.js and workflow lessons should hang off a modelling decision
  rather than arriving as separate tracks.
