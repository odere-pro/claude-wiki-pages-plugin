#!/bin/bash
# PostToolUse: after writing a wiki file, check if index.md and _index.md need updating
# Outputs a reminder to stdout which Claude sees as hook feedback

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file // empty')

case "$FILE_PATH" in
  */vault/wiki/*) ;;
  *) exit 0 ;;
esac
case "$FILE_PATH" in
  *.md) ;;
  *) exit 0 ;;
esac

# Skip index.md, log.md, dashboard.md updates (they are the bookkeeping files)
BASENAME=$(basename "$FILE_PATH")
case "$BASENAME" in
  index.md|log.md|dashboard.md|_index.md) exit 0 ;;
esac

# Get the directory this file is in, relative to wiki/
WIKI_DIR=$(echo "$FILE_PATH" | sed 's|.*/vault/wiki/||' | sed 's|/[^/]*$||')

REMINDERS=""

# Check if this file's folder has an _index.md
FOLDER=$(dirname "$FILE_PATH")
case "$FOLDER" in
  *_sources*|*_synthesis*) ;;
  *)
    if [ ! -f "$FOLDER/_index.md" ]; then
      REMINDERS="${REMINDERS}Topic folder $(basename "$FOLDER") has no _index.md — create one. "
    fi
    ;;
esac

# Check if the title appears in index.md
# For Write: extract from content. For Edit: read from the file on disk.
TITLE=$(echo "$INPUT" | jq -r '.tool_input.content // empty' | grep '^title:' | head -1 | sed 's/^title: *//' | tr -d '"'"'")
if [ -z "$TITLE" ] && [ -f "$FILE_PATH" ]; then
  TITLE=$(sed -n '/^---$/,/^---$/{/^title:/{s/^title: *"*//;s/"*$//;p;q;};}' "$FILE_PATH")
fi
if [ -n "$TITLE" ]; then
  PROJECT_DIR=$(echo "$FILE_PATH" | sed 's|/vault/wiki/.*||')
  INDEX="$PROJECT_DIR/vault/wiki/index.md"
  if [ -f "$INDEX" ] && ! grep -qF "$TITLE" "$INDEX" 2>/dev/null; then
    REMINDERS="${REMINDERS}Add [[${TITLE}]] to wiki/index.md. "
  fi
fi

if [ -n "$REMINDERS" ]; then
  echo "$REMINDERS"
fi

exit 0
