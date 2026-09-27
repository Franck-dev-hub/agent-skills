# GitHub

Read this when the target platform is GitHub, at step 4 (relationships) or step 6 (metadata).

## Relationships

```sh
gh issue edit <n> --add-blocked-by <m>
gh issue edit <n> --add-blocking <m>
```

Native sidebar relationships, never a body mention. Set one direction per pair, GitHub shows the inverse. Other types: relates to, duplicates.

## Projects v2 fields

Only when the repo uses a Project board.

## Resolve IDs first

```sh
gh project list                       # project ID
gh project field-list <project-id>    # field IDs
```

Read option IDs and colours for one field:

```sh
gh api graphql -f query='
  query($org: String!, $number: Int!) {
    organization(login: $org) {
      projectV2(number: $number) {
        field(name: "Priority") {
          ... on ProjectV2SingleSelectField {
            id
            options { id name color }
          }
        }
      }
    }
  }' -f org=<owner> -F number=<project-number>
```

## Add the issue, then set the fields

```sh
gh project item-add <project-id> --owner <owner> --url <issue-url>
gh project item-edit --id <item-id> --project-id <project-id> \
  --field-id <field-id> --single-select-option-id <option-id>
```

- No `--repo` flag on `item-add`; scope comes from the project's owner.
- Repeat `item-edit` once per field (Priority, Size, Status, Layer, Phase).
- `--field-id` plus `--single-select-option-id` are the only reliable forms. `--field`/`--value` do not resolve single-select fields.

## Option colours

Colours come from a fixed enum, not hex codes: `GRAY, BLUE, GREEN, YELLOW, ORANGE, RED, PINK, PURPLE`. New options default to `GRAY`.

Set them with the `updateProjectV2Field` mutation, passing `singleSelectOptions` with every option (`id`, `name`, `color`, `description`); omitted options are dropped.

Defaults worth keeping:

| Field | Option | Colour |
|---|---|---|
| Priority | Urgent / High / Medium / Low | RED / ORANGE / YELLOW / GREEN |
| Layer | backend / frontend / ml / infra | BLUE / PINK / PURPLE / GRAY |

## Sub-issues

```sh
gh issue create ... --parent <parent-number>
gh issue edit <parent> --add-sub-issue <child>
```

A sub-issue has exactly one parent; a parent has many children. Adding a child to a new parent moves it. Remove with `--remove-sub-issue` / `--remove-parent`.

The Project fields `Parent issue` and `Sub-issues progress` are read-only and derived. They render as "Invalid value" when the item joined the project before the parent link existed, and re-adding the item does not always refresh them (known GitHub bug).

Mark a field `Required` in the project settings when every issue must carry it, e.g. Phase.

## Status field caveat

GitHub's default `Status` field ships with fixed options `Todo / In Progress / Done` that the API cannot rename. A project needing a different lifecycle (`backlog / ready / in review`) must add its own single-select field.
