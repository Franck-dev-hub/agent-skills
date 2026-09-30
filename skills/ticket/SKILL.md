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

Every tracker change (status, body, tick, comment, link) is first shown as the exact change, then applied only on the user's yes.
Without write access, it goes in a **To report in the ticket** block for the user to apply.

## Values

Every ticket gets a folder, `<plan folder>/<ticket-id>-<slug>/`, the slug being the branch's, holding `plan.md`.
A visual ticket, one that changes what a page shows, adds `before/` and `after/`.
Find the plan folder before anything else, and never propose a new one while an existing one fits:

1. The folder `AGENTS.md` or `CLAUDE.md` names.
2. Else the git-ignored `plans` or `.plans` folders of the repo:
   `find . -type d \( -name node_modules -o -name vendor -o -name .git -o -name var \) -prune -o -type d \( -name plans -o -name .plans \) -print`, kept when `git check-ignore -q` passes.
   One found: use it without asking. Several: ask once which one.
3. Else propose `docs/plans/`, or `.plans/` when `git ls-files docs/plans` lists tracked files; add it to `.git/info/exclude` on the user's yes, never to the team's `.gitignore`.

The ticket folder holds the ticket's only working files: the plan, and a visual ticket's captures.
What the steps or their skills would write elsewhere goes in a section of the plan.

The plan header holds: ticket link, tracker, base branch, test command, `Current step`.
Take each value from the local profile, the **Ticket workflow** section of `AGENTS.md`, then `CLAUDE.md`, the `Makefile` or the project's config files; ask only for what is still missing, once, and write it in the header.

Write the plan in short sentences that go to the point, in the user's language.
Name a file, function or command only when it saves a search: files touched, the evidence of a criterion, the reproduction.
Keep the section names: the resume looks them up.

Project values, the same for every ticket, live in the Ticket workflow section or the local profile: tracker, base branch, test command, lint commands, and the status map.
The status map gives the tracker's own value for Ready, In progress, In review and Done, plus the ids the tracker reference needs.
One missing: ask once, then propose saving it, in the local profile when one matches, else in the Ticket workflow section.

## Tooling

The local profile fills the slots below.
An empty slot takes its default; a default of *none* skips the action and says so.

| Slot | Step | Default |
|---|---|---|
| Standards | 3 | none |
| Spec | 4 | `franck-dev-skills:create-issue` for a GitHub or GitLab issue, `franck-dev-skills:dev-spec` otherwise |
| Task skills | 5 | none |
| Review | 6 | none |
| Lint | 6 | the project's lint commands |
| E2E | 6 | none |
| Open PR | 9 | the forge reference's command |

## Delegation

A skill that never asks the user runs in a sub-agent, so its output stays out of the session:

| Agent | Runs |
|---|---|
| `franck-dev-skills:ticket-investigate` | the Spec slot when it is `dev-spec` |
| `franck-dev-skills:ticket-review` | the Review and E2E slots |
| `franck-dev-skills:ticket-check` | a Lint skill, and a Task skill that asks nothing |

The brief is self-contained: skill, plan path, ticket id, branch, `<base>..HEAD`, and what the step needs.
Write the report's evidence and findings in the plan, and bring its questions to the user.
Every other skill runs in the session: it talks to the user.
Plain commands, such as lint commands, run in the background with Bash, not in an agent.

## 0. Route

Take the ticket id from the argument: an id, a URL, or the pasted text; with none, ask the user for one.

- A plan matches the ticket (`<plan folder>/<ticket-id>-*/plan.md`, or an older flat `<plan folder>/<ticket-id>-*.md` to move into its folder), a branch matches it (`git branch -a --list '*/<ticket-id>-*'`), or a PR links to it (forge reference): this is a **resume**, go to *Resume*.
  All are needed: the repo may delete a branch once its PR is merged.
- Otherwise start at step 1.

## Resume

Derive the state from the environment, then read the plan's `Current step` line.
When they disagree, the environment wins: fix the line.

| Signal | Where |
|---|---|
| Branch, checked out? | `git branch -a --list '*/<ticket-id>-*'`, `git branch --show-current` |
| Commits on the branch | `git log --oneline <base>..HEAD` |
| PR and its state | forge reference |
| Ticket status | tracker, when readable |
| Plan | `<plan folder>/<ticket-id>-*/plan.md` |

Give a summary of five lines at most: ticket, status, branch, commits, PR.
Propose the next step, then wait for the user.
A draft PR means step 9, the user's review pending.
A merged PR means step 10.
Step 5 resumes at the first unticked task of the plan.
Step 6 resumes at the first failing check or unticked recette box.

## Steps

Every step but step 3, and step 1 for a pasted ticket, is a **gate**: once its criterion is met, stop.
Before stopping, update the plan's `Current step` line once the plan exists, then report in five lines at most: what was done, its evidence, the next step, then the tracker changes to apply.
Start the next step only on the user's explicit go; a go covers one step, never the rest of the list.

### 1. Read the ticket

From the tracker: the ticket, its status, its blockers; name the tracker used in the report, so a wrong pick shows.
Done when the status is Ready and every blocker is closed; otherwise stop and give the reason.

A pasted ticket with no readable tracker is ready: never ask; name in one line any blocker the text lists, then go straight to step 2.
An id or URL whose tracker this session cannot read: ask the user to paste the ticket.

