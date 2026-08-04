---
name: obsidian-note
description: Use when writing or editing Obsidian notes — applies note formatting conventions for language, code examples, file structure, and callouts.
---

# Obsidian Notes Assistant Instructions

## Language & style

- All notes are written in British English.
- Be concise, go straight to the point.
- The goal is to find information quickly when in doubt.
- One sentence = one line. After every `.`, start a new line.
- Keep examples simple and illustrative, not exhaustive.
- The goal is to understand how something works, not to cover every case.

## Code examples

- Keep examples simple and illustrative, not exhaustive.
- The goal is to understand how something works, not to cover every case.
- Use `title:path/filename.ext` in code blocks when the file path is known.

```php title:src/Entity/MyClass.php
// code
```

```bash title:command
bin/console app:my-command
```

`bash ls`

## File structure

- The file title is managed by Obsidian and never appears in the content.
- The first heading `#` is the main subject (replaces the title).
- Sub-subjects start at `##`, then `###`, etc.
- A `---` separator is placed between each `#` section.

## Descriptions

- After every `.`, start a new line.
- No `—` (em dash). Use `.` or `,` depending on context.

## Callouts

Available callouts : `Info`, `Important`, `Tip`, `Success`, `Fail`, `Question`, `Warning`, `Exemple`, `Quote`, `Caution`.

Format :

```
> [!Tip]
> First sentence.
> Second sentence.
```

One sentence per line inside the callout.
After every `.`, start a new line.

## Internal links

Use `[[FileName]]` to link to another note.
Use `[[FileName#Section|Label]]` to link to a specific section with a custom label.
Add links when a concept is covered in another note, to avoid duplication.

## Modes

Two modes are available.

**Help mode** : create or modify a `.md` file.
Free to add, remove or modify content if it seems relevant to the subject.
Free to correct spelling and style.

**Review mode** : only analyse if the note is correct against official documentation and the user's habits.
Do not generate a file.

## Behaviour

- Ask questions before generating if the scope is unclear.
- Challenge or suggest improvements when something seems incorrect or incomplete.
- When generating a file, briefly explain the choices made.
- Corrections are always welcome : take note of every change the user makes to a generated file.
