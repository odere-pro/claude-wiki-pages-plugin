#!/bin/bash
# PreToolUse: blocks edits to existing files in <vault>/raw/ (sources are immutable)
# Vault resolved via CLAUDE_WIKI_PAGES_VAULT, auto-detection, or default (docs/vault)
# Allows Write to NEW files (adding sources), blocks Edit to existing files
set -euo pipefail

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)
VAULT_NAME=$(basename "${VAULT}")

INPUT=$(cat)
TOOL=$(echo "${INPUT}" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "${INPUT}" | jq -r '.tool_input.file_path // .tool_input.file // empty')

# No target path — nothing to guard.
[ -n "${FILE_PATH}" ] || exit 0

# Canonicalize before the boundary check so a traversal (raw/../..) or a symlink
# cannot slip past the glob. The target may not exist yet (Write of a new source),
# so resolve the directory and re-append the basename instead of requiring the
# whole path to exist. Runs in this command-substitution subshell, so the `cd`
# does not affect the caller.
canonicalize() {
  local target="$1" dir base resolved
  dir=$(dirname "${target}")
  base=$(basename "${target}")
  if cd "${dir}" 2>/dev/null; then
    resolved=$(pwd -P)
    printf '%s/%s\n' "${resolved}" "${base}"
  else
    printf '%s\n' "${target}"
  fi
}
CANONICAL_PATH=$(canonicalize "${FILE_PATH}")

# Default-deny: if the vault name cannot be resolved, do NOT let the boundary glob
# degenerate to */ /raw/* (which would silently match nothing and disable the gate).
# Fall back to guarding any */raw/* segment instead.
if [ -n "${VAULT_NAME}" ]; then
  case "${CANONICAL_PATH}" in
    */"${VAULT_NAME}"/raw/*) ;;
    *) exit 0 ;;
  esac
else
  case "${CANONICAL_PATH}" in
    */raw/*) ;;
    *) exit 0 ;;
  esac
fi

LABEL="${VAULT_NAME:-vault}/raw/"

# Block Edit (modifying existing files). Allow Write (could be new source).
if [ "${TOOL}" = "Edit" ]; then
  echo "{\"decision\":\"block\",\"reason\":\"${LABEL} is immutable. Source files must not be modified after ingestion. Note corrections in the wiki page instead.\"}"
  exit 0
fi

# For Write, block if file already exists (overwriting a source)
if [ "${TOOL}" = "Write" ] && [ -f "${CANONICAL_PATH}" ]; then
  echo "{\"decision\":\"block\",\"reason\":\"Cannot overwrite existing source in ${LABEL}. Sources are immutable once added.\"}"
  exit 0
fi

exit 0
