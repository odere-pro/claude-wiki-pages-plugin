#!/bin/bash
# PreToolUse: blocks writes to vault/wiki/ missing required frontmatter
# Usage (CLI): scripts/validate-frontmatter.sh [--target <vault-path>]
# Default target: $LLM_WIKI_VAULT (fallback: docs/vault)
# Runs on macOS (BSD) and Linux (GNU)

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
validate_content() {
  local file_path="$1" content="$2"

  if ! echo "$content" | head -1 | grep -q '^---$'; then
    echo 'Missing YAML frontmatter. Every wiki file must start with a --- block.'
    return
  fi

  local frontmatter
  frontmatter=$(echo "$content" | awk 'NR==1 && /^---$/{n++; next} /^---$/{exit} n{print}')

  for field in type title; do
    if ! echo "$frontmatter" | grep -q "^${field}:"; then
      echo "Missing required field: ${field}"
      return
    fi
  done

  local type
  type=$(echo "$frontmatter" | grep '^type:' | sed 's/^type: *//' | tr -d '"'"'" | xargs)

  local required
  case "$type" in
    source) required="source_type sources created updated status confidence" ;;
    entity) required="entity_type parent path sources created updated status confidence" ;;
    concept) required="parent path sources created updated status confidence" ;;
    synthesis) required="synthesis_type sources created updated status confidence" ;;
    index) required="aliases created updated" ;;
    log) required="created updated" ;;
    *)
      echo "Unknown type: ${type}. Allowed: source, entity, concept, synthesis, index, log"
      return
      ;;
  esac

  for field in $required; do
    if ! echo "$frontmatter" | grep -q "^${field}:"; then
      echo "${type} note missing required field: ${field}"
      return
    fi
  done

  case "$type" in
    entity | concept | synthesis | index)
      local declared_path wiki_relative expected_path
      declared_path=$(echo "$frontmatter" | grep '^path:' | sed 's/^path: *//' | tr -d '"'"'" | xargs)
      if [ -n "$declared_path" ]; then
        wiki_relative=$(echo "$file_path" | sed "s|.*/${VAULT_NAME}/wiki/||")
        expected_path=$(dirname "$wiki_relative")
        [ "$expected_path" = "." ] && expected_path=""
        if [ -n "$expected_path" ] && [ "$declared_path" != "$expected_path" ]; then
          echo "path: field is '${declared_path}' but file is in '${expected_path}'. Update path to match actual location."
          return
        fi
      fi
      ;;
  esac
}

# ── CLI mode ──────────────────────────────────────────────────────────────────
if [ "$TARGET_SET" -eq 1 ]; then
  WIKI="$VAULT/wiki"
  ERRORS=0

  red() { printf '\033[0;31mERROR: %s\033[0m\n' "$1"; }
  green() { printf '\033[0;32mOK:    %s\033[0m\n' "$1"; }

  while IFS= read -r -d '' file; do
    # Pass wiki-relative path so the path: field check works the same as hook mode
    wiki_rel="${file#${WIKI}/}"
    err=$(validate_content "$wiki_rel" "$(cat "$file")")
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
  printf '\033[0;32mOK:    All frontmatter valid\033[0m\n'
  exit 0
fi

# ── Hook mode (stdin) ─────────────────────────────────────────────────────────
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file // empty')

case "$FILE_PATH" in
  */${VAULT_NAME}/wiki/*) ;;
  *) exit 0 ;;
esac
case "$FILE_PATH" in
  *.md) ;;
  *) exit 0 ;;
esac

TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')

if [ "$TOOL" = "Edit" ]; then
  OLD=$(echo "$INPUT" | jq -r '.tool_input.old_string // empty')
  NEW=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
  if [ -n "$OLD" ]; then
    for field in type title source_type entity_type synthesis_type parent path sources status confidence created updated; do
      if echo "$OLD" | grep -q "^${field}:" && ! echo "$NEW" | grep -q "^${field}:"; then
        echo "{\"decision\":\"block\",\"reason\":\"Edit removes required frontmatter field: ${field}. Preserve all required fields.\"}"
        exit 0
      fi
    done
  fi
  exit 0
fi

CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
[ -z "$CONTENT" ] && exit 0

err=$(validate_content "$FILE_PATH" "$CONTENT")
if [ -n "$err" ]; then
  escaped=$(printf '%s' "$err" | sed 's/"/\\"/g')
  echo "{\"decision\":\"block\",\"reason\":\"${escaped}\"}"
fi
exit 0
