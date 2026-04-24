#!/bin/bash
# PreToolUse: blocks wiki files that use [text](file.md) instead of [[wikilinks]]
# Usage (CLI): scripts/check-wikilinks.sh [--target <vault-path>]
# Default target: $LLM_WIKI_VAULT (fallback: docs/vault)

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)
TARGET_SET=0
while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      VAULT="${2%/}"
      TARGET_SET=1
      shift 2
      ;; # explicit CLI flag overrides auto-detection
    *) shift ;;
  esac
done
VAULT_NAME=$(basename "$VAULT")

# Returns a plain error message on stdout, or nothing on success
check_content() {
  local content="$1"

  # Strip frontmatter (everything through the closing ---)
  local body
  body=$(echo "$content" | sed '1,/^---$/d')

  # Strip fenced code blocks to avoid false positives on examples
  body=$(echo "$body" | sed '/^```/,/^```/d')

  if echo "$body" | grep -qE '\[.+\]\([^)]+\.md\)'; then
    echo 'Wiki file uses [text](file.md) links. Convert to [[Page Title]] wikilinks for Obsidian compatibility.'
  fi
}

# ── CLI mode ──────────────────────────────────────────────────────────────────
if [ "$TARGET_SET" -eq 1 ]; then
  WIKI="$VAULT/wiki"
  ERRORS=0

  red() { printf '\033[0;31mERROR: %s\033[0m\n' "$1"; }
  green() { printf '\033[0;32mOK:    %s\033[0m\n' "$1"; }

  while IFS= read -r -d '' file; do
    err=$(check_content "$(cat "$file")")
    if [ -n "$err" ]; then
      red "$(basename "$file") — $err"
      ERRORS=$((ERRORS + 1))
    else
      green "$(basename "$file")"
    fi
  done < <(find "$WIKI" -name "*.md" -print0 2>/dev/null)

  printf '\n'
  if [ "$ERRORS" -gt 0 ]; then
    printf '\033[0;31mErrors:   %d\033[0m\n' "$ERRORS"
    exit 1
  fi
  printf '\033[0;32mOK:    All wikilinks valid\033[0m\n'
  exit 0
fi

# ── Hook mode (stdin) ─────────────────────────────────────────────────────────
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file // empty')

case "$FILE_PATH" in
  */${VAULT_NAME}/wiki/*) ;;
  *) exit 0 ;;
esac

TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
if [ "$TOOL" = "Edit" ]; then
  NEW=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
  if [ -n "$NEW" ] && echo "$NEW" | grep -qE '\[.+\]\([^)]+\.md\)'; then
    echo '{"decision":"block","reason":"Edit introduces [text](file.md) links. Use [[Page Title]] wikilinks for Obsidian compatibility."}'
    exit 0
  fi
  exit 0
fi

CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
[ -z "$CONTENT" ] && exit 0

err=$(check_content "$CONTENT")
if [ -n "$err" ]; then
  escaped=$(printf '%s' "$err" | sed 's/"/\\"/g')
  echo "{\"decision\":\"block\",\"reason\":\"${escaped}\"}"
fi
exit 0
