#!/bin/bash
# PreToolUse: blocks edits to existing files in <vault>/raw/ (sources are immutable)
# Vault resolved via LLM_WIKI_VAULT, auto-detection, or default (docs/vault)
# Allows Write to NEW files (adding sources), blocks Edit to existing files

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)
VAULT_NAME=$(basename "$VAULT")

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file // empty')

case "$FILE_PATH" in
  */${VAULT_NAME}/raw/*) ;;
  *) exit 0 ;;
esac

# Block Edit (modifying existing files). Allow Write (could be new source).
if [ "$TOOL" = "Edit" ]; then
  echo "{\"decision\":\"block\",\"reason\":\"${VAULT_NAME}/raw/ is immutable. Source files must not be modified after ingestion. Note corrections in the wiki page instead.\"}"
  exit 0
fi

# For Write, block if file already exists (overwriting a source)
if [ "$TOOL" = "Write" ] && [ -f "$FILE_PATH" ]; then
  echo "{\"decision\":\"block\",\"reason\":\"Cannot overwrite existing source in ${VAULT_NAME}/raw/. Sources are immutable once added.\"}"
  exit 0
fi

exit 0
