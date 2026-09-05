# Triage labels

The skills speak in terms of five canonical triage roles. This repo tracks
issues as files rather than in a system with labels, so a role is written as a
`Status:` line near the top of the issue file.

| Role in mattpocock/skills | Value in our tracker      | Meaning                                  |
| ------------------------- | ------------------------- | ---------------------------------------- |
| `needs-triage`            | `Status: needs-triage`    | Needs evaluating before anyone starts     |
| `needs-info`              | `Status: needs-info`      | Blocked on a question the author must answer |
| `ready-for-agent`         | `Status: ready-for-agent` | Fully specified, an agent can take it     |
| `ready-for-human`         | `Status: ready-for-human` | Needs a human to implement                |
| `wontfix`                 | `Status: wontfix`         | Will not be actioned                      |

When a skill names a role, write the matching value. An issue file with no
`Status:` line is untriaged, the same as `needs-triage`; most files under
`.scratch/` predate this convention and carry no line at all.

Edit the middle column to change the vocabulary.
