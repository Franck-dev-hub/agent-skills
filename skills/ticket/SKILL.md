---
name: ticket
description: Drive a ticket (GitHub or GitLab issue, Notion, Redmine, or pasted text) from branch to merged PR or MR, or resume it where it stopped.
disable-model-invocation: true
argument-hint: <ticket-id-url-or-pasted-text>
---

# Ticket

Ticket: `$ARGUMENTS`.

First read `~/.claude/ticket.local.md`, when it exists: its first profile whose remote pattern matches `origin` gives project values and slots (format: `references/local-profile.md`).

## Forge and tracker

The forge is the `origin` remote's host: read `references/github.md` or `references/gitlab.md`, and only that one.
It gives the commands for branches, the PR (an MR on GitLab), and resume signals.

The tracker holds the ticket: a GitHub or GitLab issue (the forge reference), Notion or Redmine (`references/trackers.md`), or the text the user pasted.
Pick it in this order: a tracker URL in the argument; else the `Tracker` value of the local profile, then of the Ticket workflow section; else the forge's issues.
Read a tracker only through a tool this session has: `gh`, `glab`, the Notion or Redmine MCP.

Every tracker change (status, tick, body) is first shown as the exact change, then applied only on the user's yes; the one exception is the move to In progress at step 2, applied at once: running the skill is the user's go.
Without write access, it goes in a **To report in the ticket** block for the user to apply.

## Values

Every ticket gets a folder, `<plan folder>/<buckets>/<ticket-id>-<slug>/`, the slug being the branch's, holding `plan.md`.
A visual ticket, one that changes what a page shows, adds `before/` and `after/`.

The buckets come from the id alone, so a folder never moves: one `<start>-<end>` folder per power of ten, from the id's own magnitude down to 100; an id under 100 goes in `0-99`; an id that is not a number goes in `other`.

| Id | Folder |
|---|---|
| 42 | `0-99/42-<slug>/` |
| 675 | `600-699/675-<slug>/` |
| 1234 | `1000-1999/1200-1299/1234-<slug>/` |
| none, local 7 | `local/0-99/local-7-<slug>/` |

Two trackers number their tickets alike: `667` can name two tickets.
A repo with more than one tracker keeps one folder per tracker, `<plan folder>/<tracker>/<buckets>/<ticket-id>-<slug>/`, the tracker's name in lowercase (`notion`, `redmine`).
A ticket whose tracker differs from the one of the plans already there opens its own tracker folder; offer to move the existing plans into theirs, and never move one without the user's yes.

A ticket with no id gets a local one, `local-<n>`: `<n>` is the highest under `<plan folder>/local/` plus one, from 1, and gives the buckets.
Its tracker is `local`, its folder always under `<plan folder>/local/`, whatever the other trackers: a tracker's `#7` and `local-7` never share a branch nor a folder.
A local id never goes in a commit or the PR title: a `#7` would link to an unrelated issue.

Find the plan folder before anything else, and never propose a new one while an existing one fits:

1. The folder `AGENTS.md` or `CLAUDE.md` names.
2. Else the git-ignored `plans` or `.plans` folders of the repo:
   `find . -type d \( -name node_modules -o -name vendor -o -name .git -o -name var \) -prune -o -type d \( -name plans -o -name .plans \) -print`, kept when `git check-ignore -q` passes.
   One found: use it without asking. Several: ask once which one.
3. Else propose `docs/plans/`, or `.plans/` when `git ls-files docs/plans` lists tracked files; add it to `.git/info/exclude` on the user's yes, never to the team's `.gitignore`.

The ticket folder holds the ticket's only working files: the plan, a visual ticket's captures, and the `metrics/` folder.
What the steps or their skills would write elsewhere goes in a section of the plan.
The metrics hook writes `metrics/summary.md` and `metrics/state.json`, time and tokens per step: never edit them, never commit them.

The plan header is a table under the title; `-` marks a value still unknown, such as the PR before step 9; the `PR` key is `MR` on GitLab:

```markdown
| Key          | Value                       |
|--------------|-----------------------------|
| Ticket       | <ticket URL>                |
| Tracker      | <tracker>                   |
| Base branch  | `<base>`                    |
| Branch       | `<type>/<ticket-id>-<slug>` |
| PR           | <PR URL>                    |
| Test command | `<test command>`            |
| App URL      | <app URL>                   |
| Current step | <n>, <progress>             |
```

