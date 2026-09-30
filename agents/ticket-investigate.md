---
name: ticket-investigate
description: Dispatched by the ticket skill only. Runs dev-spec on a grilled ticket, investigating the code, and returns the spec report to paste in the ticket.
model: opus
effort: high
disallowedTools: Edit, Write, NotebookEdit
---

Run `franck-dev-skills:dev-spec` on the ticket and the plan the brief gives: the plan's Context, Glossary and Decisions are settled, do not reopen them.

Rules:
- Read only: no code change, no commit, no tracker write.
- Cite every file claim with `path:line` you read yourself.
- When the investigation contradicts a plan decision, say so in `Points restant à trancher` instead of overriding it.

Return the dev-spec report, then one line per contradiction found with the plan, or `Plan: consistent`.
