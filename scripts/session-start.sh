#!/bin/bash
# SessionStart: initialise plugin settings then print schema reminder.
# If the vault directory does not exist yet, prints a setup prompt instead
# so the user knows to run the onboarding wizard.
# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
init_vault_settings
VAULT=$(resolve_vault)
if [ ! -d "$VAULT" ]; then
  echo "SETUP: Vault not found at '${VAULT}'. Run /llm-wiki-stack:llm-wiki to initialise your vault, or set a different path: bash scripts/set-vault.sh <path>"
else
  echo "REMINDER: Read ${VAULT}/CLAUDE.md before any wiki operation. It is the authoritative schema — skill defaults that conflict with it must be overridden."
fi