The roadmap hook reads the `Current step` row: keep its key in English and its value starting with the step number.
Take each value from the local profile, the **Ticket workflow** section of `AGENTS.md`, then `CLAUDE.md`, the `Makefile` or the project's config files; ask only for what is still missing, once, and write it in the header.
Another ticket's plan is no source: its value is at most proposed, and used once the user confirms.
The app URL found in config (`.env`, compose, `/etc/hosts`) is often a default such as `http://localhost`: propose it, never use it unconfirmed.

Write the plan in short sentences that go to the point, in the user's language.
In French, put a space before and after every colon ( : ) and semi-colon ( ; ).
Align every table: pad each cell to the widest of its column, and the divider dashes to the column width plus two.
Name a file, function or command only when it saves a search: files touched, the evidence of a criterion, the reproduction.
Keep the section names: the resume looks them up.
Write every page as a full, bare URL on the app URL, followed by a space (`https://example.localhost/products`): a click in the IDE opens it.

Project values, the same for every ticket, live in the Ticket workflow section or the local profile: tracker, base branch, test command, lint commands, app URL, and the status map.
The status map gives the tracker's own value for Ready, In progress, In review and Done, plus the ids the tracker reference needs.
One missing: ask once, then propose saving it, in the local profile when one matches, else in the Ticket workflow section.

## Tooling

The local profile fills the slots below.
An empty slot takes its default; a default of *none* skips the action and says so.
Review and Lint take several skills, run in the listed order (`a`, then `b`); every other slot takes one.

| Slot | Step | Default |
|---|---|---|
| Standards | 3 | none |
| Grill | 4 | `franck-dev-skills:grilling` |
| Domain | 4 | `franck-dev-skills:domain-modeling` |
| Spec | 4 | `franck-dev-skills:dev-spec` |
| Task skills | 5 | none |
| Method | 5 | none |
| Review | 6 | none |
| Lint | 6 | the project's lint commands |
| E2E | 6 | none |

With no profile matching `origin`, before step 1, propose each slot once, in as few questions as possible: the installed skills that fit it, the `franck-dev-skills:` ones first and marked recommended. Review and Lint are a multi-select; with two or more picked, propose an order, the skills that fix code first, and let the user confirm or retype it. Save the answers as a new profile on the user's yes.
A slot skill from another plugin keeps to its step: what it would write elsewhere (a design doc, a plan) goes in the plan section its slot fills, and it never chains to another skill; the ticket goes on with its own steps.

## Delegation

A skill that never asks the user runs in a sub-agent, so its output stays out of the session:

| Agent | Runs |
|---|---|
| `franck-dev-skills:ticket-investigate` | the Spec slot when it is `dev-spec` |
| `franck-dev-skills:ticket-review` | each Review skill in its own agent, the E2E slot, the conformance check, and the comment pass |
| `franck-dev-skills:ticket-implement` | each hand-written task of step 5, one agent per task |
| `franck-dev-skills:ticket-check` | a Lint skill, on its Haiku default; a Task skill that asks nothing, with the `sonnet` model override |

The brief is self-contained: skill, plan path, ticket id, branch, the diff, and what the step needs.
The diff is `git diff --merge-base <base>` plus `git ls-files --others --exclude-standard`: nothing is committed before step 8, so `<base>..HEAD` would be empty.
Write the report's evidence and findings in the plan, and bring its questions to the user.
Every other skill runs in the session: it talks to the user.
Plain commands, such as lint commands, run in the background with Bash, not in an agent.
Reads that do not depend on each other (tracker, blockers, context files, resume signals) go out in one batch of parallel tool calls.

While the session waits on the user, agents prepare the next work in the background:

| When | Agent | Prepares |
|---|---|---|
| Step 4, during the grilling | `franck-dev-skills:debug-investigate` | a bug's root cause, from the `Reproduction` section |
| Step 4, during the grilling | `Explore` | the files and flows the ticket touches, for `Files touched`, each fact with its `path:line` so the Spec slot does not re-read it |
| Step 4, during the grilling | `franck-dev-skills:ticket-review` | a visual ticket's `before/` captures |
| Step 6, after the review | `franck-dev-skills:ticket-review` | the skill's recette and the `after/` captures, while lint and tests run |
| Step 6, during the final recette | `Explore` | the passages of `docs/` and `README.md` the diff changes, for step 7 |
| Step 9, after the PR is open | `franck-dev-skills:ci-investigate` | the cause of a failed pipeline |

