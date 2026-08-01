---
name: create-issue
description: Create structured issue tickets for project management platforms (GitHub, GitLab.)
---

## Process

### 1. Gather context proactively
Do not ask the user for every field.
Infer everything you can from their request, the project's AGENTS.md, CLAUDE.md, and the repo itself:
- **Platform**: detect from `.github/` (GitHub), `.gitlab/` (GitLab), or ask once if unclear
- **Issue type**: infer from the language used (bug, feature, chore, question)
- **Priority**: infer from severity cues, map to low / medium / high / urgent. Check existing labels first (`gh label list` / `glab label list`) and reuse whatever priority labels already exist in the repo. GitHub and GitLab have no built-in priority labels, if none exist, create/use the convention `priority: <level>` (namespaced, not a bare `<level>` label), or match the repo's existing naming pattern if it differs
- **Type label**: map the title prefix to a default label if the platform has one: `Fix`→`bug`, `Feature`→`enhancement`, `Doc`→`documentation`. `Chore`/`Style`/`Refactor`/`Test`/`Release` get no type label unless the repo defines a custom one, don't force a mismatched default
- **Assignee**: leave unassigned unless the user specifies someone
- **Labels/milestones/project**: check what exists in the repo (`gh label list`, milestone list). If the repo has a GitHub Project with a `Priority` single-select field, set it to match the priority label (`gh project item-edit`), labels and Project fields don't auto-sync
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
