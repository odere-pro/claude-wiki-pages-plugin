#!/bin/bash
# PreToolUse: blocks writes to vault/wiki/ missing required frontmatter
# Usage (CLI): scripts/validate-frontmatter.sh [--target <vault-path>]
# Default target: $CLAUDE_WIKI_PAGES_VAULT (fallback: docs/vault)
# Runs on macOS (BSD) and Linux (GNU)
set -euo pipefail

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

# Returns a plain error message on stdout, or nothing on success.
# U4 (errors-that-teach): reports ALL missing required fields in one message
# and echoes the offending frontmatter block so the author sees the context.
validate_content() {
  local file_path="$1" content="$2"

  if ! echo "$content" | head -1 | grep -q '^---$'; then
    echo 'Missing YAML frontmatter. Every wiki file must start with a --- block.'
    return
  fi

  local frontmatter
  frontmatter=$(echo "$content" | awk 'NR==1 && /^---$/{n++; next} /^---$/{exit} n{print}')

  # Collect ALL missing universal fields before reporting.
  local missing_base=""
  for field in type title; do
    if ! echo "$frontmatter" | grep -q "^${field}:"; then
      missing_base="${missing_base:+${missing_base}, }${field}"
    fi
  done
  if [ -n "$missing_base" ]; then
    printf 'Missing required field(s): %s\n---\n%s\n---' "$missing_base" "$frontmatter"
    return
  fi

  local type
  type=$(echo "$frontmatter" | grep '^type:' | sed 's/^type: *//' | tr -d '"'"'" | xargs)

  local required
  case "$type" in
    source) required="source_type sources created updated status confidence" ;;
    entity) required="entity_type parent path sources created updated status confidence" ;;
    concept) required="parent path sources created updated status confidence" ;;
    topic) required="summary parent path sources created updated status confidence" ;;
    project) required="objective project_status parent path sources created updated status confidence" ;;
    synthesis) required="synthesis_type sources created updated status confidence" ;;
    index) required="aliases created updated" ;;
    manifest) required="created updated" ;;
    log) required="created updated" ;;
    *)
      echo "Unknown type: ${type}. Allowed: source, entity, concept, topic, project, synthesis, index, manifest, log"
      return
      ;;
  esac

  # Collect ALL missing per-type fields before reporting.
  local missing_type=""
  for field in $required; do
    if ! echo "$frontmatter" | grep -q "^${field}:"; then
      missing_type="${missing_type:+${missing_type}, }${field}"
    fi
  done
  if [ -n "$missing_type" ]; then
    printf '%s note missing required field(s): %s\n---\n%s\n---' "$type" "$missing_type" "$frontmatter"
    return
  fi

  # source_format != text requires attachment_path + extracted_at (schema rule).
  if [ "$type" = "source" ]; then
    local fmt
    fmt=$(echo "$frontmatter" | grep '^source_format:' | sed 's/^source_format: *//' | tr -d '"'"'" | xargs || true)
    if [ -n "$fmt" ] && [ "$fmt" != "text" ]; then
      local missing_attach=""
      for field in attachment_path extracted_at; do
        if ! echo "$frontmatter" | grep -q "^${field}:"; then
          missing_attach="${missing_attach:+${missing_attach}, }${field}"
        fi
      done
      if [ -n "$missing_attach" ]; then
        printf 'source note with source_format: %s requires field(s): %s\n---\n%s\n---' \
          "$fmt" "$missing_attach" "$frontmatter"
        return
      fi
    fi
  fi

  case "$type" in
    entity | concept | topic | project | synthesis | index)
      local declared_path wiki_relative expected_path
      declared_path=$(echo "$frontmatter" | grep '^path:' | sed 's/^path: *//' | tr -d '"'"'" | xargs || true)
      if [ -n "$declared_path" ]; then
        wiki_relative=$(echo "$file_path" | sed "s|.*/${VAULT_NAME}/wiki/||")
        expected_path=$(dirname "$wiki_relative")
        [ "$expected_path" = "." ] && expected_path="" || true
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
[ -z "$CONTENT" ] && exit 0 || true

err=$(validate_content "$FILE_PATH" "$CONTENT")
if [ -n "$err" ]; then
  # Encode as a valid JSON string: escape backslashes first, then quotes, then newlines.
  escaped=$(printf '%s' "$err" | sed 's/\\/\\\\/g; s/"/\\"/g' | awk '{printf "%s\\n", $0}' | sed 's/\\n$//')
  echo "{\"decision\":\"block\",\"reason\":\"${escaped}\"}"
fi
exit 0
