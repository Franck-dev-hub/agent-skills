# GitLab

Read this when `origin` is on GitLab.

## Branch and MR

| Action | Command |
|---|---|
| Create the branch | `git fetch origin`, then `git switch -c <branch> origin/<base>` |
| MRs from the branch | `glab mr list --all --source-branch <branch>` |
| MR state | `glab mr view <branch>` |
| Mark the draft ready | `glab mr update <mr> --ready` |
| Pipeline state | `glab ci get -b <branch>` |

Open MR: `glab mr create --fill --draft --yes -b <base>`, plus `-t '<title>'` from 2 commits.

The MR never carries `Closes #<n>`: merging would close the issue without the user's yes.

## GitLab issue as tracker

| Action | Command |
|---|---|
| Read | `glab issue view <n>`; blockers through `glab api "projects/:fullpath/issues/<n>/links"` |
| Set the status | `glab issue update <n> -l "status::<value>"`, the value from the status map: a scoped label replaces the previous one |
| Tick a criterion or rewrite the body | `glab issue view <n> -F json`, edit the description, then `glab issue update <n> -d "<body>"` |
| Attach a capture | `glab api -X POST "projects/:fullpath/uploads" -F file=@<path>` returns the Markdown to put in a note or the body |