- A background agent only prepares: it never advances a step, and its report waits for the step that uses it.
- Read only, except the captures, written in `before/` and `after/`.
- One agent at a time drives the browser: they share it, and the dev database.

## 0. Route

Take the ticket id from the argument: an id, a URL, or the pasted text; with none, ask the user for one.

- A plan of this ticket's tracker matches the ticket at its bucket path, or elsewhere in the plan folder (`find <plan folder> -name '<ticket-id>-*' | grep -vE '/[0-9]+-[0-9]+$'`, buckets excluded, the `Tracker` row of its header checked) to move to its bucket path, a branch matches it (`git branch -a --list '*/<ticket-id>-*'`), or a PR links to it (forge reference): this is a **resume**, go to *Resume*.
  All are needed: the repo may delete a branch once its PR is merged.
- A bare id matching plans of several trackers: take the plan whose `Branch` row is the current branch; with none or several, ask once which plan.
- Otherwise start at step 1.

## Resume

Derive the state from the environment, then read the plan's `Current step` row.
When they disagree, the environment wins: fix the row.

| Signal | Where |
|---|---|
| Branch, checked out? | `git branch -a --list '*/<ticket-id>-*'`, `git branch --show-current` |
| Commits on the branch | `git log --oneline <base>..HEAD` |
| PR and its state | forge reference |
| Ticket status | tracker, when readable |
| Plan | `<plan folder>/[<tracker>/]<buckets>/<ticket-id>-*/plan.md` |

Set `Current step` to `<next step>, resuming` first, so the cost of the resume lands on the step it prepares.
Give a summary of five lines at most: ticket, status, branch, commits, PR.
Propose the next step, then wait for the user.
An open PR means step 9; with unresolved review threads, its review comments.
A merged PR means step 10.
Step 5 resumes at the first unticked task of the plan.
Step 6 resumes at the first failing check, then the comment pass when `Evidence` lacks it, then the skill's recette, then the first box the user has not ticked.

## Steps

Every step but step 3, and step 1 for a pasted ticket, is a **gate**: once its criterion is met, stop.
Keep the plan's `Current step` row true at all times, once the plan exists: `<n>` when a step starts, `<n>, <progress>` while it runs (`5, task 2/4`, `8, commit 1/3`), `<n>, done` at its gate, once its tracker changes are applied; while one waits for the user's yes, `<n>, tracker pending`.
Before stopping, report in five lines at most, commands and status lines excluded: what was done, its evidence, then the tracker changes to apply.
Start the next step only on the user's explicit go; a go covers one step, never the rest of the list.

Keep the context small: each token in it is read again at every call.

- At the gate of step 4, 5 or 6, once the step is done and nothing waits on the user, give one command to run right away, with the real ticket URL, branch, plan path and `Current step`: `/compact Keep ticket <ticket URL>, branch <branch>, plan <plan path>, Current step <n>; the plan holds the rest.` The summary replaces the conversation: the next step starts light, in the same session. Never give it while the user still has work in the step, such as the final recette of step 6.
- Advise it too after a pause of an hour or more: the cache has expired, the whole context would be paid again.
- Never switch the model inside a step: the cache belongs to one model. Switch right after a gate's `/compact`, when the context is small.

End every message of the skill with two status lines, in the user's language, the step names being the headings below:

```
Step <n>: done, <what it produced, one sentence>
Step <n+1>: <name>
```

or, while the step waits on the user:

```
Step <n>: in progress, <what the user must do>
Step <n+1>: <name>, once step <n> is done
```

### 1. Read the ticket

From the tracker: the ticket, its status, its blockers; name the tracker used in the report, so a wrong pick shows.
Done when the status is Ready and every blocker is closed; otherwise stop and give the reason.

A pasted ticket with no readable tracker is ready: never ask; name in one line any blocker the text lists, then go straight to step 2.
An id or URL whose tracker this session cannot read: ask the user to paste the ticket.

### 2. Create the branch

- Name: `<type>/<ticket-id>-<slug>`, type from the ticket's nature or title prefix in lowercase (`[Fix]` gives `fix`), slug from its title in short kebab case.
- Create the ticket folder at its bucket path and its plan with the header; a visual ticket also gets `before/` and `after/`.
- Create the branch from `<base>` with the forge reference's command.
- Tell the user the session name to set: `/rename <branch>`.

Done when the branch is checked out and the plan exists.
Tracker: status to In progress, applied without asking.

