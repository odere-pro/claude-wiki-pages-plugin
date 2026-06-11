#!/bin/bash
# SessionStart: initialise plugin settings then print schema reminder.
# If the vault directory does not exist yet, prints a setup prompt instead
# so the user knows to run the onboarding wizard.
# Also surfaces a one-line notice when Bun (the deterministic engine runtime) is
# missing — the plugin still works (bash hooks are unaffected), but the engine
# commands and git-checkpointed self-heal are disabled until Bun is on PATH.
#
# Always emits:
#   INDEX: pointer to vault's MOC (wiki/index.md) when it exists — orients the
#          agent at session start without loading MOC content into context.
#   NEXT:  a config-independent suggested next step, derived deterministically
#          from vault filesystem state (no settings.json required).
set -euo pipefail

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
init_vault_settings
VAULT=$(resolve_vault)
# P1.1: Resolve to an absolute canonical path so the REMINDER pointer is never
# relative (e.g. "docs/vault"). Use `cd … && pwd -P` to follow symlinks.
# If the directory does not exist the cd fails, _ABS_VAULT stays empty, and we
# fall into the SETUP branch — no broken pointer is ever emitted.
_ABS_VAULT=""
if [ -d "$VAULT" ]; then
  _ABS_VAULT=$(cd "$VAULT" && pwd -P 2>/dev/null) || true
fi
if [ -z "$_ABS_VAULT" ]; then
  echo "SETUP: Vault not found at '${VAULT}'. Run /claude-wiki-pages:init to initialise your vault, or set a different path: bash scripts/set-vault.sh <path>"
  echo "NEXT: run /claude-wiki-pages:wiki to initialise the vault and follow the onboarding wizard."
else
  VAULT="$_ABS_VAULT"
  echo "REMINDER: Read ${VAULT}/CLAUDE.md before any wiki operation. It is the authoritative schema — skill defaults that conflict with it must be overridden."
  # C4-read: MOC pointer — lets the agent orient to the vault's table of contents
  # without loading its content into context. Emitted only when the file exists.
  if [ -f "${VAULT}/wiki/index.md" ]; then
    echo "INDEX: Vault table of contents is at ${VAULT}/wiki/index.md — read it to orient before any query or ingest."
  fi
  # U3: Config-independent NEXT line — derived from raw/ count; no settings.json needed.
  _raw_pending=0
  if [ -d "${VAULT}/raw" ]; then
    _raw_pending=$(find "${VAULT}/raw" -type f -not -path '*/assets/*' -not -name '.*' 2>/dev/null | wc -l | tr -d ' ')
  fi
  if [ "${_raw_pending}" -gt 0 ]; then
    echo "NEXT: run /claude-wiki-pages:wiki to process ${_raw_pending} pending source(s) in raw/."
  else
    echo "NEXT: run /claude-wiki-pages:wiki to query, ingest, or maintain the vault."
  fi
fi
if ! command -v bun >/dev/null 2>&1; then
  echo "NOTICE: Bun is not installed — the deterministic engine (verify/fix/heal/doctor/config) and git-checkpointed self-heal are disabled; hooks still enforce the schema. Install: curl -fsSL https://bun.sh/install | bash  (then restart the session). See /claude-wiki-pages:doctor."
fi
# jq pre-flight: unlike Bun, jq absence is NOT graceful — the JSON-parsing
# PreToolUse guards (firewall, frontmatter, raw-protect) cannot read the
# tool-call payload and pass writes through unchecked. Surface it loudly.
if ! command -v jq >/dev/null 2>&1; then
  echo "NOTICE: jq is not installed — the schema-enforcing hooks (firewall, frontmatter, raw-protect) cannot parse tool-call JSON and writes pass through unchecked. Install: brew install jq (macOS) or sudo apt-get install jq (Linux), then restart the session. See /claude-wiki-pages:doctor."
fi

# Surface a maintenance catch-up recommendation when enabled (maintenance.enabled).
# Silent no-op by default; never mutates the vault.
bash "$(dirname "$0")/heartbeat.sh" || true
