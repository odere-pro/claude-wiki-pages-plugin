#!/bin/bash
# PreToolUse: blocks writes to vault/wiki/_sources/ when source_format != text
# but attachment_path is missing or the referenced file does not exist.

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)
VAULT_NAME=$(basename "$VAULT")

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file // empty')

# Only validate source notes
case "$FILE_PATH" in
  */${VAULT_NAME}/wiki/_sources/*.md) ;;
  *) exit 0 ;;
esac

TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Resolve vault root (the parent of wiki/).
VAULT_ROOT=$(echo "$FILE_PATH" | sed 's|/wiki/_sources/.*||')

# Extract the frontmatter block that will be on disk after the operation.
# For Write: use the tool_input content.
# For Edit: read the existing file (the edit has not been applied yet), then
# apply old_string → new_string in memory so we validate the post-edit state.
CONTENT=""
if [ "$TOOL" = "Write" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
elif [ "$TOOL" = "Edit" ]; then
  [ -f "$FILE_PATH" ] || exit 0
  OLD=$(echo "$INPUT" | jq -r '.tool_input.old_string // empty')
  NEW=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
  ORIG=$(cat "$FILE_PATH")
  if [ -n "$OLD" ]; then
    # Literal replace using awk to avoid regex surprises in sed.
    CONTENT=$(printf '%s' "$ORIG" | awk -v o="$OLD" -v n="$NEW" '
      BEGIN { RS = "\0" }
      { sub(o, n); printf "%s", $0 }
    ')
  else
    CONTENT="$ORIG"
  fi
else
  exit 0
fi

[ -z "$CONTENT" ] && exit 0

# Extract frontmatter (between first pair of ---)
FRONTMATTER=$(echo "$CONTENT" | awk 'NR==1 && /^---$/{n++; next} /^---$/{exit} n{print}')
[ -z "$FRONTMATTER" ] && exit 0

SOURCE_FORMAT=$(echo "$FRONTMATTER" | grep '^source_format:' | sed 's/^source_format: *//' | tr -d '"'"'" | xargs)

# Default is text — nothing to enforce.
if [ -z "$SOURCE_FORMAT" ] || [ "$SOURCE_FORMAT" = "text" ]; then
  exit 0
fi

ATTACHMENT_PATH=$(echo "$FRONTMATTER" | grep '^attachment_path:' | sed 's/^attachment_path: *//' | tr -d '"'"'" | xargs)

if [ -z "$ATTACHMENT_PATH" ]; then
  echo "{\"decision\":\"block\",\"reason\":\"source note has source_format: ${SOURCE_FORMAT} but no attachment_path. Add attachment_path pointing to the file under raw/assets/.\"}"
  exit 0
fi

# Resolve attachment relative to the vault root.
ABS_ATTACHMENT="$VAULT_ROOT/$ATTACHMENT_PATH"

if [ ! -f "$ABS_ATTACHMENT" ]; then
  echo "{\"decision\":\"block\",\"reason\":\"attachment_path '${ATTACHMENT_PATH}' does not exist at ${ABS_ATTACHMENT}. Add the file to raw/assets/ before writing the source note.\"}"
  exit 0
fi

exit 0
