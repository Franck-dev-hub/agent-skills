---
name: create-issue
description: Use when the user asks to create an issue, ticket, or bug report, or to decompose work into trackable tasks with priority, size, status, dependencies, or sub-issues on GitHub or GitLab.
---

## Process

### 1. Gather context proactively
Do not ask the user for every field.
Infer everything you can from their request, the project's AGENTS.md, CLAUDE.md, and the repo itself:
- **Platform**: detect from `.github/` (GitHub), `.gitlab/` (GitLab), or ask once if unclear
- **Issue type**: infer from the language used (bug, feature, chore, question)
- **Priority**: infer from severity cues, map to the project's priority scale (default low / medium / high / urgent). Record it on the Project single-select `Priority` field after creation, never as a label
- **Size**: estimate relative effort when the project tracks it. Match the project's scale (default xs / s / m / l / xl). Record it on the Project single-select `Size` field, never as a label
- **Status**: track the ticket lifecycle when the project does. GitHub: set it on the Project single-select `Status` field after creation. Note: GitHub's default `Status` field ships with fixed options `Todo / In Progress / Done` that cannot be renamed via the API; if the project needs a different lifecycle (e.g. `backlog / ready / in review`), it must add its own single-select field
- **Layer**: the component or concern a ticket touches when the project tracks it. Match the project's scale (default backend / frontend / ml / infra). Record it on the Project single-select `Layer` field, never as a label. Rationale: a single select enforces one value per issue (a ticket is one layer), unlike labels which allow multiples and add repo noise
- **Phase**: the development phase a ticket belongs to when the project tracks it (e.g. 0-7). Record it on the Project single-select `Phase` field, never as a label. Rationale: single select is ordered, so the board can sort/filter by phase in sequence; labels cannot be ordered. Use `Required` on the field if every issue must carry a phase
- **Assignee**: leave unassigned unless the user specifies someone
- **Labels**: do not create labels. All ticket metadata (priority, size, status, layer, phase, type) lives in the GitHub Project single-select fields, not as repo labels. Reserve labels (if any already exist) for cross-cutting concerns that need filtering in the Issues tab (`bug`, `good-first-issue`)
- **Project**: find the project ID (`gh project list`) and note the available single-select fields (`gh project field-list`), their option IDs and option colours (`gh api graphql` on the field to read `options { id name color }`). After creating the issue, add it to the project and set the fields:
  - `gh project item-add <project-id> --owner <owner> --url <issue-url>` (no `--repo` flag; scope is implied by the project's owner)
  - Resolve the field and option IDs up front, then:
  - `gh project item-edit --id <item-id> --project-id <project-id> --field-id <field-id> --single-select-option-id <option-id>`
  - Repeat once per field (Priority, Size, Status, Layer, Phase). The `--field-id` and `--single-select-option-id` forms are the only reliable ones; `--field`/`--value` do not resolve single-select fields
- **Option colours**: single-select options have a colour from the enum `GRAY, BLUE, GREEN, YELLOW, ORANGE, RED, PINK, PURPLE` (GitHub Primer palette, not hex codes). Default options are `GRAY`. To set colours on existing options, use the `updateProjectV2Field` GraphQL mutation with `singleSelectOptions` (each entry: `id`, `name`, `color`, `description`). Sensible defaults: Urgent→RED, High→ORANGE, Medium→YELLOW, Low→GREEN. For `Layer`: backend→BLUE, frontend→PINK, ml→PURPLE, infra→GRAY (or leave default GRAY)
- **Sub-issues**: if the issue decomposes into smaller tracked units and the project uses them, create the children as their own issues and link them natively:
  - At creation: `gh issue create ... --parent <parent-number>`
  - After creation: `gh issue edit <parent> --add-sub-issue <child>` (a sub-issue has exactly one parent, but a parent can have many children; adding it to a new parent moves it). Remove with `--remove-sub-issue` / `--remove-parent`
  - The Project system fields `Parent issue` and `Sub-issues progress` are read-only and derived. They may render as "Invalid value" in the UI if the item was added to the project before the parent relationship existed; deleting and re-adding the item does not always refresh them (known GitHub bug)
- **Related issues**: search for keywords automatically

Only ask the user when you genuinely cannot determine something.

### 2. Check for duplicates (always)
Before creating, always search existing open issues for similar titles/keywords.
- **GitHub**: `gh issue list --search "<keywords>"`
- **GitLab**: `glab issue list --search "<keywords>"`
If a title seems to cover the same topic, read the full issue.
If it turns out to be a duplicate, present it and ask if they still want to proceed.

### 3. Detect dependencies/relationships (always)
Search for issues the user's request might relate to.
Offer to link them.
Only link genuinely obvious pairs (explicit prerequisite mentioned in the body, unmistakable technical dependency), never force a link to pad a count.
Use the platform's native relationship feature, never free text in the body:
- **GitHub**: use `gh issue edit <n> --add-blocked-by <m>` / `--add-blocking <m>` (native sidebar relationship, not a body mention). Set one direction per pair, GitHub shows the inverse automatically. Other types: relates to / duplicates
- **GitLab**: blocks / is blocked by / relates to

### 4. Build the command
Construct the CLI command with only relevant flags.
Never include optional fields the user didn't mention.
Let the platform prompt for anything missing.

## Project-specific conventions

The enum values above (priority, size, status, layer, phase) are defaults. A repo may define its own scales or field names in its AGENTS.md, CLAUDE.md, or a `.github/` issue template. When the repo specifies a convention, follow it over the defaults:
- Exact enum values (e.g. `Urgent / High / Medium / Low` instead of `low / medium / high / urgent`)
- Exact field names on the GitHub Project (e.g. a `Status` single-select with different options)
- Whether Size / Status / Layer / Phase are tracked as Project fields or not at all
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
