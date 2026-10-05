#!/usr/bin/env python3
# Stop hook: adds the turn's time and tokens per step to the ticket's metrics/summary.md; always silent.

import glob
import json
import os
import re
import subprocess
import sys
from datetime import datetime

PRUNED = {"node_modules", "vendor", ".git", "var"}
STEP_NAMES = ("Read", "Branch", "Context", "Grill", "Code", "Recette", "Docs", "Commit", "PR", "Merge")
TOKENS = ("input", "output", "cache_creation", "cache_read")
USAGE_KEYS = {
    "input": "input_tokens",
    "output": "output_tokens",
    "cache_creation": "cache_creation_input_tokens",
    "cache_read": "cache_read_input_tokens",
}


def epoch(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()


def find_plan(root, ticket_id, branch):
    pattern = re.compile(rf"/{ticket_id}-[^/]*/plan\.md$")
    depth = root.count(os.sep)
    found = []
    for base, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in PRUNED]
        if base.count(os.sep) - depth >= 10:
            dirs[:] = []
        path = os.path.join(base, "plan.md")
        if "plan.md" in files and pattern.search(path):
            found.append(path)
    if len(found) > 1:
        # Two trackers can share an id: the plan whose Branch row names this branch wins.
        found = [p for p in found if f"`{branch}`" in open(p, encoding="utf-8").read()]
    # Several plans name the branch: counting on a guess would charge the wrong ticket.
    return found[0] if len(found) == 1 else None


def current_step(plan):
    with open(plan, encoding="utf-8") as f:
        for line in f:
            m = re.match(r"^[-*| ]*\**Current step\**[ |:]+(\d+)", line)
            if m:
                return m.group(1)
    return None


def read_new(path, offset, since=None):
    entries = []
    with open(path, "rb") as f:
        f.seek(offset)
        for raw in f:
            if not raw.endswith(b"\n"):  # line still being written
                break
            offset += len(raw)
            try:
                entry = json.loads(raw)
            except ValueError:
                continue
            if since is None or ("timestamp" in entry and epoch(entry["timestamp"]) >= since):
                entries.append(entry)
    return entries, offset


def is_prompt(entry):
    message = entry.get("message")
    return (
        entry.get("type") == "user"
        and not entry.get("isMeta")
        and not entry.get("isSidechain")
        and isinstance(message, dict)
        and isinstance(message.get("content"), str)
    )


def usage_by_id(entries):
    # One message spans several lines with the same usage: keep one per id.
    usage = {}
    for e in entries:
        m = e.get("message")
        if e.get("type") == "assistant" and isinstance(m, dict) and m.get("id") and m.get("usage"):
            usage[m["id"]] = m["usage"]
    return usage


def count_tokens(usage):
    total = dict.fromkeys(TOKENS, 0)
    for u in usage.values():
        for key, field in USAGE_KEYS.items():
            total[key] += u.get(field) or 0
    return total


def peak_context(usage):
    """Largest context one call read: the cost driver, since each call rereads it."""
    return max((sum(u.get(USAGE_KEYS[k]) or 0 for k in ("input", "cache_creation", "cache_read"))
                for u in usage.values()), default=0)


def model_seconds(entries, start):
    """Time the model ran: from each prompt to the last message before the next one."""
    seconds, begin, last = 0.0, start, None
    for e in entries:
        if e.get("type") not in ("user", "assistant") or "timestamp" not in e:
            continue
        t = epoch(e["timestamp"])
        if is_prompt(e):
            if begin is not None and last is not None:
                seconds += last - begin
            begin, last = t, t
            continue
        if begin is None:
            begin = t
        last = t
    if begin is not None and last is not None:
        seconds += last - begin
    return seconds, last


def first_prompt(entries):
    for e in entries:
        if is_prompt(e) and "timestamp" in e:
            return epoch(e["timestamp"])
    return None


def load(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {"steps": {}, "cursor": {}}


def write(path, text):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(text)
    os.replace(tmp, path)


def fmt_time(seconds):
    seconds = round(seconds)
    hours, rest = divmod(seconds, 3600)
    minutes = rest // 60
    if hours:
        return f"{hours} h {minutes:02d}"
    return f"{minutes} min" if minutes else f"{seconds} s"


def fmt_count(n):
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f} M"
    if n >= 10_000:
        return f"{round(n / 1000)} k"
    return f"{n:,}".replace(",", " ")


