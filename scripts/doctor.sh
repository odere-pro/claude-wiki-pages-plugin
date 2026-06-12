#!/bin/bash
# scripts/doctor.sh — Health check for claude-wiki-pages.
# Wrapped by the /claude-wiki-pages:doctor slash command.
#
# Exit codes (catch first failure; do not mask later ones):
#   0  healthy
#   1  vault path unresolvable (no env var, no settings, no auto-detect, default
#      missing) OR git binary absent (hard dependency since decision #4) OR jq
#      binary absent (the JSON-parsing hooks fail open without it) — all are
#      "environment cannot proceed" failures, so they share exit 1
#   2  vault schema_version absent or unsupported
#   3  raw/ unreadable or wiki/ unwritable
#   4  hooks not executable (hooks/hooks.json references missing/non-+x scripts)
#   5  validate-docs.sh fails (glossary drift in plugin prose)
#
# Note: a vault that is not yet a git repo is WARN/advisory, not fatal (it is
# `doctor --fix`-able via engine.sh) — see §3b.

set -euo pipefail

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
  red 1 "vault path" "$VAULT does not exist (run /claude-wiki-pages:init to scaffold)"
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
SCHEMA_VERSION="$(grep -oE '`?schema_version`?:[[:space:]]*`?[0-9]+`?' "$SCHEMA_FILE" | head -1 | grep -oE '[0-9]+' || true)"
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

# ─── 3b. Git — binary present + vault in a work tree ──────────────────────────
# Parity with TS doctor D05 ("Vault under git"). Exit codes:
#   No new fatal exit code is introduced here. "vault not a repo" is WARN/advisory
#   (matching TS D05 warn + --fix design) so we never hard-fail on it — existing
#   doctor.bats fixtures that do not git-init their vault still pass.
if ! command -v git >/dev/null 2>&1; then
  # git binary absent — hard dependency since decision #4 (TEAM-BRIEF.md §5).
  red 1 "git:" "git binary not found — install git (hard dependency since decision #4)"
  exit 1
fi
green "git: binary present"
# jq pre-flight (review 2026-06-11, fix 4): without jq the JSON-parsing hooks
# (firewall, frontmatter, raw-protect) cannot read the tool-call payload and
# pass writes through UNCHECKED — fail-open, so this is a hard failure.
if ! command -v jq >/dev/null 2>&1; then
  red 1 "jq:" "jq binary not found — schema-enforcing hooks pass writes through unchecked without it. Install: brew install jq (macOS) or sudo apt-get install jq (Linux)"
  exit 1
fi
green "jq: binary present (hooks can parse tool-call JSON)"
if git -C "$VAULT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  green "git: vault is a git repo (self-heal is reversible)"
else
  printf '\033[0;33mNOTE:\033[0m git: vault is not a git repo — run doctor --fix (via engine.sh) to git-init\n'
fi

# ─── 4. Hooks executable ───────────────────────────────────────────────────
HOOKS_JSON="$PLUGIN_ROOT/hooks/hooks.json"
if [ ! -r "$HOOKS_JSON" ]; then
  red 4 "hooks" "$HOOKS_JSON not readable"
  exit 4
fi

# Extract every script path referenced by hooks.json.
HOOK_SCRIPTS="$(grep -oE 'scripts/[a-zA-Z0-9_-]+\.sh' "$HOOKS_JSON" | sort -u || true)"
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

# ─── 5. Glossary gate ────────────────────────────────────────────────────
VALIDATE="$PLUGIN_ROOT/scripts/validate-docs.sh"
if [ -x "$VALIDATE" ]; then
  if ! "$VALIDATE" >/dev/null 2>&1; then
    red 5 "validate-docs" "glossary drift; run $VALIDATE for details"
    exit 5
  fi
  green "validate-docs.sh clean"
fi

# ─── 6. Bun engine (advisory; non-fatal — the plugin degrades without it) ──
if command -v bun >/dev/null 2>&1; then
  green "bun present — deterministic engine available (scripts/engine.sh doctor)"
else
  printf '\033[0;33mNOTE:\033[0m bun not installed — engine commands (verify/fix/heal/doctor/config) and git-checkpointed self-heal are disabled; hooks still work. Install: curl -fsSL https://bun.sh/install | bash\n'
fi

# ─── 7. Obsidian link parity (advisory; parity with TS doctor D11) ─────────
# Asks a running Obsidian for its unresolvedLinks count. Purely advisory:
# silent on CLI absence, eval failure, or unparseable output; never changes
# the exit code (0–5 contract above is untouched).
if command -v obsidian >/dev/null 2>&1 && command -v jq >/dev/null 2>&1; then
  UNRESOLVED_JSON="$(obsidian eval code='JSON.stringify(app.metadataCache.unresolvedLinks)' --vault "$VAULT" 2>/dev/null || true)"
  if [ -n "$UNRESOLVED_JSON" ]; then
    # eval output may be double-encoded (a quoted JSON string); fromjson? both ways.
    UNRESOLVED_COUNT="$(printf '%s' "$UNRESOLVED_JSON" | jq -r 'try (if type == "string" then fromjson else . end | [.[] | length] | add // 0) catch empty' 2>/dev/null || true)"
    if [ -n "$UNRESOLVED_COUNT" ] && [ "$UNRESOLVED_COUNT" -gt 0 ] 2>/dev/null; then
      printf '\033[0;33mNOTE:\033[0m obsidian reports %s unresolved link(s) — run /claude-wiki-pages:lint\n' "$UNRESOLVED_COUNT"
    fi
  fi
fi

printf '\n\033[0;32mhealthy.\033[0m vault=%s schema=%s\n' "$VAULT" "$SCHEMA_VERSION"
exit 0
