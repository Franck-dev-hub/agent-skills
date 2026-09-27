# GitLab

Read this when the target platform is GitLab, at step 4 (relationships) or step 6 (metadata).

Requires `glab` authenticated. Epics and issue weight need Premium; scoped labels and issue links work on Free.

## Scoped labels

GitLab has no Projects v2 single-select fields. Metadata goes in scoped labels, `scope::value`, created once per project then applied like any label.

```sh
glab label create -n "priority::high" -c "#D9534F"
glab issue create -t "<title>" -d "<body>" -l "priority::high,layer::backend,size::m"
```

Scoped labels are last-write-wins per scope: adding `priority::low` removes `priority::high` by itself.

```sh
glab issue update <iid> -l "status::in-review"   # replaces status::todo on its own
glab issue update <iid> -u "layer::backend"      # -u only to drop a whole scope
```

Use `-u` only to remove a scope entirely, never to swap a value within one.

Suggested colours, matching the GitHub defaults:

| Label | Colour |
|---|---|
| `priority::urgent` / `high` / `medium` / `low` | `#D9534F` / `#E0A458` / `#EDC94C` / `#5CB85C` |
| `layer::backend` / `frontend` / `ml` / `infra` | `#428BCA` / `#D77BA3` / `#8E44AD` / `#999999` |

## Weight and epics

```sh
glab issue update <iid> -w 3           # weight, Premium
glab issue create ... --epic <epic-id> # parent, Premium
```

`glab issue update` has no `--epic`: set the epic at creation, or move the issue from the epic's page.

Without Premium, express parent/child as a task list in the parent's body.

## Relationships

`glab` has no `issue link` command. Use the API, passing the arguments as query parameters the way the REST docs do:

```sh
glab api "projects/:fullpath" | jq .id   # numeric project ID, once
glab api -X POST \
  "projects/<id>/issues/<iid>/links?target_project_id=<id>&target_issue_iid=<other-iid>&link_type=blocks"
```

`link_type` is one of `relates_to`, `blocks`, `is_blocked_by`, defaulting to `relates_to`. The link is two-way, so set one direction only.

`glab api` has no `--jq` flag; pipe to `jq`.
