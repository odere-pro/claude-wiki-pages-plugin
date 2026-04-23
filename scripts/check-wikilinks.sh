#!/bin/bash
# PreToolUse: blocks wiki files that use [text](file.md) instead of [[wikilinks]]

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file // empty')

case "$FILE_PATH" in
  */vault/wiki/*) ;;
  *) exit 0 ;;
esac

# For Edit: check new_string for markdown links
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
if [ "$TOOL" = "Edit" ]; then
  NEW=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
  if [ -n "$NEW" ] && echo "$NEW" | grep -qE '\[.+\]\([^)]+\.md\)'; then
    echo '{"decision":"block","reason":"Edit introduces [text](file.md) links. Use [[Page Title]] wikilinks for Obsidian compatibility."}'
    exit 0
  fi
  exit 0
fi

# For Write: check full content
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
[ -z "$CONTENT" ] && exit 0

# Strip frontmatter before checking (frontmatter may legitimately contain paths)
# BSD sed: '1,/^---$/d' deletes from line 1 through the closing --- (pattern search starts at line 2)
BODY=$(echo "$CONTENT" | sed '1,/^---$/d')

# Strip fenced code blocks (``` ... ```) to avoid false positives on examples
BODY=$(echo "$BODY" | sed '/^```/,/^```/d')

# Check for [text](something.md) but not [text](https://...)
if echo "$BODY" | grep -qE '\[.+\]\([^)]+\.md\)'; then
  echo '{"decision":"block","reason":"Wiki file uses [text](file.md) links. Convert to [[Page Title]] wikilinks for Obsidian compatibility."}'
  exit 0
fi

exit 0
