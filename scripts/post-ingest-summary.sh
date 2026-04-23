#!/bin/bash
# PostToolUse: after writing a source note in _sources/, remind to log the ingest
# and count how many sources exist for progress tracking

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file // empty')

case "$FILE_PATH" in
  */vault/wiki/_sources/*) ;;
  *) exit 0 ;;
esac

# Count total sources
PROJECT_DIR=$(echo "$FILE_PATH" | sed 's|/vault/wiki/_sources/.*||')
SOURCES_DIR="$PROJECT_DIR/vault/wiki/_sources"
COUNT=$(find "$SOURCES_DIR" -maxdepth 1 -name "*.md" -not -name ".gitkeep" 2>/dev/null | wc -l | tr -d ' ')

TITLE=$(echo "$INPUT" | jq -r '.tool_input.content // empty' | grep '^title:' | head -1 | sed 's/^title: *//' | tr -d '"'"'")

echo "Source ingested: ${TITLE:-unknown}. Total sources: ${COUNT}. Remember to append to wiki/log.md and update wiki/index.md."

exit 0
