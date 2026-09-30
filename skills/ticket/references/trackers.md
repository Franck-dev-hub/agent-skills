# Notion and Redmine

Read this when the ticket lives in Notion or Redmine.
Each needs its MCP connected; without it, the ticket is pasted text and every change goes in the *To report in the ticket* block.

## Notion

| Action | Tool |
|---|---|
| Read the ticket, its status and relations | `notion-fetch` with the page URL or id |
| Status values | the Status property's options, from the fetch of the ticket's database |
| Set the status, tick a criterion | `notion-update-page`: `update_properties` with the exact property names from the fetch, or `update_content` on the criterion's line |
| Rewrite the body | `notion-update-page` with `update_content` on the sections the spec changes |

## Redmine

| Action | Call |
|---|---|
| Read the ticket and its relations | `redmine_request` `GET /issues/<id>.json` with `include=relations` |
| Status ids | `redmine_request` `GET /issue_statuses.json` |
| Set the status | `redmine_request` `PUT /issues/<id>.json` with `{"issue": {"status_id": <id>}}` |
| Criteria | the Checklists plugin (RedmineUP): `redmine_request` `GET /issues/<id>/checklists.json` |
| Tick a criterion | `redmine_request` `PUT /checklists/<item id>.json` with `{"checklist": {"is_done": true}}` |

Never rewrite a Redmine ticket nor add a note: the spec stays in the plan, and only the checklist gets ticked.