### 3. Read the context

The linked tickets (blocking, blocked, parent, children), `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `CONTEXT.md`, `docs/adr/`.
Run the Standards slot: it loads the standards the ticket touches; never ask which ones.

Not a gate: once the standards are loaded, list them in one line and go straight to step 4.

### 4. Grill and spec

For a bug, get the reproduction first: URL, account and data, steps, observed versus expected result.
Reproduce on the local app (`App URL`) without asking which environment; ask for it only when the ticket names one, such as a bug on preprod that develop does not show, or when the bug does not reproduce locally.
The reproduction stops at the observed fault: its cause goes to `debug-investigate` (*Delegation*), never to this session.
Take what the ticket gives, ask the user for the rest, and write it in the plan's `Reproduction` section.

For a visual ticket, when a real-browser tool is available (Playwright MCP or CLI, or any browser capture tool), capture the pages it touches into `before/`, before any code change, through the background agent:

- A bug: its reproduction, showing the fault. A feature: the page as it is today.
- One file per page and viewport, `<nn>-<page>-<viewport>.png`; desktop and mobile unless the ticket names one.
- List each capture, with its URL, account and viewport, in the plan's `Captures` section, so step 6 can replay it.

With no such tool, say so in one line and go on.

Start the step 4 background agents (*Delegation*), then run the Grill slot, then the Domain slot, on the ticket.
Give the Domain slot the plan path: it writes no file in the repo, its glossary goes in the plan's `Glossary` section, its ADRs in `Decisions`.

Wait for the background reports before asking the user to confirm the shared understanding: a report that contradicts a decision reopens it in the Grill slot.
Once the user confirms, merge the reports into the plan, then run the Spec slot on the ticket; its report goes in the plan's `Spec` section.
Whatever skill fills the slot, the `Spec` lists the edge cases, or `none` with the reason.
Then fill the plan: context, glossary, decisions, spec, files touched, tasks, `Current step`.
Tasks are a `- [ ]` list in execution order, never numbered: the order is the numbering. Each one is small enough to review alone.
A Method skill that asks the user, such as the seams to test, asks now: each answer goes in its task, so step 5 never stops on it.

Done when the plan holds its tasks.
Tracker: nothing; the ticket leaves as it came in, only ticked and moved.
Rewrite its body only when it breaks the tracker's standard outright (`create-issue`'s format for a GitHub or GitLab issue, the ticket format `dev-spec` reads for Notion); small gaps stay.

### 5. Write the code

Run every plan task in order, one at a time, without stopping between them: tasks share the working tree and the dev database.
A task that matches the Task skills slot runs that skill instead of writing the code by hand.
Every other task runs in a fresh `ticket-implement` agent, which follows the Method slot.
Its brief: the task and its answers, the `Spec` edge cases it covers, the plan's `Decisions` and `Glossary` in place of the glossary and ADR files the skill would read, `Files touched`, the test command, and the comment rule, as for the comment pass of step 6.
Check each report against its task, on the diff of its `Files changed` only: nothing is committed before step 8, so the branch diff holds every earlier task. A gap goes back to the same agent, with what is missing.
After each task, tick it in the plan and set `Current step` to `5, task <i>/<total>`.
Each edge case of the `Spec` gets its test.

Stop before the end only when the user must decide: a task contradicts a plan decision, a test fails for a reason the plan did not foresee, or a skill or an agent asks a question.

Done when every acceptance criterion that can be met before merge is implemented.
Report the files touched and what they now do, in short sentences.

### 6. Recette and test

The skill runs and fixes everything first, so the user runs a single final recette:

1. The Review slot, one skill after the other in its order: each may fix code, so each runs alone, on the diff the previous one left.
   A finding it reports without fixing is a lead, not an order: check it against the code, the `Spec` and the `Decisions`, then make it a task, run as in step 5, or drop it with the reason in `Evidence`.
2. Conformance: `ticket-review` compares the diff with each acceptance criterion and the plan's `Spec` and `Decisions`; the brief carries the criteria's text. It reports each criterion as met, partly or not met, with the file and line, then lists the code the ticket did not ask for. A criterion not met or partly met becomes a new task in the plan, run as in step 5, then this check reruns.
3. Comment pass, in the background: a fresh context, since the comment rule fades over a long step 5. `ticket-review` reads every comment the branch adds or changes, in every file type; it cuts those that restate the code, shortens the rest to a one-line why, and keeps a why in one file only.
   The brief carries the comment rule of the project's `AGENTS.md` or `CLAUDE.md`, else the user's `CLAUDE.md`.
   It never touches a comment the branch did not write, nor one that carries function: linter or analyzer directive, docblock type, annotation, license, shebang.
   Its changes go in `Evidence`, one line per file.
4. Meanwhile, write the plan's `Recette` section.
5. Once both are done, in parallel: the Lint slot, in its order, and the full test command in the background, and `ticket-review` running the recette box by box, with the E2E slot or a real-browser tool, and replaying every `Captures` entry into `after/` under the same file name.
6. A failing check or box: fix it, as a new task in the plan, then rerun what it touches, the comment pass included.
7. Once everything passes, hand the recette to the user for the final run, with the `before/` and `after/` pairs; meanwhile, the docs scan for step 7 runs in the background.

The recette holds one block per acceptance criterion, in the ticket's order, then the non-regressions and the `Spec`'s edge cases; for a bug, the plan's `Reproduction` comes first, now expecting the fixed result:

```markdown
### <criterion, as worded in the ticket>

