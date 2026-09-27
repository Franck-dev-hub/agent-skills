---
name: create-issue
description: Use when the user asks to create an issue, ticket, or bug report, or to decompose work into trackable tasks with priority, size, status, dependencies, or sub-issues on GitHub or GitLab.
---

## Process

### 1. Gather context proactively
Do not ask the user for every field.
Infer everything you can from their request, the project's AGENTS.md, CLAUDE.md, and the repo itself:
- **Platform**: detect from `.github/` (GitHub), `.gitlab/` or `.gitlab-ci.yml` (GitLab), or ask once if unclear. Read that platform's reference, `references/github.md` or `references/gitlab.md`, and only that one
- **Issue type**: infer from the language used (bug, feature, chore, question)
- **Priority**: infer from severity cues, map to the project's scale (default low / medium / high / urgent)
- **Size**: estimate relative effort when the project tracks it (default xs / s / m / l / xl)
- **Status**: the ticket lifecycle, when the project tracks one
- **Layer**: the single component or concern the ticket touches (default backend / frontend / ml / infra)
- **Phase**: the development phase the ticket belongs to (e.g. 0-7), when the project tracks one
- **Assignee**: leave unassigned unless the user specifies someone
- **Labels**: do not create labels. Ticket metadata lives in the platform's structured fields, see *Where metadata lives* below. Reserve labels for cross-cutting filters that already exist (`bug`, `good-first-issue`)
- **Sub-issues**: if the ask decomposes into smaller tracked units, create the children as their own issues and link them natively, never as a body checklist
- **Related issues**: search for keywords automatically

Only ask the user when you genuinely cannot determine something.

### 2. Enforce single-layer scope (always)

