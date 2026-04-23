#!/bin/bash
# PreToolUse: blocks writes to vault/wiki/ missing required frontmatter
# Runs on macOS (BSD) and Linux (GNU)

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file // empty')

# Only validate vault wiki files (vault/output/ is plain markdown — not validated)
case "$FILE_PATH" in
  */vault/wiki/*) ;;
  *) exit 0 ;;
esac
case "$FILE_PATH" in
  *.md) ;;
  *) exit 0 ;;
esac

TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')

# For Edit: check if a required frontmatter field is being removed
if [ "$TOOL" = "Edit" ]; then
  OLD=$(echo "$INPUT" | jq -r '.tool_input.old_string // empty')
  NEW=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
  if [ -n "$OLD" ]; then
    for field in type title source_type entity_type synthesis_type parent path sources status confidence created updated; do
      if echo "$OLD" | grep -q "^${field}:" && ! echo "$NEW" | grep -q "^${field}:"; then
        echo "{\"decision\":\"block\",\"reason\":\"Edit removes required frontmatter field: ${field}. Preserve all required fields.\"}"
        exit 0
      fi
    done
  fi
  exit 0
fi

# For Write: validate full content
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
[ -z "$CONTENT" ] && exit 0

# Check frontmatter block exists
if ! echo "$CONTENT" | head -1 | grep -q '^---$'; then
  echo '{"decision":"block","reason":"Missing YAML frontmatter. Every wiki file must start with a --- block."}'
  exit 0
fi

# Extract frontmatter (between first and second --- only)
FRONTMATTER=$(echo "$CONTENT" | awk 'NR==1 && /^---$/{n++; next} /^---$/{exit} n{print}')

# Required on all types: type and title
for field in type title; do
  if ! echo "$FRONTMATTER" | grep -q "^${field}:"; then
    echo "{\"decision\":\"block\",\"reason\":\"Missing required field: ${field}\"}"
    exit 0
  fi
done

TYPE=$(echo "$FRONTMATTER" | grep '^type:' | sed 's/^type: *//' | tr -d '"'"'" | xargs)

# Type-specific required fields
case "$TYPE" in
  source)   REQUIRED="source_type sources created updated status confidence" ;;
  entity)   REQUIRED="entity_type parent path sources created updated status confidence" ;;
  concept)  REQUIRED="parent path sources created updated status confidence" ;;
  synthesis) REQUIRED="synthesis_type sources created updated status confidence" ;;
  index)    REQUIRED="aliases created updated" ;;
  log)      REQUIRED="created updated" ;;
  *)
    echo "{\"decision\":\"block\",\"reason\":\"Unknown type: ${TYPE}. Allowed: source, entity, concept, synthesis, index, log\"}"
    exit 0
    ;;
esac

for field in $REQUIRED; do
  if ! echo "$FRONTMATTER" | grep -q "^${field}:"; then
    echo "{\"decision\":\"block\",\"reason\":\"${TYPE} note missing required field: ${field}\"}"
    exit 0
  fi
done

# Validate path: field matches actual filesystem location (for types that require path)
case "$TYPE" in
  entity|concept|synthesis|index)
    DECLARED_PATH=$(echo "$FRONTMATTER" | grep '^path:' | sed 's/^path: *//' | tr -d '"'"'" | xargs)
    if [ -n "$DECLARED_PATH" ]; then
      # Derive expected path from file location relative to wiki/
      WIKI_RELATIVE=$(echo "$FILE_PATH" | sed 's|.*/vault/wiki/||')
      EXPECTED_PATH=$(dirname "$WIKI_RELATIVE")
      # Normalize: "." means root of wiki
      [ "$EXPECTED_PATH" = "." ] && EXPECTED_PATH=""
      if [ -n "$EXPECTED_PATH" ] && [ "$DECLARED_PATH" != "$EXPECTED_PATH" ]; then
        echo "{\"decision\":\"block\",\"reason\":\"path: field is '${DECLARED_PATH}' but file is in '${EXPECTED_PATH}'. Update path to match actual location.\"}"
        exit 0
      fi
    fi
    ;;
esac

exit 0
