#!/usr/bin/env bash
# TrimpsAT PreToolUse guard — block any Edit/Write that INTRODUCES or CHANGES a
# `stringVersion` assignment. game.global.stringVersion is upstream save-compat
# machinery; the fork must never bump it. Reads/comparisons are fine — only new or
# changed assignments (`stringVersion = ...` / `stringVersion: ...`) are blocked.
set -uo pipefail

input=$(cat)
new=$(printf '%s' "$input" | jq -r '.tool_input.new_string // .tool_input.content // ""')
old=$(printf '%s' "$input" | jq -r '.tool_input.old_string // ""')

# Word-boundaried assignment (not `==` comparison, not `oldStringVersion`) to a
# stringVersion property/identifier.
PAT='(^|[^A-Za-z0-9_])stringVersion[[:space:]]*(=[^=]|:)'

new_hits=$(printf '%s\n' "$new" | grep -E "$PAT" | grep -v '^[[:space:]]*$' | sort -u || true)
[ -z "$new_hits" ] && exit 0

old_hits=$(printf '%s\n' "$old" | grep -E "$PAT" | grep -v '^[[:space:]]*$' | sort -u || true)

# Assignment lines present in the new content but not verbatim in the old content
# = a genuine introduction or value change.
introduced=$(comm -23 <(printf '%s\n' "$new_hits") <(printf '%s\n' "$old_hits") | grep -v '^[[:space:]]*$' || true)
[ -z "$introduced" ] && exit 0

REASON="🚫 TrimpsAT invariant: this edit introduces or changes a \`stringVersion\` assignment. game.global.stringVersion is upstream Trimps save-compat machinery — the fork must NEVER bump it (it breaks save-import, the play-shell's whole reason to exist, and bloats the highest-conflict file). It should become upstream's value only via \`git merge upstream/master\` (see the fork-sync skill). If this is a genuine upstream sync, surface it to the user and disable this hook for the operation."

jq -n --arg r "$REASON" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: $r
  }
}'
exit 0
