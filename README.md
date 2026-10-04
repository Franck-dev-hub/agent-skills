# franck-dev-skills

Private agent marketplace hosting personal skills.

| Object      | Name                  |
|-------------|-----------------------|
| Marketplace | `franck-dev-skills`   |
| Plugin      | `franck-dev-skills`   |

## Skills

| Skill             | Purpose                                                                                       |
|-------------------|-----------------------------------------------------------------------------------------------|
| `commit-message`  | Suggest a `[Type] Description` commit message from the staged diff                            |
| `create-issue`    | Create single-layer tracked issues on GitHub or GitLab                                        |
| `dev-spec`        | Turn a bug or feature request into a technical spec                                           |
| `domain-modeling` | Build the domain glossary and ADRs; copied from mattpocock-skills                             |
| `grilling`        | Interview the user until a plan reaches a shared understanding; copied from mattpocock-skills |
| `obsidian-note`   | Write or review Obsidian notes following vault conventions                                    |
| `skill-reviewer`  | Review a skill against the Agent Skills spec and authoring practices                          |
| `ticket`          | Drive a ticket from branch to merged PR or MR, or resume it                                   |


## Agents

| Agent                | Purpose                                                        |
|----------------------|----------------------------------------------------------------|
| `ticket-check`       | Run a lint or maintenance skill for `ticket`, return a report  |
| `ticket-review`      | Run review, e2e or comment pass for `ticket`, return a report  |
| `ticket-investigate` | Run `dev-spec` for `ticket`, read only                         |
| `ci-investigate`     | Find why a CI pipeline failed: code, flaky or infra; read only |
| `debug-investigate`  | Find a bug's root cause before any fix; read only              |


## Hooks

| Event  | Effect                                                                                    |
|--------|-------------------------------------------------------------------------------------------|
| `Stop` | On a ticket branch with a plan, shows the step roadmap after each reply; silent otherwise |
| `Stop` | On a ticket branch with a plan, adds time and tokens per step to `metrics/summary.md` in the ticket folder; needs `python3`, silent |


## Installation with claude code

```bash
claude plugin marketplace add git@github.com:Franck-dev-hub/agent-skills.git
claude plugin install franck-dev-skills@franck-dev-skills
```
