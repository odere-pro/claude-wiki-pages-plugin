#!/bin/bash
# PostToolUse: after writing a wiki file, check if index.md and _index.md need updating
# Vault resolved via CLAUDE_WIKI_PAGES_VAULT, auto-detection, or default (docs/vault)
# Outputs a reminder to stdout which Claude sees as hook feedback
set -euo pipefail

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)
VAULT_NAME=$(basename "$VAULT")

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file // empty')

case "$FILE_PATH" in
  */${VAULT_NAME}/wiki/*) ;;
  *) exit 0 ;;
esac
case "$FILE_PATH" in
  *.md) ;;
  *) exit 0 ;;
esac

# Skip index.md, log.md, dashboard.md updates (they are the bookkeeping files)
BASENAME=$(basename "$FILE_PATH")
case "$BASENAME" in
  index.md | log.md | dashboard.md | _index.md) exit 0 ;;
esac

FOLDER=$(dirname "$FILE_PATH")
FOLDER_NAME=$(basename "$FOLDER")
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')

# Folder note (schema v3): stem equals the parent folder name AND frontmatter
# declares `type: index` — bookkeeping, same as legacy _index.md.
_fn_type_index() { grep -Eq '^type:[[:space:]]*["'\'']?index["'\'']?[[:space:]]*$' "$@"; }
if [ "${BASENAME%.md}" = "$FOLDER_NAME" ]; then
  if printf '%s\n' "$CONTENT" | _fn_type_index - ||
    { [ -f "$FILE_PATH" ] && _fn_type_index "$FILE_PATH"; }; then
    exit 0
  fi
fi

REMINDERS=""

# Check if this file's folder has an index file (folder note or legacy _index.md)
case "$FOLDER" in
  *_sources* | *_synthesis*) ;;
  *)
    if [ ! -f "$FOLDER/_index.md" ] &&
      ! { [ -f "$FOLDER/$FOLDER_NAME.md" ] && _fn_type_index "$FOLDER/$FOLDER_NAME.md"; }; then
      REMINDERS="${REMINDERS}Topic folder $FOLDER_NAME has no index file — create the folder note $FOLDER_NAME/$FOLDER_NAME.md. "
    fi
    ;;
esac

# Check if the title appears in index.md
# For Write: extract from content. For Edit: read from the file on disk.
TITLE=$(echo "$INPUT" | jq -r '.tool_input.content // empty' | grep '^title:' | head -1 | sed 's/^title: *//' | tr -d '"'"'") || true
if [ -z "$TITLE" ] && [ -f "$FILE_PATH" ]; then
  TITLE=$(sed -n '/^---$/,/^---$/{/^title:/{s/^title: *"*//;s/"*$//;p;q;};}' "$FILE_PATH")
fi
if [ -n "$TITLE" ]; then
  PROJECT_DIR=$(echo "$FILE_PATH" | sed "s|/${VAULT_NAME}/wiki/.*||")
  INDEX="$PROJECT_DIR/${VAULT_NAME}/wiki/index.md"
  if [ -f "$INDEX" ] && ! grep -qF "$TITLE" "$INDEX" 2>/dev/null; then
    REMINDERS="${REMINDERS}Add [[${TITLE}]] to wiki/index.md. "
  fi
fi

if [ -n "$REMINDERS" ]; then
  echo "$REMINDERS"
fi

exit 0
