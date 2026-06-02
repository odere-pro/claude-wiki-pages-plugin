#!/bin/bash
# SessionStart: initialise plugin settings then print schema reminder.
# If the vault directory does not exist yet, prints a setup prompt instead
# so the user knows to run the onboarding wizard.
# Also surfaces a one-line notice when Bun (the deterministic engine runtime) is
# missing — the plugin still works (bash hooks are unaffected), but the engine
# commands and git-checkpointed self-heal are disabled until Bun is on PATH.
# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
init_vault_settings
VAULT=$(resolve_vault)
if [ ! -d "$VAULT" ]; then
  echo "SETUP: Vault not found at '${VAULT}'. Run /claude-wiki-pages:init to initialise your vault, or set a different path: bash scripts/set-vault.sh <path>"
else
  echo "REMINDER: Read ${VAULT}/CLAUDE.md before any wiki operation. It is the authoritative schema — skill defaults that conflict with it must be overridden."
fi
if ! command -v bun >/dev/null 2>&1; then
  echo "NOTICE: Bun is not installed — the deterministic engine (verify/fix/heal/doctor/config) and git-checkpointed self-heal are disabled; hooks still enforce the schema. Install: curl -fsSL https://bun.sh/install | bash  (then restart the session). See /claude-wiki-pages:doctor."
fi
