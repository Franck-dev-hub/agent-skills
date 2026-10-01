# GitHub

Read this when `origin` is on GitHub.
The status map holds the board, the Status field id, and one option id per status.

## Branch and PR

| Action | Command |
|---|---|
| Create the branch, linked to the issue | `gh issue develop <n> --name <branch> --base <base> --checkout` |
| Create the branch, tracker not GitHub | `git fetch origin`, then `git switch -c <branch> origin/<base>` |
| Linked branches | `gh issue develop <n> --list` |
| Linked PRs | `gh issue view <n> --json closedByPullRequestsReferences` |
| PR state | `gh pr view <pr>` |
| Pipeline state | `gh pr checks <pr>` |

A branch not linked to its GitHub issue needs `gh pr edit --body 'Closes #<n>'` once the PR is open.
With a tracker other than GitHub, the PR never carries `Closes #<n>`: it would target an unrelated issue.

## GitHub issue as tracker

| Action | Command |
|---|---|
| Read | `gh issue view <n>`, its `blocked by` relationships |
| Status | `gh project item-list` filtered on the issue |
| Set the status | `gh project item-edit --id <item> --project-id <board> --field-id <status> --single-select-option-id <option>` |
| Tick a criterion | `gh issue view <n> --json body -q .body`, `- [ ]` to `- [x]` on its line, then `gh issue edit <n> --body-file -` |
| Rewrite the body | `franck-dev-skills:create-issue` |
