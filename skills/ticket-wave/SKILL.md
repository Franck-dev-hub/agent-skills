---
name: ticket-wave
description: Run several tickets in parallel, one Claude Code session per ticket in its own worktree, each running the ticket skill. Resolves ids or a milestone's next wave from the tracker, warns on dependencies and shared files, and stays the tracker's only writer. For a single ticket, use ticket.
disable-model-invocation: true
argument-hint: <ticket-ids|milestone>
---

# Ticket wave

Tickets: `$ARGUMENTS`.
This session is the orchestrator: it prepares one worktree per ticket, starts one session per ticket running `/franck-dev-skills:ticket <id>`, and is the only writer of the tracker.
It never commits, merges nor pushes.

Read `~/.claude/ticket.local.md` as the ticket skill does: its first profile matching `origin` gives the tracker, the base branch, the status map, the plan folder and `Worktree setup` (format: `../ticket/references/local-profile.md`).
A value the profile sends elsewhere (`AGENTS.md`, `CLAUDE.md`) is read there.
With no profile matching, ask the user to run `/franck-dev-skills:ticket` once in this repo: it sets the profile up.
Read the tracker through the ticket skill's references: `../ticket/references/github.md`, `gitlab.md` or `trackers.md`.
A local Markdown tracker is read as a file.

## Host

| Host | Sessions started with | The user opens one with |
|---|---|---|
| Claude Desktop, `start_session` in the tool list | `start_session` (step 4) | the sidebar |
| Claude Code CLI | `claude --bg`, below | `claude attach <name>`, `claude agents` lists them |

In the CLI, the orchestrator starts each session from its worktree:

```bash
(cd <worktree> && claude --bg -n <name> --append-system-prompt "$(cat <<'EOF'
<brief>
EOF
)" '/franck-dev-skills:ticket <id>')
```

`<name>` follows the `name` rule of step 4.
The brief names the orchestrator by its own row in `claude agents --json`, the one whose folder is the main checkout.
A session SendMessage cannot reach, or a CLI with no `--bg`, talks to the orchestrator through the user: give the user the command without `--bg`, to run in a terminal.

## 1. Resolve the tickets

| Argument | Tickets |
|---|---|
| Ids (`T92 T93`, `#12 #14`) | those tickets |
| A milestone and a wave (`0.2.0 vague 2`) | the milestone's tickets with that wave |
| A milestone (`0.2.0`) | the milestone's next wave not started: the lowest one whose tickets are all Ready |

- Wave numbers count within their milestone.
- A ticket that depends on the whole milestone (`toute la milestone`) goes in its last wave.
- A milestone whose previous wave holds a ticket not Done gives a warning (step 2).

A tracker with no wave column gets computed waves:

- A ticket joins a wave only once each of its dependencies is Done or sits in an earlier wave.
- Three tickets at most per wave.
- First the ticket with the longest chain of dependents (direct and indirect), then the tracker's table order.

Show the computed waves. They go in the tracker only through *Tracker writes*.

## 2. Check the parallel run

Show one table: id, title, status, branch name, warnings.
The branch name is `<type>/<ticket-id>-<slug>`, as in the ticket skill: type from the ticket's nature, `feature` by default, slug from its title in short kebab case.

Warn, in one line each, on:

- a dependency between two tickets of the run,
- a dependency on a ticket not merged yet: status not Done, or its PR still open on the forge,
- a ticket whose status is not Ready,
- files or code areas two tickets share, when the tracker's text, a plan or its `Files touched` section names them (`rust/src/horde/`, `game/game.gd`),
- a branch or worktree that already exists for a ticket (`wt list`, else `git worktree list`): that ticket resumes in it, nothing is created.

A warning never blocks: the user may run the tickets even when they step on each other.
Ask once: run them all, some, or none.
The yes validates the branch names and covers steps 3 and 4.

## 3. Prepare the worktrees

For each ticket with no worktree yet, one after the other:

