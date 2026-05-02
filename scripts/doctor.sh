#!/bin/bash
# scripts/doctor.sh — Health check for llm-wiki-stack.
# Wrapped by the /llm-wiki-stack:wiki-doctor slash command.
#
# Exit codes (catch first failure; do not mask later ones):
#   0  healthy
#   1  vault path unresolvable (no env var, no settings, no auto-detect, default missing)
#   2  vault schema_version absent or unsupported
#   3  raw/ unreadable or wiki/ unwritable
#   4  hooks not executable (hooks/hooks.json references missing/non-+x scripts)
#   5  validate-docs.sh fails (vocabulary drift in plugin prose)

set -uo pipefail

red() { printf '\033[0;31mFAIL[%s]:\033[0m %s — %s\n' "$1" "$2" "$3"; }
green() { printf '\033[0;32mOK:\033[0m %s\n' "$1"; }

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-}"
if [ -z "$PLUGIN_ROOT" ]; then
  PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi

# ─── 1. Vault path resolves ────────────────────────────────────────────────
# shellcheck source=resolve-vault.sh
. "$PLUGIN_ROOT/scripts/resolve-vault.sh"

VAULT="$(resolve_vault)"
if [ -z "$VAULT" ]; then
  red 1 "vault path" "resolve_vault returned empty"
  exit 1
fi

if [ ! -d "$VAULT" ]; then
  # Tier 4 (default) is `docs/vault`. If it doesn't exist either, the user
  # hasn't run the wizard yet — that's a recoverable state, not a failure.
  red 1 "vault path" "$VAULT does not exist (run /llm-wiki-stack:llm-wiki to scaffold)"
  exit 1
fi
green "vault path resolves to $VAULT"

# ─── 2. Schema version present and supported ───────────────────────────────
SCHEMA_FILE="$VAULT/CLAUDE.md"
if [ ! -r "$SCHEMA_FILE" ]; then
  red 2 "schema" "$SCHEMA_FILE not readable"
  exit 2
fi

# Extract schema_version. Matches both `schema_version: 1` (frontmatter form)
# and backticked body-text forms like the example vault uses.
SCHEMA_VERSION="$(grep -oE '`?schema_version`?:[[:space:]]*`?[0-9]+`?' "$SCHEMA_FILE" | head -1 | grep -oE '[0-9]+')"
if [ -z "$SCHEMA_VERSION" ]; then
  red 2 "schema" "schema_version missing in $SCHEMA_FILE"
  exit 2
fi

# Check against plugin manifest's supported list.
PLUGIN_JSON="$PLUGIN_ROOT/.claude-plugin/plugin.json"
if [ -r "$PLUGIN_JSON" ] && command -v jq >/dev/null 2>&1; then
  if ! jq -e --argjson v "$SCHEMA_VERSION" '.supported_schema_versions | index($v)' "$PLUGIN_JSON" >/dev/null 2>&1; then
    red 2 "schema" "schema_version=$SCHEMA_VERSION not in supported list"
    exit 2
  fi
fi
green "schema_version=$SCHEMA_VERSION (supported)"

# ─── 3. raw/ readable, wiki/ writable ──────────────────────────────────────
RAW="$VAULT/raw"
WIKI="$VAULT/wiki"

if [ ! -d "$RAW" ]; then
  red 3 "raw/" "$RAW does not exist"
  exit 3
fi
if [ ! -r "$RAW" ]; then
  red 3 "raw/" "$RAW not readable"
  exit 3
fi
green "raw/ readable at $RAW"

if [ ! -d "$WIKI" ]; then
  red 3 "wiki/" "$WIKI does not exist"
  exit 3
fi
# Probe writability by creating and removing a temp file.
PROBE="$WIKI/.doctor-write-probe-$$"
if ! (touch "$PROBE" 2>/dev/null && rm -f "$PROBE" 2>/dev/null); then
  red 3 "wiki/" "$WIKI not writable"
  exit 3
fi
green "wiki/ writable at $WIKI"

# ─── 4. Hooks executable ───────────────────────────────────────────────────
HOOKS_JSON="$PLUGIN_ROOT/hooks/hooks.json"
if [ ! -r "$HOOKS_JSON" ]; then
  red 4 "hooks" "$HOOKS_JSON not readable"
  exit 4
fi

# Extract every script path referenced by hooks.json.
HOOK_SCRIPTS="$(grep -oE 'scripts/[a-zA-Z0-9_-]+\.sh' "$HOOKS_JSON" | sort -u)"
HOOK_FAIL=0
HOOK_FAIL_NAME=""
for rel in $HOOK_SCRIPTS; do
  abs="$PLUGIN_ROOT/$rel"
  if [ ! -x "$abs" ]; then
    HOOK_FAIL=1
    HOOK_FAIL_NAME="$rel"
    break
  fi
done
if [ "$HOOK_FAIL" -eq 1 ]; then
  red 4 "hooks" "$HOOK_FAIL_NAME not executable (chmod +x $PLUGIN_ROOT/$HOOK_FAIL_NAME)"
  exit 4
fi
green "hooks/hooks.json — every referenced script is +x"

# ─── 5. Vocabulary gate ────────────────────────────────────────────────────
VALIDATE="$PLUGIN_ROOT/scripts/validate-docs.sh"
if [ -x "$VALIDATE" ]; then
  if ! "$VALIDATE" >/dev/null 2>&1; then
    red 5 "validate-docs" "vocabulary drift; run $VALIDATE for details"
    exit 5
  fi
  green "validate-docs.sh clean"
fi

printf '\n\033[0;32mhealthy.\033[0m vault=%s schema=%s\n' "$VAULT" "$SCHEMA_VERSION"
exit 0
