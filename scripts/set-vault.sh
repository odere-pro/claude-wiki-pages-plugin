#!/bin/bash
# Update current_vault_path in .claude/llm-wiki-stack/settings.json.
# Usage: scripts/set-vault.sh <vault-path>
#
# Sets only current_vault_path — default_vault_path is never changed.
# Creates settings.json with defaults if it does not yet exist.
# Warns (non-fatal) if the given path does not exist on disk yet.
#
# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"

if [ -z "${1:-}" ]; then
  printf 'Usage: %s <vault-path>\n' "$(basename "$0")" >&2
  exit 1
fi

if [ ! -d "$1" ]; then
  printf '[llm-wiki-stack] WARN: "%s" does not exist yet — path saved; wiki operations will fail until the vault is created.\n' "$1" >&2
fi

set_vault_path "$1"
printf 'Vault path set to: %s\n' "$1"
