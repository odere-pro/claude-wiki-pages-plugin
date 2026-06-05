#!/bin/bash
# PreToolUse: blocks writes to vault/wiki/ missing required frontmatter
# Usage (CLI): scripts/validate-frontmatter.sh [--target <vault-path>]
# Default target: $CLAUDE_WIKI_PAGES_VAULT (fallback: docs/vault)
# Runs on macOS (BSD) and Linux (GNU)
#
# Required-field rules are single-sourced from the "### Required fields by type"
# table in a CLAUDE.md schema (ADR-0014 Part A, amended). There is ONE table,
# authored once and mirrored dev↔runtime (docs/vault-example/CLAUDE.md and
# skills/init/template/CLAUDE.md), kept in parity by tests/scripts/ontology-profile.bats.
# Resolution order (first match wins):
#   1. <vault>/CLAUDE.md table — if the heading AND data rows are present.
#   2. The bundled runtime template skills/init/template/CLAUDE.md (script-relative)
#      — if <vault>/CLAUDE.md has no such heading (or no CLAUDE.md). docs/vault-example/
#      is dev-only and not shipped at runtime, so the fallback points at the shipped
#      template. This handles eval fixtures and pre-table vaults. No third inline copy.
# Fail-CLOSED only when a table heading is PRESENT but zero data rows parse
# (malformed table), or the bundled template is unreadable: the gate must never
# silently require nothing. (ADR-0014 §A.6 amended: missing table → fallback.)
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

# ── Schema-table reader (ADR-0014 Part A, amended) ───────────────────────────
# _SCHEMA_FILE: the vault's CLAUDE.md.
_SCHEMA_FILE="${VAULT}/CLAUDE.md"

# _BUNDLED_SCHEMA: the runtime-shipped schema template, used as the fallback
# table source when <vault>/CLAUDE.md has no "### Required fields by type"
# heading (eval fixtures, pre-table vaults, isolated test repos). This is the
# SAME table parser applied to the bundled template — no third inline copy to
# drift. skills/ ships at runtime; docs/vault-example/ does not.
_BUNDLED_SCHEMA="$(dirname "$0")/../skills/init/template/CLAUDE.md"

# _schema_has_table <file>
# Returns 0 (true) if <file> contains the "### Required fields by type" heading.
# Returns 1 otherwise. Safe to call in parent shell (no subshell).
_schema_has_table() {
  local file="$1"
  [ -f "$file" ] && grep -q '^### Required fields by type' "$file" 2>/dev/null
}

# _parse_table_row <file> <want_type>
# Extracts the required-field list for <want_type> from the markdown table.
# Returns empty string if type not found. Assumes heading is present.
_parse_table_row() {
  local file="$1" want_type="$2"
  awk -v want="$want_type" '
    /^### Required fields by type/ { in_table=1; next }
    in_table && /^#{1,6}[[:space:]]/ { exit }
    in_table {
      if ($0 !~ /\|/) next
      if ($0 ~ /Required fields/ || $0 ~ /\|[[:space:]]*-/) next
      n = split($0, cols, "|")
      if (n < 3) next
      col1 = cols[2]; col2 = cols[3]
      gsub(/`/, "", col1); gsub(/^[[:space:]]+|[[:space:]]+$/, "", col1)
      if (col1 == want) {
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", col2)
        gsub(/`/, "", col2)
        print col2; exit
      }
    }
  ' "$file" 2>/dev/null || true
}

# _parse_table_types <file>
# Returns space-separated list of all type keys found in the table.
_parse_table_types() {
  local file="$1"
  [ -f "$file" ] || {
    printf ''
    return 0
  }
  awk '
    /^### Required fields by type/ { in_table=1; next }
    in_table && /^#{1,6}[[:space:]]/ { exit }
    in_table {
      if ($0 !~ /\|/) next
      if ($0 ~ /Required fields/ || $0 ~ /\|[[:space:]]*-/) next
      n = split($0, cols, "|")
      if (n < 3) next
      col1 = cols[2]
      gsub(/`/, "", col1); gsub(/^[[:space:]]+|[[:space:]]+$/, "", col1)
      if (col1 != "") printf "%s ", col1
    }
  ' "$file" 2>/dev/null | sed 's/ $//' || true
}

# _resolve_schema_file
# Returns the schema file to read the required-fields table from:
#   1. <vault>/CLAUDE.md if it carries the heading.
#   2. else the bundled runtime template (_BUNDLED_SCHEMA) if it carries it.
# Prints nothing if neither has the heading (caller fails closed).
_resolve_schema_file() {
  if _schema_has_table "$_SCHEMA_FILE"; then
    printf '%s' "$_SCHEMA_FILE"
  elif _schema_has_table "$_BUNDLED_SCHEMA"; then
    printf '%s' "$_BUNDLED_SCHEMA"
  fi
}

# _table_required_fields <type>
# Returns space-separated required field list for <type>.
# Resolution:
#   1. Vault CLAUDE.md table if present; else the bundled template table.
#   2. A resolved table with ZERO data rows → FAIL CLOSED (malformed).
#   3. Neither vault nor bundled template has the heading → FAIL CLOSED
#      (cannot validate at all; never silently require nothing).
# Prints a FAIL_CLOSED: sentinel and returns 1 on a malformed/absent table.
_table_required_fields() {
  local want_type="$1" schema
  schema=$(_resolve_schema_file)
  if [ -z "$schema" ]; then
    printf 'FAIL_CLOSED:no "### Required fields by type" table in %s or bundled template %s; cannot validate' \
      "$_SCHEMA_FILE" "$_BUNDLED_SCHEMA"
    return 1
  fi
  local all_types
  all_types=$(_parse_table_types "$schema")
  if [ -z "$all_types" ]; then
    printf 'FAIL_CLOSED:required-field table heading found but no data rows parsed in %s; cannot validate' \
      "$schema"
    return 1
  fi
  # Table is well-formed. Return the row (may be empty for an unknown type).
  printf '%s' "$(_parse_table_row "$schema" "$want_type")"
  return 0
}

# _table_allowed_types
# Returns space-separated list of all allowed type keys (for "Unknown type" message).
_table_allowed_types() {
  local schema
  schema=$(_resolve_schema_file)
  [ -n "$schema" ] && _parse_table_types "$schema"
}

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

  # Load required fields from the schema table (ADR-0014: single source of truth).
  local required
  required=$(_table_required_fields "$type") || {
    # Fail-closed: table missing or unreadable.
    printf '%s' "$required"
    return
  }

  # Handle fail-closed sentinel from _table_required_fields.
  case "$required" in
    FAIL_CLOSED:*)
      printf '%s' "${required#FAIL_CLOSED:}"
      return
      ;;
  esac

  if [ -z "$required" ]; then
    # Type not in table — unknown type.
    local allowed_types
    allowed_types=$(_table_allowed_types)
    echo "Unknown type: ${type}. Allowed: ${allowed_types}"
    return
  fi

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
