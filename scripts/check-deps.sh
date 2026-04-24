#!/bin/bash
# scripts/check-deps.sh — runtime dependency check.
# Used by the SessionStart hook and by /llm-wiki-stack:llm-wiki-status.
#
# Exit 0 = all deps present. Exit 1 = one or more missing.

set -uo pipefail

MISSING=0

red() { printf '\033[0;31mMISSING:\033[0m %s\n' "$1"; }
green() { printf '\033[0;32mOK:\033[0m %s\n' "$1"; }
hint() { printf '        %s\n' "$1"; }

# ─── jq ─────────────────────────────────────────────────────────────────────
if command -v jq >/dev/null 2>&1; then
  green "jq ($(jq --version))"
else
  red "jq"
  case "$(uname -s)" in
    Darwin*) hint "Install: brew install jq" ;;
    Linux*) hint "Install: sudo apt-get install jq  # or your distro equivalent" ;;
    *) hint "Install jq from https://stedolan.github.io/jq/download/" ;;
  esac
  MISSING=$((MISSING + 1))
fi

# ─── bash >= 3.2 ────────────────────────────────────────────────────────────
# macOS ships bash 3.2; the plugin's scripts target that as the floor.
BASH_MAJOR="${BASH_VERSINFO[0]:-0}"
BASH_MINOR="${BASH_VERSINFO[1]:-0}"
if [ "$BASH_MAJOR" -gt 3 ] || { [ "$BASH_MAJOR" -eq 3 ] && [ "$BASH_MINOR" -ge 2 ]; }; then
  green "bash ${BASH_VERSION%%[^0-9.]*}"
else
  red "bash >= 3.2 (found $BASH_VERSION)"
  hint "Upgrade bash to 3.2 or newer"
  MISSING=$((MISSING + 1))
fi

# ─── plugin root ───────────────────────────────────────────────────────────
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-}"
if [ -z "$PLUGIN_ROOT" ]; then
  # Fall back to deriving from this script's location.
  PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi

# ─── hooks/hooks.json readable and parses ───────────────────────────────────
HOOKS_JSON="$PLUGIN_ROOT/hooks/hooks.json"
if [ -r "$HOOKS_JSON" ]; then
  if command -v jq >/dev/null 2>&1 && jq . "$HOOKS_JSON" >/dev/null 2>&1; then
    green "hooks/hooks.json parses"
  else
    red "hooks/hooks.json is not valid JSON ($HOOKS_JSON)"
    MISSING=$((MISSING + 1))
  fi
else
  red "hooks/hooks.json not readable ($HOOKS_JSON)"
  hint "Ensure the plugin is installed and CLAUDE_PLUGIN_ROOT is set, or run from the repo root"
  MISSING=$((MISSING + 1))
fi

# ─── scripts/*.sh executable ────────────────────────────────────────────────
SCRIPTS_DIR="$PLUGIN_ROOT/scripts"
if [ -d "$SCRIPTS_DIR" ]; then
  NON_EXEC=0
  for s in "$SCRIPTS_DIR"/*.sh; do
    [ -e "$s" ] || continue
    if [ ! -x "$s" ]; then
      red "scripts/$(basename "$s") not executable"
      hint "Run: chmod +x $s"
      NON_EXEC=$((NON_EXEC + 1))
    fi
  done
  if [ "$NON_EXEC" -eq 0 ]; then
    green "scripts/*.sh all executable"
  else
    MISSING=$((MISSING + NON_EXEC))
  fi
fi

# ─── summary ────────────────────────────────────────────────────────────────
if [ "$MISSING" -eq 0 ]; then
  exit 0
else
  printf '\n%d dependency issue(s) — fix before running the plugin.\n' "$MISSING" >&2
  exit 1
fi