def render(steps):
    columns = ("model_s", "session_s", "calls", "peak", *TOKENS, "total")
    header = ("Step", "Model", "Session", "Calls", "Peak context", "Input", "Output", "Cache write", "Cache read", "Total")
    rows = []
    for key in sorted(steps, key=int):
        number = int(key)
        name = STEP_NAMES[number - 1] if 1 <= number <= len(STEP_NAMES) else ""
        rows.append((f"{key} {name}".strip(), *cells(steps[key], columns)))
    sums = {}
    for c in columns:
        known = [s[c] for s in steps.values() if c in s]
        sums[c] = (max(known) if c == "peak" else sum(known)) if known else None
    rows.append(("**Total**", *cells(sums, columns)))
    widths = [max(len(row[i]) for row in (header, *rows)) for i in range(len(header))]
    line = lambda row: "| " + " | ".join(c.ljust(w) for c, w in zip(row, widths)) + " |"
    divider = "|" + "|".join("-" * (w + 2) for w in widths) + "|"
    return "\n".join([line(header), divider, *map(line, rows)]) + "\n"


def cells(values, columns):
    # `-` marks a metric the step was recorded without, such as calls before they were tracked.
    return [
        "-" if values.get(c) is None else fmt_time(values[c]) if c.endswith("_s") else fmt_count(values[c])
        for c in columns
    ]


def main():
    event = json.load(sys.stdin)
    transcript = event.get("transcript_path")
    session = event.get("session_id")
    cwd = event.get("cwd") or os.getcwd()
    if not transcript or not session or not os.path.isfile(transcript):
        return

    branch = subprocess.run(
        ["git", "-C", cwd, "--no-optional-locks", "branch", "--show-current"],
        capture_output=True, text=True,
    ).stdout.strip()
    m = re.match(r"^[^/]+/((?:[A-Za-z][A-Za-z0-9_]*-)?[0-9]+)-", branch)
    root = subprocess.run(
        ["git", "-C", cwd, "rev-parse", "--show-toplevel"], capture_output=True, text=True
    ).stdout.strip()
    if not m or not root:
        return
    plan = find_plan(root, m.group(1), branch)
    step = plan and current_step(plan)
    if not step:
        return

    folder = os.path.join(os.path.dirname(plan), "metrics")
    os.makedirs(folder, exist_ok=True)
    state = os.path.join(folder, "state.json")
    data = load(state)
    # A session's first pass counts only the current turn: earlier steps were not measured.
    fresh = session not in data.setdefault("cursor", {})
    cursor = data["cursor"].setdefault(session, {"files": {}, "last_stop": None})

    since = None
    if fresh:
        every, _ = read_new(transcript, 0)
        stamps = [epoch(e["timestamp"]) for e in every if is_prompt(e) and "timestamp" in e]
        since = max(stamps) if stamps else None

    main_entries, cursor["files"][transcript] = read_new(transcript, cursor["files"].get(transcript, 0), since)
    sub_entries = []
    for sub in sorted(glob.glob(transcript[: -len(".jsonl")] + "/subagents/agent-*.jsonl")):
        new, cursor["files"][sub] = read_new(sub, cursor["files"].get(sub, 0), since)
        sub_entries += new
    if not main_entries and not sub_entries:
        return

    model_s, end = model_seconds(main_entries, cursor["last_stop"])
    if end is None:
        return
    # A session's first stop counts from its first prompt; the pauses between sessions stay out.
    start = cursor["last_stop"] if cursor["last_stop"] is not None else first_prompt(main_entries)
    session_s = end - start if start is not None else 0.0
    cursor["last_stop"] = end

    entry = data.setdefault("steps", {}).setdefault(
        step, dict.fromkeys(("model_s", "session_s", *TOKENS, "total"), 0)
    )
    main_usage = usage_by_id(main_entries)
    usage = {**usage_by_id(sub_entries), **main_usage}
    tokens = count_tokens(usage)
    entry["calls"] = entry.get("calls", 0) + len(usage)
    entry["peak"] = max(entry.get("peak", 0), peak_context(main_usage))
    entry["model_s"] = round(entry["model_s"] + model_s, 1)
    entry["session_s"] = round(entry["session_s"] + session_s, 1)
    for key in TOKENS:
        entry[key] += tokens[key]
    entry["total"] = sum(entry[key] for key in TOKENS)
    write(state, json.dumps(data, indent=2) + "\n")
    write(os.path.join(folder, "summary.md"), render(data["steps"]))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass
    sys.exit(0)