- Prerequisites: account, data, environment
- [ ] <action>: <expected result>
```

- Steps are what a tester without the code can do and see: URL, button, field, message; never a class or a command.
- Post-merge criteria go in a `Post-merge` subsection, run at step 10.
- The skill's own run goes in the plan's `Evidence`, one line per box; a box it cannot check (no browser tool, a real email, a third-party service) is marked for the user.
- Only the user ticks the boxes; a box they report failing gets fixed, then the skill reruns its recette before handing it back.

Skip a skill that is not installed or does not fit the stack, and say so.
Keep each check's evidence in the plan: command, output line.

Done when every criterion is met, the comment pass is done, every check is green, the skill's recette passes, and the user ticked every pre-merge box.

### 7. Update the docs

Start from the passages the step 6 docs scan found, checked against the final diff; without that scan, read every file under `docs/` but the plan folder, and the `README.md`.

Done when each of them is updated, or the summary states "no doc impact".

### 8. Commit

Inside this step, each commit also waits for the user's explicit approval of both its code and its message.

Run `franck-dev-skills:commit-message`; for a local id, tell it the branch carries no ticket id.
Its commit series writes every commit and its why into the plan first, then commits one at a time on approval.

Done when the working tree holds nothing the series planned, and the plan lists every commit with its why.

### 9. Open the PR

When `<base>` moved and conflicts with the branch, show the user the conflicts, merge `<base>` into the branch (a rebase only on the user's yes), resolve each hunk keeping both intents, never abort, then rerun the test command; the merge commit waits for the user's yes like any commit.

Give the user the PR title to copy, never a command: they push and open the PR their own way.

- The title follows the `franck-dev-skills:commit-message` format and sums up the whole branch: `[Type] #<ticket-id> Description`, without `#<ticket-id>` for a local id; with a single commit, it is that commit's message.
- When the user says the PR is open, check it with the forge reference's command.

Then follow the pipeline (forge reference); a failure goes to `ci-investigate`.

Done when the PR is open.
Tracker: status to In review, every pre-merge criterion ticked.
Plan: the `PR` or `MR` row, the recette as the user ticked it, each criterion's evidence and the `before/` and `after/` pairs; never post them in the tracker.

When the user says the PR has review comments, read its unresolved threads with the forge reference's command.
A comment is a lead, not an order: check each against the code, the `Spec` and the `Decisions`, then propose a verdict with its evidence.

| Verdict | Then, on the user's ruling |
|---|---|
| Agree | a new task in the plan, run as in step 5, then what it touches in step 6, then a commit as in step 8 |
| Disagree | a reply drafted with the reason, for the user to post |
| Unclear | a question to the user, or to the reviewer through a drafted reply |

Nothing changes before the user rules on every comment; the skill never posts a reply.
Write each comment, its verdict and the ruling in the plan's `Review` section; set `Current step` to `9, review <i>/<total>`.

### 10. After the merge

Switch to `<base>` and pull it; offer to delete the local branch, never without the user's yes.
Run every post-merge acceptance criterion, and give the user the post-merge part of the recette.
Delete the plan's tasks section, which is of no use once merged, and set `Current step` to `10, done`.

Done when every post-merge criterion is green, the user ticked the post-merge recette, and the plan holds no tasks.
Tracker: every post-merge criterion ticked, status to Done.
Plan: the post-merge evidence.