### 2. Create the branch

- Name: `<type>/<ticket-id>-<slug>`, type from the ticket's nature or title prefix in lowercase (`[Fix]` gives `fix`), slug from its title in short kebab case.
- Create the ticket folder and its plan with the header; a visual ticket also gets `before/` and `after/`.
- Create the branch from `<base>` with the forge reference's command.
- Tell the user the session name to set: `/rename <branch>`.

Done when the branch is checked out and the plan exists.
Tracker: status to In progress.

### 3. Read the context

The linked tickets (blocking, blocked, parent, children), `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `CONTEXT.md`, `docs/adr/`.
Run the Standards slot: it loads the standards the ticket touches; never ask which ones.

Not a gate: once the standards are loaded, list them in one line and go straight to step 4.

### 4. Grill and spec

For a bug, get the reproduction first: URL, account and data, steps, observed versus expected result.
Take what the ticket gives, ask the user for the rest, and write it in the plan's `Reproduction` section.

For a visual ticket, when a real-browser tool is available (Playwright MCP or CLI, or any browser capture tool), capture the pages it touches into `before/`, before any code change:

- A bug: its reproduction, showing the fault. A feature: the page as it is today.
- One file per page and viewport, `<nn>-<page>-<viewport>.png`; desktop and mobile unless the ticket names one.
- List each capture, with its URL, account and viewport, in the plan's `Captures` section, so step 6 can replay it.

With no such tool, say so in one line and go on.

Invoke `mattpocock-skills:grilling` and `mattpocock-skills:domain-modeling` on the ticket.
Domain-modeling writes no file: its glossary goes in the plan's `Glossary` section, its ADRs in `Decisions`.

Once the user confirms the shared understanding, run the Spec slot on the ticket.
Then fill the plan: context, glossary, decisions, files touched, tasks, `Current step`.
Tasks are a `- [ ]` list in execution order, never numbered: the order is the numbering. Each one is small enough to review alone.

Done when the plan holds its tasks.
Tracker: the ticket body rewritten from the spec.

### 5. Write the code

One plan task at a time, each one a gate.
A task that matches the Task skills slot runs that skill instead of writing the code by hand.

After a task, tick it in the plan, set `Current step` to `5, task <i>/<total>`, report the files touched and what they now do, then stop.
The next task starts only on the user's go.

Done when every acceptance criterion that can be met before merge is implemented.

### 6. Recette and test

The user runs the recette while the checks run, in this order:

1. The Review slot first: it may fix code, so the recette must start after it.
2. Write the plan's `Recette` section, hand it to the user, and tell them to start.
   For a visual ticket, replay every `Captures` entry into `after/` under the same file name, and add the pairs to the recette.
3. Meanwhile, both in the background: the Lint slot, and the test command in full, so the user can report recette results while it runs.
4. Once the user is done, when a criterion is a user journey in the browser, offer the E2E slot, with the recette as its test plan and its findings in the plan's `E2E` section, not in the skill's own output folder; run it only on the user's yes.

The recette holds one block per acceptance criterion, in the ticket's order, then the non-regressions and edge cases; for a bug, the plan's `Reproduction` comes first, now expecting the fixed result:

```markdown
### <criterion, as worded in the ticket>

- Prerequisites: account, data, environment
- [ ] <action>: <expected result>
```

- Steps are what a tester without the code can do and see: URL, button, field, message; never a class or a command.
- Post-merge criteria go in a `Post-merge` subsection, run at step 10.
- Only the user ticks the boxes; a box they report failing sends the fix back to step 5.

Skip a skill that is not installed or does not fit the stack, and say so.
Keep each check's evidence in the plan: command, output line.

Done when every check is green, every pre-merge criterion has its evidence, and the user ticked every pre-merge box.

### 7. Update the docs

Read every file under `docs/` but the plan folder, and the `README.md`, and find the passages that describe what the diff changed.

Done when each of them is updated, or the summary states "no doc impact".

### 8. Commit

Inside this step, each commit also waits for the user's explicit approval of both its code and its message.

Run `franck-dev-skills:commit-message`.
Its commit series writes every commit and its why into the plan first, then commits one at a time on approval.

Done when the working tree holds nothing the series planned, and the plan lists every commit with its why.

### 9. Open the PR

Give the user the Open PR slot's command to copy; it pushes and opens a draft PR.

- The title follows the `franck-dev-skills:commit-message` format and sums up the whole branch: `[Type] #<ticket-id> Description`.
- When the user says the PR is open, check it with the forge reference's command.

The draft is for the user's own review.
Once they approve it, give them the forge reference's ready command.

Done when the PR is ready for review.
Tracker: status to In review, the PR link, every pre-merge criterion ticked with its step 6 evidence, the recette, the `before/` and `after/` pairs, uploaded when the tracker reference gives a way, else in the *To report* block.

### 10. After the merge

Run every post-merge acceptance criterion, and give the user the post-merge part of the recette.
Delete the plan's tasks section, which is of no use once merged, and set `Current step` to `10, done`.

Done when every post-merge criterion is green, the user ticked the post-merge recette, and the plan holds no tasks.
Tracker: every post-merge criterion ticked with its evidence, status to Done.
