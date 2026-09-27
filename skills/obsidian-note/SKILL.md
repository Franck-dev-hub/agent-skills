---
name: obsidian-note
description: Use when the user asks to write, create, modify, review or fact-check an Obsidian note (.md file), or when writing a note that should follow Obsidian conventions such as callouts, internal links and one-sentence-per-line formatting.
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

Use `title:path/filename.ext` in code blocks when the file path is known.

```php title:src/Entity/MyClass.php
// code
```

```bash title:command
bin/console app:my-command
```

Use inline code for a bare command or a symbol: `ls`, `AppKernel`.

## File structure

- The file title is managed by Obsidian and never appears in the content.
- The first heading `#` is the main subject (replaces the title).
- Sub-subjects start at `##`, then `###`, etc.
- A `---` separator is placed between each `#` section.

## Punctuation

No `—` (em dash). Use `.` or `,` depending on context.

## Callouts

Available callouts: `Info`, `Important`, `Tip`, `Success`, `Fail`, `Question`, `Warning`, `Example`, `Quote`, `Caution`.

Format:

```
> [!Tip]
> First sentence.
> Second sentence.
```

The one-sentence-per-line rule applies inside the callout too.

## Internal links

Use `[[FileName]]` to link to another note.
Use `[[FileName#Section|Label]]` to link to a specific section with a custom label.
Add links when a concept is covered in another note, to avoid duplication.

## Modes

Pick the mode from the request, do not ask:

| Request | Mode |
|---|---|
| "write", "create", "add", "update", "fix", "reformat" | Help |
| "review", "check", "is this correct", "relis" | Review |
| Neither is clear | Ask which one, in one line |

**Help mode**: create or modify the `.md` file.
Free to add, remove or modify content if it seems relevant to the subject.
Free to correct spelling and style.

**Review mode**: only analyse whether the note is correct against official documentation and the user's habits.
Report findings in the conversation, never write or modify the file.

## Behaviour

- Ask questions before generating if the scope is unclear.
- Challenge or suggest improvements when something seems incorrect or incomplete.
- When generating a file, briefly explain the choices made.
- Corrections are always welcome: take note of every change the user makes to a generated file.
