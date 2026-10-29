# GitLab

Read this when `origin` is on GitLab.

## Branch and MR

| Action | Command |
|---|---|
| Create the branch | `git fetch origin`, then `git switch -c <branch> origin/<base>` |
| MRs from the branch | `glab mr list --all --source-branch <branch>` |
| MR state | `glab mr view <branch>` |
| Pipeline state | `glab ci get -b <branch>` |
| Review threads | `glab api "projects/:fullpath/merge_requests/<iid>/discussions"`, those with `resolvable` and not `resolved` |

Open the MR, step 9, with the title and description filled in:

```bash
git push --set-upstream origin HEAD -o merge_request.create -o merge_request.draft -o merge_request.assign="$(git config gitlab.user)" -o merge_request.title='<title>' && glab mr update "$(git branch --show-current)" --description "$(cat <<'EOF'
<description>
EOF
)"
```

The MR never carries `Closes #<n>`: merging would close the issue without the user's yes.

## GitLab issue as tracker

| Action | Command |
|---|---|
| Read | `glab issue view <n>`; blockers through `glab api "projects/:fullpath/issues/<n>/links"` |
| Set the status | `glab issue update <n> -l "status::<value>"`, the value from the status map: a scoped label replaces the previous one |
| Tick a criterion or rewrite the body | `glab issue view <n> -F json`, edit the description, then `glab issue update <n> -d "<body>"` |
