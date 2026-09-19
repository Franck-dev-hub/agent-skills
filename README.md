# franck-dev-hub-skills

Private Claude Code marketplace hosting personal skills.

| Object | Name |
|---|---|
| Marketplace | `franck-dev-hub-skills` |
| Plugin | `franck-dev-skills` |

## Skills

| Skill | Purpose |
|---|---|
| `commit-message` | Suggest a `[Type] Description` commit message from the staged diff |
| `create-issue` | Create single-layer tracked issues on GitHub or GitLab |
| `dev-spec` | Turn a bug or feature request into a technical spec |
| `obsidian-note` | Write or review Obsidian notes following vault conventions |


## Install

```bash
claude plugin marketplace add git@github.com:Franck-dev-hub/agent-skills.git
claude plugin install franck-dev-skills@franck-dev-hub-skills
```

Restart Claude Code to load them.