This tracker is **horizontal**, not vertical: one ticket touches exactly one `Layer` (backend, frontend, ml, infra, proxy, or whatever the project's `Layer` field defines), never a slice spanning several. This is a deliberate choice, the opposite of a "vertical slice"/tracer-bullet ticket that would cut through every layer at once, because `Layer` is a single-select field: forcing two layers into one ticket makes the field meaningless and the board unfilterable.

Before drafting the issue body, decide the `Layer` first. If the requested work genuinely needs more than one layer to be done (e.g. "add a DTO field and show it in the UI"), split it into one ticket per layer instead of writing a single multi-layer ticket:
- Create one issue per layer touched.
- Link them with the native relationship: the layer that must land first (usually backend/schema) blocks the others (`gh issue edit <downstream> --add-blocked-by <upstream>`).
- Each ticket's Acceptance Criteria stay scoped to its own layer only, never reference "and then update the frontend" inside a backend ticket.
- If the project uses sub-issues and the split tickets are naturally children of one umbrella issue, link them as sub-issues instead of (or in addition to) blocked-by.

Also split, regardless of layer, when a single-layer ticket is too large to be one unambiguous unit of work:
- **Size would land on `xl`** (or the project's largest bucket): break it into smaller same-layer tickets by sub-concern (e.g. one endpoint each, one migration batch each), chained with `blocked-by` in the order they must land.
- **Acceptance Criteria can't be made binary without listing more than ~5-6 checks**: that volume is itself a signal the ticket bundles unrelated done-conditions; split along the natural seams between them.
- A **wide mechanical change** (rename a column/symbol across the codebase): sequence as expand → migrate (one ticket per batch, sized by blast radius) → contract, same-layer, each batch blocked by the expand ticket.

Never split just to pad a ticket count: a small ticket that's genuinely one layer and one unit of work stays one ticket.

### 3. Check for duplicates (always)
Before creating, always search existing open issues for similar titles/keywords.
- **GitHub**: `gh issue list --search "<keywords>"`
- **GitLab**: `glab issue list --search "<keywords>"`
If a title seems to cover the same topic, read the full issue.
If it turns out to be a duplicate, present it and ask if they still want to proceed.

### 4. Detect dependencies/relationships (always)
Search for issues the user's request might relate to.
Offer to link them.
Only link genuinely obvious pairs (explicit prerequisite mentioned in the body, unmistakable technical dependency), never force a link to pad a count.
Use the platform's native relationship feature, never free text in the body. Syntax is in the platform reference.

Available types: blocks / is blocked by / relates to, plus duplicates on GitHub.

### 5. Build the command
Title follows *Title convention*, body follows *Body structure*, both below.
Construct the CLI command with only relevant flags.
Never include optional fields the user didn't mention.
Let the platform prompt for anything missing.

### 6. Apply the metadata (always)
Map each concept with the table below, then apply it with the platform reference.
- **GitHub**: Project fields are set **after** the issue exists, never at creation.
- **GitLab**: scoped labels go straight on the create command at step 5, so only relationships remain here.

Then set the relationships found at step 4.

## Where metadata lives

Never put priority, size, status, layer or phase in a label on GitHub, or in a free-text body line on either platform.

| Concept | GitHub | GitLab |
|---|---|---|
| Priority / Layer / Phase | Project single-select field | scoped label (`priority::high`) |
| Size | Project single-select field | scoped label (`size::m`) or issue weight |
| Status | Project single-select field | board list plus `status::in-review` |
| Parent / child | native sub-issue | epic (Premium) or a task list |
| Blocks / blocked by | native issue relationship | issue link, `link_type=blocks` |

Both columns enforce one value per axis (a ticket has one layer) and stay orderable, so a board can sort by phase or priority. Plain labels allow multiples and add repo noise.

Commands for each platform: `references/github.md`, `references/gitlab.md`.

## Project-specific conventions

The enum values above (priority, size, status, layer, phase) are defaults. A repo may define its own scales or field names in its AGENTS.md, CLAUDE.md, or a `.github/` issue template. When the repo specifies a convention, follow it over the defaults:
- Exact enum values (e.g. `Urgent / High / Medium / Low` instead of `low / medium / high / urgent`)
- Exact field names on the GitHub Project, or scoped label prefixes on GitLab
- Whether Size / Status / Layer / Phase are tracked at all
- Naming pattern for ticket files/IDs if the project prefixes them (e.g. `B-`, `F-`, `I-`)

Check the repo's issue templates (`gh issue list --template`) and AGENTS.md first; prefer its conventions when they conflict with the defaults above.

## Language

- Default: **British English** (colour, behaviour, initialise, centre, etc.)
- Never use em dashes. Use commas, semicolons, colons, or full stops instead.

## Requirements

- **GitHub**: `gh` CLI authenticated
- **GitLab**: `glab` CLI authenticated

## Title convention (default)
`[Type] Brief description` where type is one of: Feature, Chore, Fix, Refactor, Doc, Test, Style, Release

## Body structure (default)

No prose padding, no restating what's already visible in the diff/PR/code.
Every section below stops once it has answered its purpose, not at a fixed sentence or item count.

```markdown
**Context**
[Why this exists. Long enough to answer that, no more]

**User story** (optional, only when the ticket changes what someone can do and the who/what/why is not already obvious from the context)
As a [role], I want [capability], so that [outcome].
[One sentence. Drop it for chores, refactors, infra work and anything with no end user]

**Scope**
In: [what this covers]

**Out of scope** (optional, only if ambiguity is likely)
[What it explicitly excludes]

**Acceptance Criteria**
- [ ] [Binary, verifiable condition, no unquantified adjectives like "better"/"faster" without a number or a check command]
[as many items as needed to make the ticket done/not-done unambiguous, never padded]

**Alternatives** (optional, only if a real trade-off was considered)
[Alternative approach and why it wasn't chosen]

**Notes** (optional)
[Only if needed]

```

## Body structure (bug found)

```markdown
[Short description]

What I tried:
1. Step 1
    - [Status]
    - [Log (short)]
    - [Impact]
2. Step 2
    - [Status]
    - [Log (short)]
    - [Impact]
[And so on if needed]

What worked:
1. Step 1
    - [Status]
    - [Log (short)]
    - [Impact]
2. Step 2
    - [Status]
    - [Log (short)]
    - [Impact]
[And so on if needed]

System info:
OS: [...]
Kernel: [...]
package 1 version : [...]
package 2 version : [...]
[And so on if needed]

Notes / suggestions:
1. Short note
2. Short note
[And so on if needed]

```
