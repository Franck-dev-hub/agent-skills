"""Write or refresh the table of contents of a plan.md, between two <!-- TOC --> markers.

Usage: python3 plan_toc.py <plan.md>
Same marker and slug format as PhpStorm's "Table of Contents" generator, so either can refresh it.
"""
import re
import sys

MARKER = '<!-- TOC -->'


def slug(title: str) -> str:
    title = title.strip().lower()
    title = re.sub(r'[^\w\- ]', '', title)
    return title.replace(' ', '-')


def build(lines: list[str]) -> list[str]:
    toc, seen, fenced = [], {}, False
    for line in lines:
        if line.startswith('```'):
            fenced = not fenced
        match = None if fenced else re.match(r'^(#{1,6}) (.+?)\s*$', line)
        if not match:
            continue
        level, title = len(match.group(1)), match.group(2)
        anchor = slug(title)
        count = seen.get(anchor, 0)
        seen[anchor] = count + 1
        if count:
            anchor = f'{anchor}-{count}'
        label = title.replace('[', '\\[').replace(']', '\\]')
        toc.append(f"{'  ' * (level - 1)}* [{label}](#{anchor})")
    return [MARKER, *toc, MARKER]


def main(path: str) -> None:
    lines = open(path, encoding='utf-8').read().split('\n')
    if MARKER in lines:
        start = lines.index(MARKER)
        end = lines.index(MARKER, start + 1)
        lines[start:end + 1] = build(lines[:start] + lines[end + 1:])
    else:
        first = next(i for i, line in enumerate(lines) if line.startswith('## '))
        lines[first:first] = [*build(lines), '']
    open(path, 'w', encoding='utf-8').write('\n'.join(lines))


main(sys.argv[1])
