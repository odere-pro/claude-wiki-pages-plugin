#!/usr/bin/env bash
# enforce-dmi.sh — PreToolUse enforcement for skill:side-effecting-no-dmi
#
# Blocks writes to skills/*/SKILL.md when the file contains side-effecting
# verbs (scaffold/deploy/commit/push/publish/release/delete/post/write) in the
# body but does NOT carry `disable-model-invocation: true` in frontmatter.
#
# Exit codes: 0 = pass, 2 = block (Claude treats 2 as a hard block).

set -euo pipefail

# Read tool input from stdin (Claude passes it as JSON).
INPUT=$(cat)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FILE_PATH=$(printf '%s' "$INPUT" | bun "$SCRIPT_DIR/json-tool.ts" field tool_input.file_path 2>/dev/null || true)

# Only apply to skills/*/SKILL.md paths.
if [[ "$FILE_PATH" != */skills/*/SKILL.md ]]; then
  exit 0
fi

# The file may not exist yet (new write) — check content from tool_input.
CONTENT=$(printf '%s' "$INPUT" | bun "$SCRIPT_DIR/json-tool.ts" field tool_input.content 2>/dev/null || true)

# If content is empty (Edit call with old_string/new_string), read file from disk.
if [[ -z "$CONTENT" && -f "$FILE_PATH" ]]; then
  CONTENT=$(cat "$FILE_PATH")
fi

if [[ -z "$CONTENT" ]]; then
  exit 0
fi

# Check for disable-model-invocation: true in frontmatter.
HAS_DMI=$(printf '%s' "$CONTENT" | grep -c 'disable-model-invocation:[[:space:]]*true' || true)
if [[ "$HAS_DMI" -gt 0 ]]; then
  exit 0
fi

# Check for side-effecting verbs in the body (after the closing --- of frontmatter).
BODY=$(printf '%s' "$CONTENT" | awk '/^---/{n++; if(n==2){found=1; next}} found{print}')
if [[ -z "$BODY" ]]; then
  BODY="$CONTENT"
fi

SIDE_EFFECTING=$(printf '%s' "$BODY" | grep -ciE '\b(scaffold|deploy|commit|push|publish|release|delete|post|writes?|creates?|overwrites?)\b' || true)

if [[ "$SIDE_EFFECTING" -gt 0 ]]; then
  echo "[enforce-dmi] BLOCKED: $FILE_PATH contains side-effecting verbs but is missing 'disable-model-invocation: true' in frontmatter." >&2
  echo "[enforce-dmi] Add 'disable-model-invocation: true' to the SKILL.md frontmatter before this edit." >&2
  exit 2
fi

exit 0
