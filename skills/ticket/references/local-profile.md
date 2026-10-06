# Local profile

`~/.claude/ticket.local.md` is private and never versioned. Each `# Profile:` section applies to the repos whose `origin` URL contains one of its `Remote:` patterns; the first match wins.
A section left out keeps the skill's default.
Review and Lint list several skills or commands, run in that order.
A `per repo` line, keyed by the repo path in `origin`, overrides the profile-wide value for that repo.

```markdown
# Profile: work

Remote: `gitlab.com:acme/`, `gitlab.com/acme/`.

## Values

Tracker: notion.
Status map: Ready = `À faire`, In progress = `En cours`, In review = `En recette`, Done = `Terminé`.
Tracker per repo: `acme/shop` = redmine, `acme/blog` = gitlab.
Status map per repo: `acme/shop` = Ready `1`, In progress `2`, In review `3`, Done `5`.
Also read `.project.ini` for the base branch and the test command.

## Standards

Run `<plugin>:load-standards`, and load the standards the ticket touches.

## Task skills

| Task | Skill |
|---|---|
| New domain module | `<plugin>:scaffold-module` |

## Method

`<plugin>:tdd`

## Grill, Domain

| Slot | Skill |
|---|---|
| Grill | `superpowers:brainstorming` |
| Domain | none |

## Review, Lint, E2E

| Slot | Skill or commands |
|---|---|
| Review | `<plugin>:code-review`, then `<other>:code-review` |
| Lint | `make lint` |
| E2E | `<plugin>:e2e-test` |
```
