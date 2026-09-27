---
name: skill-reviewer
description: Use when asked to review, validate, audit or check a Claude skill (SKILL.md) against the Agent Skills specification and authoring best practices, or after creating or editing a skill.
allowed-tools: Read Grep Bash WebFetch
---

# Skill Reviewer

Reviews a SKILL.md against the Agent Skills spec at <https://agentskills.io/specification>, then against authoring judgment the spec does not encode.

Target: all skills under `skills/` when none is named. Say which you picked, do not ask.

## 1. Spec conformance (hard rules)

These are pass/fail. Everything in this section comes from the spec, quote it when reporting a failure.

| Field | Rule |
|---|---|
| `name` | Required. 1-64 chars. Lowercase `a-z`, `0-9`, hyphens only. No leading, trailing or consecutive hyphens. Must match the parent directory name. |
| `description` | Required. 1-1024 chars. States what the skill does **and** when to use it. |
| `allowed-tools` | Optional, experimental. Spec format is a **space-separated** string, e.g. `Bash(git:*) Read Grep`. Claude Code also accepts commas or a YAML list; prefer spaces, they work everywhere. Flag commas as portability, not as a spec failure. |
| `license` | Optional. Short: a licence name or a bundled file name. |
| `compatibility` | Optional. 1-500 chars. Only when the skill has real environment requirements. |
| `metadata` | Optional. Map of string keys to string values. |

Parse the frontmatter, do not eyeball it. An unquoted YAML scalar cannot contain `: ` or start with `[`, `{`, `&`, `*`, `#`; a description holding one is a hard failure even though it reads fine.

Body rules:

- SKILL.md body under 500 lines, ideally under ~5000 tokens.
- File references are relative to the skill root and one level deep: `references/REFERENCE.md`, `scripts/extract.py`.
- Extra files belong in `references/` (docs read on demand), `scripts/` (executables), `assets/` (templates, data).

Do not invent thresholds the spec does not state. A 400-character description is legal and often better than a 120-character one; judge it on content, not length.

## 2. Authoring judgment (soft)

**Description**
- Carries the words a user would actually say. A skill about splitting commits that never says "split" will not trigger.
- Says when **not** to fire if a sibling skill overlaps.
- Functional tone, no marketing.

**Progressive disclosure**
- Only the name and description load at startup; the body loads on activation; `references/` load on demand.
- Reference material consulted in a minority of runs (API cookbooks, flag tables, platform specifics) belongs in `references/`, not in the body.

**Content**
- One well-defined purpose.
- Operational: instructions the agent executes, not commentary about the skill's development.
- No changelog, version history, timestamps or "validated on ..." notes.
- No duplication: repeated verbatim lines, or content that restates docs the skill could link instead.
- Every declared mode, branch or option has a rule saying when it applies.
- Steps appear in the order they are executed, and each step has what it needs by the time it runs.

**Self-consistency**
- The skill obeys its own rules. A skill banning em dashes must not contain one.
- `allowed-tools`, when present, covers every tool the skill's own process requires.
- Every URL it cites resolves. Check them.

## 3. Security and portability

Grep the skill and its reference files:

```sh
grep -rniE 'password=|api_key|API_KEY|secret|Bearer |postgres(ql)?://[^ ]*:|mysql -u' <skill-dir>
grep -rnE '/home/[a-z]|/Users/[A-Za-z]|C:\\' <skill-dir>
```

Hits inside a skill's own detection patterns or anti-pattern lists are not findings, read the line before reporting it.

| Found | Fix |
|---|---|
| Real credential | Move to `.env`, reference as `$VAR`, gitignore the file |
| Absolute path | `~/`, a relative path, or a `{{PLACEHOLDER}}` |
| Platform-locked path or command | Give both forms, or state the requirement in `compatibility` |

## 4. Report

Lead with the single worst finding. Then:

```
## Skill review: <name>

<one line: the worst problem, or "conforms, N soft findings">

| Skill | dir=name | desc chars | lines | YAML | Creds | Abs. paths |
|---|---|---|---|---|---|---|
| <name> | ok/FAIL | <n> | <n> | valid/FAIL | none/FAIL | none/FAIL |

### Issues
| # | Issue | Severity |
|---|---|---|

### Fixes, in order
1. ...
```

Rules for the report:
- Every claim carries a confidence tag.
- Measure, never estimate: `wc -m` on the description, `wc -l` on the file.
- Cite `file:line` for each finding.
- Severity: **High** breaks the spec or stops the skill working. **Medium** degrades triggering or maintenance. **Low** is style.
- A spec violation and a judgment call are different things. Label which one you are making.

## Reference

- Spec: <https://agentskills.io/specification>
- Template and examples: <https://github.com/anthropics/skills> (`template/SKILL.md`, `skills/`)
- Validator: `skills-ref validate ./my-skill`
