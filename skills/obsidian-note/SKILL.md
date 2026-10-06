---
name: obsidian-note
description: Use when the user asks to write, create, update, reformat, review or fact-check a note in their Obsidian vault, in English or French ("écris une note", "fiche", "relis ma note", "vérifie cette note"). Not for README, CLAUDE.md, SKILL.md, plan.md or other repository Markdown.
---

# Obsidian notes

## Scope

- One idea per note.
  Link to an existing note instead of repeating its content.
- Before creating a note, search the vault for one that already covers the concept.
- Tool and pattern notes stay generic: placeholders (`<project-dir>`), no project paths, bundle names or brand colours.
- No note per ticket.
  Tickets live in the tracker; the vault keeps reusable knowledge only.

## Language & style

- British English, even when the existing file is in an other language.
- Concept first: what happens and why.
  Code only to illustrate it.
- Default to the shortest version: no edge cases, examples or code unless asked.
- One sentence per line.
  Abbreviations (`e.g.`), versions and file names do not end a sentence.
- No `—` (em dash).
  Use `,`, or `.` depending on context.
- No empty section.

## Structure

- No title heading: Obsidian shows the file name.
- Main sections use `#`, separated by `---`.
  Subsections use `##` to `######`.
- Numbered steps use a bold inline label, not a heading: `**1. Create the branch**`.
  Text next to a step stays plain.
- Tables are aligned: each cell padded to the column width, separator row stretched to match.

## Code

Use `title:path/filename.ext` in code blocks when the file path is known.

```php title:src/Entity/MyClass.php
// code
```

```bash title:command
bin/console app:my-command
```

Use inline code for a bare command or a symbol: `ls`, `AppKernel`.

Comments in code blocks:

| Block                                         | Comment                    |
|-----------------------------------------------|----------------------------|
| Copy-paste, obvious commands                  | None                       |
| Placeholder or flag whose name is not obvious | One line, on that line     |
| Illustrative, not meant to be run             | Welcome                    |

## Callouts

Types: `Note`, `Abstract`, `Info`, `Todo`, `Tip`, `Success`, `Question`, `Warning`, `Failure`, `Danger`, `Bug`, `Example`, `Quote`.

```
> [!Tip]
> First sentence.
> Second sentence.
```

## Internal links

Use `[[FileName]]`, or `[[FileName#Section|Label]]` for a section with a custom label.
Link only where the reader would actually go check the concept, not at every mention.

## Modes

Pick the mode from the request, do not ask:

| Request                                                                       | Mode                       |
|-------------------------------------------------------------------------------|----------------------------|
| "write", "create", "add", "update", "fix", "reformat", "écris", "corrige"     | Help                       |
| "review", "check", "fact-check", "is this correct", "relis", "vérifie"        | Review                     |
| Neither is clear                                                              | Ask which one, in one line |

**Help mode**: create or modify the `.md` file.
Rewrite or remove what breaks these rules; add content only when asked.

**Review mode**: check the note against official documentation and these rules.
Report findings in the conversation with their line, never modify the file.

## Behaviour

- Ask before writing if the scope is unclear.
- Challenge content that looks wrong or incomplete.
- When the user corrects a generated note, propose the correction as a new rule for this skill at the end of the task.
