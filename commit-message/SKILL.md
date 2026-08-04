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
2. Pick the Type that matches the change's nature, as shown in the diff.
3. Check if the branch name carries a ticket ID (`feature/1234-...`); if so, include `#1234`.
4. Compose one line following the rules above and present it to the user as a suggestion.
5. Only run `git commit` if the user confirms that exact suggestion. If they ask for changes, revise and present again — do not commit until they explicitly approve.
