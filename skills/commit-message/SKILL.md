---
name: commit-message
description: Use when writing or suggesting a git commit message, before running git commit, or when a diff must be split into a series of commits. Applies the [Type] message format with optional ticket ID.
---

# Suggest Commit Message

## Format

```
[Type] Short, clear message
```

With a tracked ticket:

```
[Type] #TICKET-ID Description
```

```git
[Feature] Add token validation on page load
[Fix] #8720 Fix guest checkout address validation error
```

## Types

| Type | Usage |
|---|---|
| **Feature** | New functionality |
| **Fix** | Bug fix |
| **Hotfix** | Bug fix directly on a production branch |
| **Refactor** | Code restructuring, no functional change |
| **Doc** | Documentation only |
| **Test** | Adding or updating tests |
| **Style** | Formatting, no logic change |
| **Release** | Release branch commit (e.g. reverting WIP before a release) |

## Ticket ID

When work is tracked in an external system, the ticket ID must appear in both the branch name (`feature/9231-cancel-button`) and every commit message on that branch:

```git
[Feature] #9234 Add cancel button to order summary
```

The ticket ID ties history to its originating task without opening the tracker. Only skip it for untracked work (internal chores, exploratory spikes).

## Message rules

- Start with a verb.
- Keep it short, max ~70 characters.
- Describe *what* changed, not *how*.
- Pick the type from the table above — don't invent new ones.

## Workflow

1. Run `git diff --staged` (or `git diff` if nothing staged) — this diff is the required basis for the message. Never guess the message from the user's description of the change alone.
2. Check whether the diff holds more than one concern. If it does, run a *Commit series* (below) instead of steps 3-6.
3. Pick the Type that matches the change's nature, as shown in the diff.
4. Check if the branch name carries a ticket ID (`feature/1234-...`); if so, include `#1234`.
5. Compose one line following the rules above and present it to the user as a suggestion.
6. Only run `git commit` if the user confirms that exact suggestion. If they ask for changes, revise and present again — do not commit until they explicitly approve.

## Commit series

Split when the diff mixes unrelated concerns: two distinct features, a fix plus a refactor, functional change plus reformatting. A single coherent change stays one commit, however many files it spans.

Order the commits so each one leaves the codebase working: dependencies first, callers after.

### 1. Write the series down

Append it to the plan the work came from. With no plan, propose a git-ignored folder of the project (check with `git check-ignore`), or a new `.gitignore` entry for a plans folder; that `.gitignore` edit joins the series' first commit. Structure:

1. A summary table: `#`, message, why (one per commit).
2. One section per commit, headed `### N/M: <message>`, holding:
   - `#### Code`: one `-` item per production file: its full path in code, ending with `\`, then its why on the next line.
   - `#### Tests`: the same for test files, with what each one checks.
   - A `⚠️` line per *commit check* that fails (below), if any.

```markdown
#### Code

- `src/Resolver/UniqueSlugResolver.php`\
  Skips the row itself and slugs already reserved in the batch, so no duplicate and no false `-1`.
```

Whys are the reviewer's conformity checklist: plain language, what the change does for the product or the reader, one line (three at most).

Show the summary table once in the chat, then start the loop. Done when every file of the diff sits in exactly one commit; name any file left out and why.

### 2. One commit per approval

For commit N, present its Code and Tests sections, the exact message, a one-line why and any `⚠️` line, then wait. On the user's approval of that commit: stage exactly its files, commit, report the hash, present commit N+1. On a requested change: revise, re-present, wait again. Done when the working tree holds nothing the series planned.

### Commit checks

Checks at commit scope only; code quality and spec conformity belong to code review.

- **Off-topic file**: a file the message does not cover, or that belongs to another commit.
- **Not green alone**: the commit only compiles or passes its tests with a later commit.
- **Leftover**: debug call, temporary, generated or local-only file.
- **Message drift**: the message promises more, or other, than the diff.

### Staging rules

- Start from an empty index: `git restore --staged .` if something is already staged.
- List file paths explicitly, never globs or `git add .`.
- To split a file *within itself*, pipe the `git add -p` answers: `printf 's\ny\nn\n' | git add -p <file>` (`s` split, `y` stage, `n` skip, one answer per hunk in order). Read `git diff <file>` first: `s` only splits where unchanged lines separate the changes; `git add <file>` stages the whole file.
- An untracked file is one hunk that `add -p` cannot split. Stage a trimmed copy without touching the working tree: `git update-index --add --cacheinfo 100644,"$(sed '<from>,<to>d' <file> | git hash-object -w --stdin)",<file>`; a later commit's `git add <file>` brings the rest.
- Before the first commit, replay the whole series on a throwaway index (`cp .git/index /tmp/x.index; GIT_INDEX_FILE=/tmp/x.index …`) and check each `git diff --cached --stat`.
