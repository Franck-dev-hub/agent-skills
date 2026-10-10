#!/usr/bin/env bash
# Stop hook: shows the ticket roadmap after each reply; silent outside a ticket branch.

input=$(cat)
cwd=$(printf '%s' "$input" | grep -o '"cwd" *: *"[^"]*"' | head -1 | sed -E 's/^"cwd" *: *"//; s/"$//')
[ -n "$cwd" ] || cwd=$PWD

branch=$(git -C "$cwd" --no-optional-locks branch --show-current 2>/dev/null) || exit 0
id=$(printf '%s' "$branch" | sed -nE 's#^[^/]+/(([A-Za-z][A-Za-z0-9_]*-?)?[0-9]+)-.*#\1#p')
[ -n "$id" ] || exit 0
root=$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null) || exit 0

# Matches the ticket folder, not a folder name: plans may live anywhere in the repo, bucketed or flat.
# Two trackers can share an id: the plan whose Branch row names this branch wins.
plan="" first="" count=0 named=0
while IFS= read -r f; do
    count=$((count + 1))
    [ -n "$first" ] || first=$f
    grep -qF "\`$branch\`" "$f" && plan=$f && named=$((named + 1))
done < <(find "$root" -maxdepth 10 -type d \( -name node_modules -o -name vendor -o -name .git -o -name var \) -prune \
    -o -type f -name plan.md -print 2>/dev/null | grep -E "/$id-[^/]*/plan\.md$")
[ "$count" -eq 1 ] && plan=$first
# A hook cannot ask: guessing would show one plan's step while the skill works on another.
if [ "$named" -gt 1 ]; then
    printf '{"systemMessage": "%s"}\n' "$named plans name $branch: run /ticket to pick one"
    exit 0
fi
[ -n "$plan" ] || exit 0

# Accepts `- Current step: 5, task 2/4`, a bare line, bold or a table row.
current=$(grep -m1 -E '^[-*| ]*\**Current step\**[ |:]+' "$plan" | sed -E 's/^[-*| ]*\**Current step\**[ |:]+//; s/[ |]+$//')
num=$(printf '%s' "$current" | sed -nE 's/^([0-9]+).*/\1/p')
detail=$(printf '%s' "$current" | sed -E 's/^[0-9]+[.,:]? *//' | tr -d '"\\')

names=(Read Branch Context Grill Code Recette Docs Commit PR Merge)
# Claude Code greys the message: the reset after the current step leaves the next steps in full colour.
cur='\u001b[1;32m' off='\u001b[0m'
line=""
for i in "${!names[@]}"; do
    k=$((i + 1))
    if [ "$k" = "$num" ]; then
        line="$line  $cur$k ${names[$i]}${detail:+: $detail}$off"
    else
        line="$line  $k ${names[$i]}"
    fi
done
[ -n "$num" ] || line="$line  ${detail}"
line=${line#  }

printf '{"systemMessage": "%s"}\n' "$line"
