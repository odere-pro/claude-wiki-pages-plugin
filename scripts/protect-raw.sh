#!/bin/bash
# PreToolUse: blocks edits to existing files in vault/raw/ (sources are immutable)
# Allows Write to NEW files (adding sources), blocks Edit to existing files

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file // empty')

case "$FILE_PATH" in
  */vault/raw/*) ;;
  *) exit 0 ;;
esac

# Block Edit (modifying existing files). Allow Write (could be new source).
if [ "$TOOL" = "Edit" ]; then
  echo '{"decision":"block","reason":"vault/raw/ is immutable. Source files must not be modified after ingestion. Note corrections in the wiki page instead."}'
  exit 0
fi

# For Write, block if file already exists (overwriting a source)
if [ "$TOOL" = "Write" ] && [ -f "$FILE_PATH" ]; then
  echo '{"decision":"block","reason":"Cannot overwrite existing source in vault/raw/. Sources are immutable once added."}'
  exit 0
fi

exit 0
