# Issue tracker: local markdown

Issues for this repo are markdown files under `.scratch/`. There is no `gh` CLI
on this machine and no GitHub issue queue; the files are the tracker.

`.scratch/` is committed, so an issue arrives in the same diff as the work that
answers it.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- Implementation issues are one file per ticket at
  `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`. Never a
  single combined tickets file.
- The first line of an issue is `# NN: <the claim the ticket makes>`, followed
  by a `**What to build:**` paragraph. Match the existing files.
- Triage state is a `Status:` line near the top of the file. See
  `triage-labels.md` for the strings.
- Comments and conversation history append to the bottom under a `## Comments`
  heading.

## Specs live somewhere else

A spec that has settled is `docs/specs/<feature>.md`, not a file inside
`.scratch/`. `.scratch/<feature>/` holds the tickets that implement it. The two
share a slug where both exist, as `docs/specs/projects.md` and
`.scratch/categories-and-payers/` do.

Write a spec to `docs/specs/` when it describes behaviour the app will keep.
Leave it in `.scratch/` while it is still an argument about what to build.

## When a skill says "publish to the issue tracker"

Create a numbered file under `.scratch/<feature-slug>/issues/`, creating the
directory if needed.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. Numbers are scoped to a feature
directory, so `03` alone is ambiguous. Ask which feature if the path is not
given.

## Wayfinding operations

Used by `/wayfinder`. The map is a file with one child file per ticket.

- Map: `.scratch/<effort>/map.md`, holding the Notes, Decisions-so-far and Fog
  body.
- Child ticket: `.scratch/<effort>/issues/NN-<slug>.md`. A `Type:` line records
  `research`, `prototype`, `grilling` or `task`. A `Status:` line records
  `claimed` or `resolved`.
- Blocking: a `Blocked by: NN, NN` line near the top. A ticket is unblocked once
  every file it names is `resolved`.
- Frontier: scan `.scratch/<effort>/issues/` for files that are open, unblocked
  and unclaimed. Lowest number wins.
- Claim: set `Status: claimed` and save before doing any work.
- Resolve: append the answer under an `## Answer` heading, set
  `Status: resolved`, then append a pointer to the map's Decisions-so-far.
