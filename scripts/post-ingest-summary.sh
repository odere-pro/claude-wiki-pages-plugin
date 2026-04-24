#!/bin/bash
# PostToolUse: after writing a source note in _sources/, remind to log the ingest
# Vault resolved via LLM_WIKI_VAULT, auto-detection, or default (docs/vault)
# and count how many sources exist for progress tracking

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)
VAULT_NAME=$(basename "$VAULT")

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file // empty')

case "$FILE_PATH" in
  */${VAULT_NAME}/wiki/_sources/*) ;;
  *) exit 0 ;;
esac

# Count total sources
PROJECT_DIR=$(echo "$FILE_PATH" | sed "s|/${VAULT_NAME}/wiki/_sources/.*||")
SOURCES_DIR="$PROJECT_DIR/${VAULT_NAME}/wiki/_sources"
COUNT=$(find "$SOURCES_DIR" -maxdepth 1 -name "*.md" -not -name ".gitkeep" 2>/dev/null | wc -l | tr -d ' ')

TITLE=$(echo "$INPUT" | jq -r '.tool_input.content // empty' | grep '^title:' | head -1 | sed 's/^title: *//' | tr -d '"'"'")

echo "Source ingested: ${TITLE:-unknown}. Total sources: ${COUNT}. Remember to append to wiki/log.md and update wiki/index.md."

exit 0
