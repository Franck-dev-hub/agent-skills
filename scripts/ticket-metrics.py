#!/usr/bin/env python3
# Stop hook: adds the turn's time and tokens to the ticket's metrics.json, per step; always silent.

import glob
import json
import os
import re
import subprocess
import sys
from datetime import datetime

PRUNED = {"node_modules", "vendor", ".git", "var"}
TOKENS = ("input", "output", "cache_creation", "cache_read")
USAGE_KEYS = {
    "input": "input_tokens",
    "output": "output_tokens",
    "cache_creation": "cache_creation_input_tokens",
    "cache_read": "cache_read_input_tokens",
}


def epoch(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()


def find_plan(root, ticket_id):
    pattern = re.compile(rf"/{ticket_id}-[^/]*/plan\.md$")
    depth = root.count(os.sep)
    for base, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in PRUNED]
        if base.count(os.sep) - depth >= 10:
            dirs[:] = []
        path = os.path.join(base, "plan.md")
        if "plan.md" in files and pattern.search(path):
            return path
    return None


def current_step(plan):
    with open(plan, encoding="utf-8") as f:
        for line in f:
            m = re.match(r"^[-*| ]*\**Current step\**[ |:]+(\d+)", line)
            if m:
                return m.group(1)
    return None


def read_new(path, offset):
    entries = []
    with open(path, "rb") as f:
        f.seek(offset)
        for raw in f:
            if not raw.endswith(b"\n"):  # line still being written
                break
            offset += len(raw)
            try:
                entries.append(json.loads(raw))
            except ValueError:
                pass
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


def count_tokens(entries):
    # One message spans several lines with the same usage: keep one per id.
    usage = {}
    for e in entries:
        m = e.get("message")
        if e.get("type") == "assistant" and isinstance(m, dict) and m.get("id") and m.get("usage"):
            usage[m["id"]] = m["usage"]
    total = dict.fromkeys(TOKENS, 0)
    for u in usage.values():
        for key, field in USAGE_KEYS.items():
            total[key] += u.get(field) or 0
    return total


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
        return {"total": {}, "steps": {}, "cursor": {}}


def save(path, data):
    steps = data["steps"].values()
    data["total"] = {k: round(sum(s.get(k, 0) for s in steps), 1) for k in next(iter(steps)).keys()}
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    os.replace(tmp, path)


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
    m = re.match(r"^[^/]+/(\d+)-", branch)
    root = subprocess.run(
        ["git", "-C", cwd, "rev-parse", "--show-toplevel"], capture_output=True, text=True
    ).stdout.strip()
    if not m or not root:
        return
    plan = find_plan(root, m.group(1))
    step = plan and current_step(plan)
    if not step:
        return

    path = os.path.join(os.path.dirname(plan), "metrics.json")
    data = load(path)
    cursor = data.setdefault("cursor", {}).setdefault(session, {"files": {}, "last_stop": None})

    main_entries, cursor["files"][transcript] = read_new(transcript, cursor["files"].get(transcript, 0))
    sub_entries = []
    for sub in sorted(glob.glob(transcript[: -len(".jsonl")] + "/subagents/agent-*.jsonl")):
        new, cursor["files"][sub] = read_new(sub, cursor["files"].get(sub, 0))
        sub_entries += new
    if not main_entries and not sub_entries:
        return

    model_s, end = model_seconds(main_entries, cursor["last_stop"])
    if end is None:
        return
    # A session's first stop counts from its first prompt; the pauses between sessions stay out.
    since = cursor["last_stop"] if cursor["last_stop"] is not None else first_prompt(main_entries)
    session_s = end - since if since is not None else 0.0
    cursor["last_stop"] = end

    entry = data.setdefault("steps", {}).setdefault(
        step, dict.fromkeys(("model_s", "session_s", *TOKENS, "total"), 0)
    )
    tokens = count_tokens(main_entries + sub_entries)
    entry["model_s"] = round(entry["model_s"] + model_s, 1)
    entry["session_s"] = round(entry["session_s"] + session_s, 1)
    for key in TOKENS:
        entry[key] += tokens[key]
    entry["total"] = sum(entry[key] for key in TOKENS)
    save(path, data)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass
    sys.exit(0)
