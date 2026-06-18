#!/bin/bash
# PreToolUse: blocks wiki files that use [text](file.md) instead of [[wikilinks]]
# Usage (CLI): scripts/check-wikilinks.sh [--target <vault-path>] [--json]
# Default target: $CLAUDE_WIKI_PAGES_VAULT (fallback: docs/vault)
#
# CLI half: thin wrapper delegating to `engine lint --check md-links`
#   (migrated from inline bash to the Bun engine; see tmp/migration-plan.md §Phase 1).
# Hook half: PreToolUse stdin-JSON path stays in bash until Phase 3.
set -euo pipefail

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)
TARGET_SET=0

# Scan original args to determine mode (do not consume them — pass $@ through).
ARGS=("$@")
i=0
while [ $i -lt ${#ARGS[@]} ]; do
  case "${ARGS[$i]}" in
    --target)
      i=$((i + 1))
      VAULT="${ARGS[$i]%/}"
      TARGET_SET=1
      ;;
    *) ;;
  esac
  i=$((i + 1))
done

# ── CLI mode: delegate to the Bun engine ─────────────────────────────────────
# When called with --target, forward all original arguments to the engine.
# The engine recognises --target, --json; other flags are silently ignored.
# Output shape and exit codes are compatible with the original bash behaviour:
#   exit 0 = clean, exit 1 = violations found, exit 2 = bad args (vault absent).
#
# Pre-check: validate the vault's wiki/ directory exists before delegating.
# The engine returns exit 0 with empty findings for a nonexistent vault
# (listMarkdownRecursive returns [] when the dir is absent), which would silently
# succeed on a bad --target path. The old bash CLI half exited 2 in this case
# (scripts/check-wikilinks.sh:106 in the pre-migration committed HEAD), so we
# preserve that contract here to keep json-envelope.bats test 301 green.
if [ "$TARGET_SET" -eq 1 ]; then
  if [ ! -d "$VAULT/wiki" ]; then
    exit 2
  fi
  exec bash "$(dirname "$0")/engine.sh" lint --check md-links --target "$VAULT" "$@"
fi

# ── Hook mode (stdin) — stays in bash until Phase 3 ──────────────────────────
# Reads the PreToolUse tool-call JSON from stdin, blocks wiki writes that
# introduce [text](file.md) links. Never emits a block decision for non-wiki
# files. Must always exit 0 (non-zero = harness error).

VAULT_NAME=$(basename "$VAULT")

# ── JSON helpers (no jq dependency) ──────────────────────────────────────────
# _json_escape: escape a plain string for embedding in a JSON string value.
# Escapes: backslash → \\, double-quote → \", newline → \n, tab → \t,
# carriage-return → \r, backspace → \b, form-feed → \f, and any remaining
# C0 control character (0x01-0x1F) → \uXXXX (lowercase hex).
# This satisfies RFC 8259 §7 which forbids unescaped control chars in strings.
_json_escape() {
  printf '%s' "$1" | LC_ALL=C awk '
  BEGIN {
    ORS = ""
    # Build ord[] table: ord[char] = decimal byte value for all 256 bytes.
    for (i = 0; i <= 255; i++) {
      c = sprintf("%c", i)
      ord[c] = i
    }
  }
  {
    n = split($0, chars, "")
    for (i = 1; i <= n; i++) {
      c = chars[i]
      o = ord[c]
      if      (c == "\\") { printf "%s", "\\\\" }
      else if (c == "\"") { printf "%s", "\\\"" }
      else if (o ==  8)   { printf "%s", "\\b"  }
      else if (o ==  9)   { printf "%s", "\\t"  }
      else if (o == 12)   { printf "%s", "\\f"  }
      else if (o == 13)   { printf "%s", "\\r"  }
      else if (o >= 1 && o <= 31) { printf "\\u%04x", o }
      else { printf "%s", c }
    }
    # awk splits on RS (newline by default); emit \n between input lines
    printf "%s", "\\n"
  }
  ' | sed 's/\\n$//'
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
      escaped_frag=$(_json_escape "$local_frag")
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
  escaped=$(_json_escape "$err")
  echo "{\"decision\":\"block\",\"reason\":\"${escaped}\"}"
fi
exit 0
