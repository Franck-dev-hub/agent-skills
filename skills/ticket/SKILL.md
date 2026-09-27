---
name: ticket
description: Drive a GitHub issue from branch to merged PR, or resume it where it stopped.
disable-model-invocation: true
argument-hint: <issue-number>
---

# Ticket

Issue: `$ARGUMENTS`.

The project's `AGENTS.md` holds a **Ticket workflow** section: board, Status field and option ids, base branch, test command, plan folder.
Every id or command below comes from it.
If the section is missing, ask for the values once and propose adding the section.

A status change is `gh project item-edit --id <item> --project-id <board> --field-id <status> --single-select-option-id <option>`.

## 0. Route

- The `origin` remote is on GitLab: stop, and tell the user to run the emagma skills (`/emagma-agents-knowledge:assist`).
- A branch is linked to the issue (`gh issue develop <n> --list`), or a PR references it (`gh issue view <n> --json closedByPullRequestsReferences`): this is a **resume**, go to *Resume*.
  Both are needed: the repo may delete a branch once its PR is merged.
- Otherwise start at step 1.

## Resume

Derive the state from the environment, then read the plan's `Current step` line.
When they disagree, the environment wins: fix the line.

| Signal | Command |
|---|---|
| Linked branch, checked out? | `gh issue develop <n> --list`, `git branch --show-current` |
| Commits on the branch | `git log --oneline <base>..HEAD` |
| PR and its state | `gh issue view <n> --json closedByPullRequestsReferences`, then `gh pr view <pr>` |
| Issue status | `gh project item-list` filtered on the issue |
| Plan | the plan file named after the ticket |

Give a summary of five lines at most: ticket, status, branch, commits, PR.
Propose the next step, then wait for the user.
A merged PR means step 10.

## Steps

Each step ends on its criterion.
After each step, update the plan's `Current step` line once the plan exists.

### 1. Read the issue

`gh issue view <n>`, its Project status, its `blocked by` relationships.

Done when the status is Ready and every blocking issue is closed.
Otherwise stop and give the reason.

### 2. Create the branch

- Name: `<type>/<n>-<slug>`, type from the title prefix in lowercase (`[Fix]` gives `fix`), slug from the title in short kebab case.
- `gh issue develop <n> --name <branch> --base <base> --checkout`, so the branch and its PR link to the issue.
- Status Ready to In progress.
- Tell the user the session name to set: `/rename <branch>`.

Done when the branch is checked out and the status reads In progress.

### 3. Read the context

The linked issues (blocking, blocked, parent, sub-issues), the plan if one exists, `CONTRIBUTING.md`, `CONTEXT.md`, `docs/adr/`.

### 4. Grill

Invoke `mattpocock-skills:grilling` and `mattpocock-skills:domain-modeling` on the issue.

Done when the user confirms the shared understanding.
Then rewrite the issue body with `franck-dev-skills:create-issue`, and create or update the plan: context, decisions, files touched, `Current step`.

### 5. Write the code

Done when every acceptance criterion that can be met before merge is implemented.

### 6. Test

Run the test command in full, plus the extra checks the section lists for the files the diff touches.
Check each acceptance criterion and keep the evidence: command, output line.

Done when every check is green and every pre-merge criterion has its evidence.
List the post-merge criteria as pending.

### 7. Update the docs

Read every file under `docs/` and the `README.md`, and find the passages that describe what the diff changed.

Done when each of them is updated, or the summary states "no doc impact".

### 8. Commit

This step is a **gate**: each commit waits for the user's explicit approval of both its code and its message.

Run `franck-dev-skills:commit-message`.
Its commit series writes every commit and its why into the plan first, then commits one at a time on approval.

Done when the working tree holds nothing the series planned, and the plan lists every commit with its why.

### 9. Open the PR

- Push once the user approves it, then open the PR against the base branch with the repo's PR template.
- Add `Closes #<n>` only when the branch is not linked to the issue.
- Status In progress to In review.

Done when the PR is open and the status reads In review.

### 10. After the merge

Run every post-merge acceptance criterion, then check the issue is closed and its status reads Done.

Done when every criterion is ticked in the issue body.
