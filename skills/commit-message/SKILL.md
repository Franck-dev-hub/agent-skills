---
name: commit-message
description: Use when writing or suggesting a git commit message, before running git commit — applies the project's [Type] message format with optional ticket ID.
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
2. Check whether the diff holds more than one concern. If it does, follow *Splitting into multiple commits* below and stop there.
3. Pick the Type that matches the change's nature, as shown in the diff.
4. Check if the branch name carries a ticket ID (`feature/1234-...`); if so, include `#1234`.
5. Compose one line following the rules above and present it to the user as a suggestion.
6. Only run `git commit` if the user confirms that exact suggestion. If they ask for changes, revise and present again — do not commit until they explicitly approve.

## Splitting into multiple commits

Split when the diff mixes unrelated concerns: two distinct features, a fix plus a refactor, functional change plus reformatting. Do **not** split a single coherent change just because it spans many files.

When a split is needed, present the plan and stop. Never stage or commit without confirmation.

Order the commits so each one leaves the codebase working (dependencies first, callers after).

### Output format

````
### 1/3 — [Refactor] Extract address validator

```sh
git restore --staged .
git add src/Validator/AddressValidator.php src/Validator/ValidatorInterface.php
git commit -m "[Refactor] Extract address validator"
```

### 2/3 — [Fix] #8720 Fix guest checkout address validation

```sh
git add src/Checkout/GuestCheckout.php tests/Checkout/GuestCheckoutTest.php
git commit -m "[Fix] #8720 Fix guest checkout address validation"
```

### 3/3 — [Doc] Document the validation flow

```sh
git add docs/checkout.md
git commit -m "[Doc] Document the validation flow"
```
````

Rules for the plan:

- `git restore --staged .` appears once, in the first block, only if something is already staged.
- One block per commit, each self-contained and copy-pasteable as a whole.
- List file paths explicitly, never globs or `git add .`.
- Every file in the diff lands in exactly one commit. If one is left out, say why.
- If a file must be split *within itself* (same file, two concerns), pipe the `git add -p` answers so the block stays copy-pasteable: `printf 's\ny\nn\n' | git add -p <file>` (`s` split, `y` stage, `n` skip, one answer per hunk in order). Read `git diff <file>` first: `s` only splits where unchanged lines separate the changes. Never pretend `git add <file>` isolates it.
- An untracked file is one hunk that `add -p` cannot split. Stage a trimmed copy without touching the working tree: `git update-index --add --cacheinfo 100644,"$(sed '<from>,<to>d' <file> | git hash-object -w --stdin)",<file>`; a later block's `git add <file>` brings the rest.
- No shell variable shared across lines: write full paths on every line, since the user may paste one line at a time.
- Before handing off a split plan, replay it on a throwaway index (`cp .git/index /tmp/x.index; GIT_INDEX_FILE=/tmp/x.index …`) and check each `git diff --cached --stat`.

Add a one-line rationale under the plan only when the grouping is not obvious from the messages.
