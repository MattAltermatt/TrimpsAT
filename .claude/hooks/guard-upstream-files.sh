#!/usr/bin/env bash
# TrimpsAT PreToolUse guard (soft) — warn when an Edit/Write targets an upstream game
# monolith or vendored lib. The fork keeps its diff vs Trimps/Trimps.github.io tiny for
# clean merges, so these files should essentially never change here. Non-blocking: the
# edit still runs, but Claude is told to prefer a play-shell override and surface it.
# main.js is intentionally NOT guarded — it holds the fork's sanctioned save-import block.
set -uo pipefail

input=$(cat)
fp=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
[ -z "$fp" ] && exit 0
base=$(basename "$fp")

hit=0
case "$base" in
  config.js|objects.js|updates.js|playerSpire.js|decimal.min.js|lz-string.js) hit=1 ;;
esac
case "$fp" in
  */Playfab/*|Playfab/*) hit=1 ;;
esac
[ "$hit" = "0" ] && exit 0

jq -n --arg f "$base" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    additionalContext: ("⚠️ TrimpsAT fork constraint: \($f) is upstream game code. The fork keeps its diff vs Trimps/Trimps.github.io TINY for clean merges — the only fork-authored files are play/play-shell.js, play/play-shell.css, ~7 lines of index.html, a sanctioned block in main.js, and CHANGELOG.md. Strongly prefer a thin gate/override in play/play-shell.js over editing this upstream file. Proceed only if this is a deliberate upstream sync, and surface it to the user first.")
  }
}'
exit 0
