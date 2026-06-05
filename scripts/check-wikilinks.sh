#!/bin/bash
# PreToolUse: blocks wiki files that use [text](file.md) instead of [[wikilinks]]
# Usage (CLI): scripts/check-wikilinks.sh [--target <vault-path>]
# Default target: $CLAUDE_WIKI_PAGES_VAULT (fallback: docs/vault)
set -euo pipefail

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)
TARGET_SET=0
JSON_MODE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      VAULT="${2%/}"
      TARGET_SET=1
      shift 2
      ;; # explicit CLI flag overrides auto-detection
    --json)
      JSON_MODE=1
      shift
      ;;
    *) shift ;;
  esac
done
VAULT_NAME=$(basename "$VAULT")

# ── JSON helpers (no jq dependency) ──────────────────────────────────────────
# _json_escape: escape a plain string for embedding in a JSON string value.
_json_escape() {
  printf '%s' "$1" |
    sed 's/\\/\\\\/g; s/"/\\"/g' |
    awk '{printf "%s\\n", $0}' |
    sed 's/\\n$//'
}

# _json_finding_with_file: emit one Finding JSON object with a file field.
# $1=severity  $2=check  $3=message  $4=file
_json_finding_with_file() {
  local sev check msg file
  sev=$(_json_escape "$1")
  check=$(_json_escape "$2")
  msg=$(_json_escape "$3")
  file=$(_json_escape "$4")
  printf '{"severity":"%s","check":"%s","message":"%s","file":"%s"}' \
    "$sev" "$check" "$msg" "$file"
}

# Returns a plain error message on stdout, or nothing on success.
# U4 (errors-that-teach): includes the specific offending fragment so the
# author can locate the line without a separate grep.
check_content() {
  local content="$1"

  # Strip frontmatter (everything through the closing ---)
  local body
  body=$(echo "$content" | sed '1,/^---$/d')

  # Strip fenced code blocks to avoid false positives on examples
  body=$(echo "$body" | sed '/^```/,/^```/d')

  local offending
  offending=$(echo "$body" | grep -oE '\[.+\]\([^)]+\.md\)' | head -1 || true)
  if [ -n "$offending" ]; then
    echo "Wiki file uses [text](file.md) links (e.g. ${offending}). Convert to [[Page Title]] wikilinks for Obsidian compatibility."
  fi
}

# ── CLI mode ──────────────────────────────────────────────────────────────────
if [ "$TARGET_SET" -eq 1 ]; then
  WIKI="$VAULT/wiki"
  ERRORS=0

  # Validate the vault directory exists (exit 2 for bad args).
  if [ ! -d "$WIKI" ]; then
    if [ "$JSON_MODE" -eq 1 ]; then
      printf '{"findings":[]}\n'
    fi
    exit 2
  fi

  if [ "$JSON_MODE" -eq 1 ]; then
    # ── JSON mode: collect findings[], emit envelope, exit 0/1 ──────────────
    FINDINGS_JSON=""
    FINDING_SEP=""

    while IFS= read -r -d '' file; do
      wiki_rel="${file#${WIKI}/}"
      err=$(check_content "$(cat "$file")")
      if [ -n "$err" ]; then
        finding=$(_json_finding_with_file "error" "wikilinks" "$err" "$wiki_rel")
        FINDINGS_JSON="${FINDINGS_JSON}${FINDING_SEP}${finding}"
        FINDING_SEP=","
        ERRORS=$((ERRORS + 1))
      fi
    done < <(find "$WIKI" -name "*.md" -print0 2>/dev/null)

    printf '{"findings":[%s]}\n' "$FINDINGS_JSON"
    if [ "$ERRORS" -gt 0 ]; then
      exit 1
    fi
    exit 0
  fi

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
  if [ -n "$NEW" ]; then
    local_frag=$(echo "$NEW" | grep -oE '\[.+\]\([^)]+\.md\)' | head -1 || true)
    if [ -n "$local_frag" ]; then
      escaped_frag=$(printf '%s' "$local_frag" | sed 's/"/\\"/g')
      echo "{\"decision\":\"block\",\"reason\":\"Edit introduces [text](file.md) links (e.g. ${escaped_frag}). Use [[Page Title]] wikilinks for Obsidian compatibility.\"}"
      exit 0
    fi
  fi
  exit 0
fi

CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
[ -z "$CONTENT" ] && exit 0 || true

err=$(check_content "$CONTENT")
if [ -n "$err" ]; then
  escaped=$(printf '%s' "$err" | sed 's/"/\\"/g')
  echo "{\"decision\":\"block\",\"reason\":\"${escaped}\"}"
fi
exit 0
