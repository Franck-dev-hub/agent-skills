#!/usr/bin/env python3
"""Compare a Markdown file before and after condensing.

Usage: check_md.py <before.md> <after.md>

Exit 1 when a hard invariant is lost: frontmatter, headings, URLs, link
targets, inline code, numbers or the number of fenced blocks.
Removed HTML comments and changed fence lines are printed for review only.
"""

import difflib
import re
import sys

FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})")
HEADING = re.compile(r"^ {0,3}#{1,6}\s+(.*?)\s*#*\s*$")
LIST_MARKER = re.compile(r"^\s*\d+[.)]\s")
URL = re.compile(r"https?://[^\s)>\]\"'`]+")
LINK_TARGET = re.compile(r"\]\(([^)\s]+)")
WIKI_LINK = re.compile(r"\[\[([^\]]+)\]\]")
INLINE_CODE = re.compile(r"`([^`\n]+)`")
NUMBER = re.compile(r"(?<![\w.])\d+(?:[.,:]\d+)*(?![\w])")
HTML_COMMENT = re.compile(r"<!--.*?-->", re.S)


def split(text):
    """Return frontmatter, prose lines and fenced blocks."""
    frontmatter = ""
    if text.startswith("---\n"):
        end = text.find("\n---", 4)
        if end != -1:
            frontmatter = text[: end + 4]
            text = text[end + 4 :]

    prose, fences, current, marker = [], [], None, None
    for line in text.splitlines():
        match = FENCE.match(line)
        if current is None and match:
            marker, current = match.group(1), [line]
        elif current is not None:
            current.append(line)
            if line.strip().startswith(marker[0] * len(marker)) and line.strip().strip(marker[0]) == "":
                fences.append(current)
                current = None
        else:
            prose.append(line)
    if current is not None:
        fences.append(current)
    return frontmatter, prose, fences


def invariants(prose):
    joined = "\n".join(prose)
    # Inline code is matched first so its content does not count as prose numbers.
    without_code = INLINE_CODE.sub(" ", joined)
    without_markers = "\n".join(LIST_MARKER.sub("", line) for line in without_code.splitlines())
    return {
        "headings": {m.group(1) for line in prose if (m := HEADING.match(line))},
        "URLs": set(URL.findall(joined)),
        "link targets": set(LINK_TARGET.findall(joined)) | set(WIKI_LINK.findall(joined)),
        "inline code": set(INLINE_CODE.findall(joined)),
        "numbers": set(NUMBER.findall(URL.sub(" ", without_markers))),
    }


def main(before_path, after_path):
    with open(before_path, encoding="utf-8") as f:
        before = f.read()
    with open(after_path, encoding="utf-8") as f:
        after = f.read()

    fm_before, prose_before, fences_before = split(before)
    fm_after, prose_after, fences_after = split(after)
    failed = False

    if fm_before != fm_after:
        print("FAIL frontmatter changed")
        failed = True

    inv_before, inv_after = invariants(prose_before), invariants(prose_after)
    for name, values in inv_before.items():
        missing = sorted(values - inv_after[name])
        if missing:
            print(f"FAIL {name} missing: {missing}")
            failed = True

    if len(fences_before) != len(fences_after):
        print(f"FAIL fenced blocks: {len(fences_before)} before, {len(fences_after)} after")
        failed = True
    else:
        for index, (old, new) in enumerate(zip(fences_before, fences_after), 1):
            if old != new:
                print(f"REVIEW fence {index} ({old[0].strip()}), every changed line must be a comment:")
                for line in difflib.unified_diff(old, new, lineterm="", n=0):
                    if not line.startswith(("---", "+++", "@@")):
                        print(f"  {line}")

    removed = sorted(set(HTML_COMMENT.findall("\n".join(prose_before))) - set(HTML_COMMENT.findall("\n".join(prose_after))))
    for comment in removed:
        print(f"REVIEW HTML comment removed: {comment}")

    print(f"lines {before.count(chr(10))} -> {after.count(chr(10))}, chars {len(before)} -> {len(after)}")
    return 1 if failed else 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    sys.exit(main(sys.argv[1], sys.argv[2]))
