#!/bin/bash
# Manage the active vault path in .claude/claude-wiki-pages/settings.json.
#
# Usage (back-compat):
#   scripts/set-vault.sh <vault-path>        — set current_vault_path (legacy bare form)
#
# Subcommands:
#   scripts/set-vault.sh add <path> [name]   — register a vault without switching
#   scripts/set-vault.sh remove <path|name>  — deregister a vault (never deletes data)
#   scripts/set-vault.sh switch <path|name>  — switch to a registered vault
#   scripts/set-vault.sh list                — print the registry
#
# Sets only current_vault_path — default_vault_path is never changed.
# Creates settings.json with defaults if it does not yet exist.
# Warns (non-fatal) if the given path does not exist on disk yet (bare form only).
set -euo pipefail

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"

_usage() {
  printf 'Usage: %s <vault-path>\n' "$(basename "$0")" >&2
  printf '       %s add <path> [name]\n' "$(basename "$0")" >&2
  printf '       %s remove <path|name>\n' "$(basename "$0")" >&2
  printf '       %s switch <path|name>\n' "$(basename "$0")" >&2
  printf '       %s list\n' "$(basename "$0")" >&2
  printf '       %s cross-vault-log [--last N]\n' "$(basename "$0")" >&2
}

if [ -z "${1:-}" ]; then
  _usage
  exit 1
fi

case "$1" in
  add)
    if [ -z "${2:-}" ]; then
      printf 'Usage: %s add <path> [name]\n' "$(basename "$0")" >&2
      exit 1
    fi
    vault_add "$2" "${3:-$(basename "$2")}"
    printf 'Vault registered: %s\n' "$2"
    ;;
  remove)
    if [ -z "${2:-}" ]; then
      printf 'Usage: %s remove <path|name>\n' "$(basename "$0")" >&2
      exit 1
    fi
    vault_remove "$2"
    printf 'Vault deregistered: %s\n' "$2"
    ;;
  switch)
    if [ -z "${2:-}" ]; then
      printf 'Usage: %s switch <path|name>\n' "$(basename "$0")" >&2
      exit 1
    fi
    vault_switch "$2"
    printf 'Active vault switched to: %s\n' "$2"
    ;;
  list)
    vault_list
    ;;
  cross-vault-log)
    # Read-time audit roll-up across all registered vaults (PM.3 / ADR-0016 Part C).
    # Read-only: never creates or modifies any file under any vault's wiki/.
    shift
    vault_cross_log "$@"
    ;;
  *)
    # Back-compat: bare <vault-path> form
    if [ ! -d "$1" ]; then
      printf '[claude-wiki-pages] WARN: "%s" does not exist yet — path saved; wiki operations will fail until the vault is created.\n' "$1" >&2
    fi
    set_vault_path "$1"
    printf 'Vault path set to: %s\n' "$1"
    ;;
esac