1. With `wt` installed (`command -v wt`): `wt switch -c <branch> -b <base> --no-cd`, and `wt list` gives its path.
   Otherwise: `git worktree add -b <branch> <path> <base>`, `<path>` being `../<repo>.<branch>` with each `/` as `-`, as `wt` names it.
2. Run the profile's `Worktree setup` at the worktree's root, such as a git-ignored link to a vault.
   It runs only on a worktree this run created: a link made twice lands inside its own target.
3. Check that the plan folder resolves in the worktree: without it, the ticket skill finds no plan.
   A missing one is a warning before step 4.

A ticket that already has its worktree keeps it as it is.

Then set every ticket not yet In progress to In progress, in one pass, through *Tracker writes*: the launch yes stands for the user's yes.

## 4. Start the sessions

In Claude Desktop, one `start_session` per ticket, in one batch of parallel calls:

| Field | Value |
|---|---|
| `initiation` | `user_asked` |
| `context` | `fresh` |
| `cwd` | the worktree's absolute path |
| `use_worktree` | `false` |
| `name` | `<id>-<first slug word>` in lowercase, `[a-z0-9-]`, 24 characters at most (`t92-courbe`) |
| `title` | `<id> <ticket title>` |
| `prompt` | `/franck-dev-skills:ticket <id>` |
| `background` | the brief below, filled in |

- The app refuses a start on a turn that another session's message started: start sessions only on a turn the user drives.
- A start the app refuses (its own session cap, a folder to trust): give that ticket's CLI command (*Host*) and go on with the others.
- The user decides how many tickets run at once: the skill sets no cap.

The brief:

```text
Ticket <id>, run by the ticket-wave orchestrator: the session that started you.
- Branch `<branch>` and its worktree `<path>` already exist, and the ticket is already In progress.
- With a plan for this ticket, resume as the ticket skill's Resume says.
- With none, run step 1 as a start: create no branch, move no status, give no `/rename`.
- Never `git switch`, `git checkout` nor `git worktree`.
- At step 8, never switch to `<base>`: report the merge, the orchestrator removes the worktree.
- Never write the tracker.
- Send every tracker change (status, tick, body) to the orchestrator through SendMessage, as the exact text to write.
- The orchestrator needs your touched files to catch conflicts with the other tickets: the turn notes it gets are cut too short to carry them.
- So send it, through SendMessage, the files and code areas you touch, at three points: Key decisions validated (step 2), PR open (step 7), PR merged (step 8).
- Follow the conflict rules and merge order it sends back.
- Every commit waits for the user's approval of its code and its message.
```

In the CLI, the brief's first line names the orchestrator's session instead of "the session that started you".

## 5. During the wave

Each announcement of touched files is crossed with the others'.
A file or area two sessions share: send both sessions the conflict rules, through SendMessage to each one's id or name:

- add rather than rewrite,
- new enum values and list entries at the end,
- new files rather than moving or reorganising existing ones.

Set the merge order: a ticket another one depends on merges first, then the first PR opened.
Tell each session the PR it merges after: its PR description starts with `Merge after !<n>` (ticket step 7).

A session's note is its report, not proof: check a PR's state on the forge before taking it as open or merged.

## Tracker writes

The orchestrator is the only writer: two writers overwrite each other.

1. Show the user the exact change of every pending request, in one message.
   A request a session says the user already approved is still shown and confirmed here.
2. On the user's yes, read the tracker again right before writing: Obsidian or a sync may have changed it since.
3. A file tracker gets a backup first: `cp <tracker> ~/.claude/ticket-wave/backups/<file name>.<YYYYMMDD-HHMMSS>`, folder created when missing.
4. Write every approved change in one pass.

A tracker with no write access gets a **To report in the ticket** block, as in the ticket skill.

## 6. After the wave

Once every PR of the wave is merged on the forge and its ticket Done:

- offer to remove each worktree, run only on the user's yes: `wt remove <branch>`, else `git worktree remove <path>` then `git branch -d <branch>`,
- propose the next wave, resolved as in step 1, with its step 2 table.

Nothing starts without the user: a run of this skill on a turn they drive.
