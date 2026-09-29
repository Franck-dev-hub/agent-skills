---
name: ticket-pro
description: Drive a pasted work ticket (Redmine, Notion, GitLab) to a merged GitLab MR, or resume it where it stopped, without ever writing to the tracker.
disable-model-invocation: true
argument-hint: <pasted-ticket-or-id>
---

# Ticket pro

Ticket: `$ARGUMENTS`.

## Tracker: read only

Never write to the tracker, whatever it is: no status change, comment, body edit, tick, link or close.
Forbidden: `glab issue create|update|note|close|reopen`, `glab api` with `-X POST|PUT|DELETE` on issues, Notion write tools, any Redmine write request.
The MR never carries `Closes #<n>`: merging it would close the issue.

Every tracker change goes in a **To report in the ticket** block at the end of the step report: the status to set, the text to paste, the criteria to tick.
The user applies it by hand.

## Values

The plan is `<plan folder>/<ticket-id>-<slug>.md`, the slug being the branch's.
Find the plan folder before anything else, and never propose a new one while an existing one fits:

1. The folder `AGENTS.md` or `CLAUDE.md` names.
2. Else the git-ignored `plans` or `.plans` folders of the repo:
   `find . -type d \( -name node_modules -o -name vendor -o -name .git -o -name var \) -prune -o -type d \( -name plans -o -name .plans \) -print`, kept when `git check-ignore -q` passes.
   One found: use it without asking. Several: ask once which one.
3. Else propose `docs/plans/`, or `.plans/` when `git ls-files docs/plans` lists tracked files; add it to `.git/info/exclude` on the user's yes, never to the team's `.gitignore`.

The plan is the ticket's only working file: what the steps or their skills would write elsewhere goes in a section of it.

The plan header holds: ticket link, tracker, base branch, test command, `Current step`.
Take each value from `AGENTS.md`, `CLAUDE.md`, the `Makefile` or the project's config files; ask only for what is still missing, once, and write it in the header.

## Tooling

Read `~/.claude/ticket-pro.local.md` once, when it exists: it fills the slots below with skills, agents and commands.
An empty slot takes its default; a default of *none* skips the action and says so.

| Slot | Step | Default |
|---|---|---|
| Standards | 3 | none |
| Modeling | 4 | `mattpocock-skills:domain-modeling` |
| Spec | 4 | `franck-dev-skills:dev-spec` |
| Task skills | 5 | none |
| Review | 6 | none |
| Lint | 6 | none |
| E2E | 6 | none |
| Open MR | 9 | `glab mr create --fill --draft --yes -b <base>`, plus `-t '<title>'` from 2 commits |
| Delegation | 4, 6 | none: every skill runs in the session |

A skill that asks the user never goes to a sub-agent.
A delegated skill gets a self-contained brief: skill, plan path, ticket id, branch, `<base>..HEAD`, and what the step needs.
Write the report's evidence and findings in the plan, and bring its questions to the user.

## 0. Route

Take the ticket id from the argument, a pasted ticket or a bare id; with none, ask the user for one.

- A plan matches the ticket (`<plan folder>/<ticket-id>-*.md`), a branch matches it (`git branch -a --list '*/<ticket-id>-*'`), or an MR comes from that branch (`glab mr list --all --source-branch <branch>`): this is a **resume**, go to *Resume*.
- Otherwise start at step 1; a bare id there means asking the user to paste the ticket.

## Resume

Derive the state from the environment, then read the plan's `Current step` line.
When they disagree, the environment wins: fix the line.

| Signal | Command |
|---|---|
| Branch, checked out? | `git branch -a --list '*/<ticket-id>-*'`, `git branch --show-current` |
| Commits on the branch | `git log --oneline <base>..HEAD` |
| MR and its state | `glab mr view <branch>` |
| Plan | `<plan folder>/<ticket-id>-*.md` |

Give a summary of five lines at most: ticket, branch, commits, MR, plan step.
Propose the next step, then wait for the user.
A draft MR means step 9, the user's review pending.
A merged MR means step 10.
Step 5 resumes at the first unticked task of the plan.
Step 6 resumes at the first failing check or unticked recette box.

## Steps

Every step but step 3 is a **gate**: once its criterion is met, stop.
Before stopping, update the plan's `Current step` line once the plan exists, then report in five lines at most: what was done, its evidence, the next step, then the *To report in the ticket* block when there is one.
Start the next step only on the user's explicit go; a go covers one step, never the rest of the list.

### 1. Read the ticket

The ticket is the text the user pasted.
Never fetch it or a linked ticket from a tracker (`glab issue view`, Notion tools, Redmine) unless the user asks in so many words; a URL in the text is not that ask.

Done when the user confirms the ticket is ready to start: report its status and blockers as read, never assume them.

### 2. Create the branch

- Name: `<type>/<ticket-id>-<slug>`, type from the ticket's nature (`fix`, `feature`, `chore`...), slug from its title in short kebab case.
- Create the plan with its header.
- `git fetch origin`, then `git switch -c <branch> origin/<base>`.
- Tell the user the session name to set: `/rename <branch>`.

Done when the branch is checked out and the plan exists.
To report: status to in progress.

### 3. Read the context

The linked tickets the user pasted, `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`.
Run the Standards slot: it loads the standards the ticket touches; never ask which ones.

Not a gate: once the standards are loaded, list them in one line and go straight to step 4.

### 4. Grill and spec

For a bug, get the reproduction first: URL, account and data, steps, observed versus expected result.
Take what the ticket gives, ask the user for the rest, and write it in the plan's `Reproduction` section.

Invoke `mattpocock-skills:grilling` and the Modeling slot on the ticket.
The modeling skill writes no file: its glossary goes in the plan's `Glossary` section, its ADRs in `Decisions`.

Once the user confirms the shared understanding, run the Spec slot; its report is the text to paste in the ticket.
Then fill the plan: context, glossary, decisions, files touched, tasks, `Current step`.
Tasks are a `- [ ]` list in execution order, never numbered: the order is the numbering. Each one is small enough to review alone.

Done when the plan holds its tasks.
To report: the spec report.

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

### 9. Open the MR

Give the user the Open MR slot's command to copy; it pushes and opens a draft MR.

- The title follows the `franck-dev-skills:commit-message` format and sums up the whole branch: `[Type] #<ticket-id> Description`.
- When the user says the MR is open, check it with `glab mr view <branch>`.

The draft is for the user's own review.
Once they approve it, give them `glab mr update <mr> --ready`.

Done when the MR is ready for review.
To report: status to in review, the MR link, every pre-merge criterion with its step 6 evidence, the recette.

### 10. After the merge

Run every post-merge acceptance criterion, and give the user the post-merge part of the recette.
Delete the plan's tasks section, which is of no use once merged, and set `Current step` to `10, done`.

Done when every post-merge criterion is green, the user ticked the post-merge recette, and the plan holds no tasks.
To report: status to done, every post-merge criterion with its evidence.
