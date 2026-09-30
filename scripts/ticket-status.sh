#!/usr/bin/env bash
# Stop hook: shows the ticket roadmap after each reply; silent outside a ticket branch.

input=$(cat)
cwd=$(printf '%s' "$input" | grep -o '"cwd" *: *"[^"]*"' | head -1 | sed -E 's/^"cwd" *: *"//; s/"$//')
[ -n "$cwd" ] || cwd=$PWD

branch=$(git -C "$cwd" --no-optional-locks branch --show-current 2>/dev/null) || exit 0
id=$(printf '%s' "$branch" | sed -nE 's#^[^/]+/([0-9]+)-.*#\1#p')
[ -n "$id" ] || exit 0
root=$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null) || exit 0

# Same bucket rule as the ticket skill: the path comes from the id alone.
n=$((10#$id))
if [ "$n" -lt 100 ]; then
    buckets="0-99"
else
    buckets=""
    p=1
    for _ in $(seq 2 "${#n}"); do p=$((p * 10)); done
    while [ "$p" -ge 100 ]; do
        s=$((n / p * p))
        buckets="$buckets/$s-$((s + p - 1))"
        p=$((p / 10))
    done
    buckets=${buckets#/}
fi

plan=""
for dir in docs/superpowers/plans docs/plans .plans plans; do
    for f in "$root/$dir/$buckets/$id"-*/plan.md "$root/$dir/$id"-*/plan.md; do
        [ -f "$f" ] && { plan=$f; break 2; }
    done
done
[ -n "$plan" ] || exit 0

current=$(grep -m1 -E '^\|[[:space:]]*Current step[[:space:]]*\|' "$plan" | cut -d'|' -f3 | sed -E 's/^ +//; s/ +$//')
num=$(printf '%s' "$current" | sed -nE 's/^([0-9]+).*/\1/p')
detail=$(printf '%s' "$current" | sed -E 's/^[0-9]+,? *//' | tr -d '"\\')

names=(Read Branch Context Grill Code Recette Docs Commit PR Merge)
line="#$id"
for i in "${!names[@]}"; do
    k=$((i + 1))
    if [ "$k" = "$num" ]; then
        line="$line · [$k ${names[$i]}${detail:+: $detail}]"
    else
        line="$line · $k ${names[$i]}"
    fi
done
[ -n "$num" ] || line="$line · ${detail}"

printf '{"systemMessage": "%s"}\n' "$line"
