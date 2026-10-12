---
name: condense
description: "Use when asked to shorten, condense, compress or tighten files or folders without losing information, for agents and humans to read (\"raccourcis ce fichier\", \"compresse ce md\", \"condense\", \"allège\", \"nettoie les commentaires\"). A Markdown file is rewritten whole; any other file has only its comments cleaned. Not for writing or reviewing Obsidian notes, use obsidian-note."
---

# Condense

Arguments: one or more file or folder paths.
A folder is walked recursively.
Goal: same information, fewer words.
Readers: agents act on the text, humans must understand it at first read.
Losing a fact is worse than keeping a redundant one: when unsure, keep it.

## Mode

| File                                | Mode                                                         |
|-------------------------------------|--------------------------------------------------------------|
| `.md`, `.markdown`                  | Prose rewritten; comments in fenced blocks follow code rules |
| Code, config, templates             | Comments only; code and strings stay byte-identical          |
| No comment syntax (`.json`, `.txt`) | Skipped, said in the report                                  |

## 1. Before editing

Expand folders into files:

- In a git repo: `git ls-files -co --exclude-standard <dir>`, so ignored files stay out.
- Outside git: `find <dir> -type f`, without `.git`, `vendor`, `node_modules`, `var`, `dist`, `build`.
- Drop binaries, lock files, minified and generated files.
- Show the file count per mode. Over 30 files, ask before going on.

For each file:

1. Copy the original, keeping its path so two `README.md` do not collide:
   `mkdir -p "<tmp-dir>/$(dirname <file>)" && cp <file> "<tmp-dir>/<file>"` (`<tmp-dir>` from `mktemp -d`).
2. List every information unit: rule, fact, number, version, path, command, name, URL, warning, condition, exception, and any example that is the only one covering its case.

## 2. What never changes

- Frontmatter: a SKILL.md `description` is a trigger, Obsidian properties are data.
- Headings: `#anchor` and `[[File#Section]]` links elsewhere point to them.
- Code lines in fenced blocks, tables' data, URLs.
- Machine-read comments: shebang, encoding line, licence header, typed tags (`@var`, `@param`, `@return`, `@throws`, `@phpstan-*`, `@psalm-*`), annotations and attributes, `phpstan-ignore`, `phpcs:`, `eslint-`, `@ts-`, `noqa`, `type: ignore`, `prettier-ignore`, `#region`, `go:build`, `shellcheck`, TOC or markdownlint markers.
- `TODO` and `FIXME` with a ticket: shorten the text, keep the reference.
- Commented-out code: not deleted, listed in the report.
- A comment that contradicts the code: not changed, listed in the report; either side may be wrong.

## 3. Code references

Applies to prose and comments.

Keep a code reference when the reader acts on it or cannot find the thing without it:

- a path to edit, a command to run, a config key, an env var;
- the API the text documents;
- a symbol with no plain-language name.

Otherwise describe the behaviour: "the cart total is recomputed" over `CartCalculator::recompute()`.
Drop `path:line`: it rots with the next edit.
A comment does not name the code next to it.

## 4. Markdown prose

Cut:

- Intros, outros, restatements, meta-commentary ("this section explains").
- Filler and hedges that carry no information.
- Duplicates: keep the most specific copy, where a reader would look for it.

Rewrite:

- Active voice, direct sentences, the verb first in instructions.
- A paragraph listing items becomes a list or a table.
- Keep the file's language.

Rewrites keep the exact meaning of:

| Trap      | Example                                             |
|-----------|-----------------------------------------------------|
| Modality  | `must`, `should`, `may` are three different rules   |
| Negation  | `never`, `not`, `only`                              |
| Condition | `unless`, `only when`, `except`, `if`               |
| Scope     | `all`, `each`, `some`, `at least`                   |
| Merge     | Two rules joined into one must keep both conditions |

## 5. Comments

Applies to code files and to fenced blocks in Markdown.
The comment rule of the project's `AGENTS.md` or `CLAUDE.md` wins over this section.

- Delete a comment that restates the code below it.
- Delete edit narration ("changed to a set", "now uses X"); a warning still true inside it is rewritten in the present tense.
- Keep a comment that gives a why: constraint, trade-off, trap, link to an issue.
  Rewrite it to one line when it fits.
- A tag-less one-line docblock in PHP or JS becomes `//`; keep `/** */` when it carries a tag.
- Several files: the same why in two files stays where someone would make the mistake.

## 6. Verify

Markdown, from the directory the paths are relative to:

```bash
python3 <skill-dir>/scripts/check_md.py <tmp-dir>/<file> <file>
```

- `FAIL`: restore the lost item, rerun until it passes.
- `REVIEW`: confirm each removed fence line is a comment, each HTML comment and inline code was meant to go.

Code files:

- Every hunk of `diff -u <tmp-dir>/<file> <file>` touches comments only.
- Run the syntax check when the language has one: `php -l`, `node --check`, `python3 -m py_compile`, `bash -n`.

Then check each information unit from step 1 against the new file.

## 7. Report

```
| File | Lines      | Chars        | Check |
|------|------------|--------------|-------|
| <f>  | <n> -> <n> | <n> -> <n>   | ok    |

### Removed content
- <file>:<line before> "<sentence or comment>": <reason>

### Replaced references
- <file>:<line before> `<code>` -> "<plain words>"

### Kept for review
- <file>:<line> commented-out code
- <file>:<line> contradicts the code: <what differs>
```

Removed content lists every cut that dropped meaning, not wording.
Empty list: say "no content removed, wording only".
