#!/bin/bash
# SubagentStop: quality gate for llm-wiki-ingest-pipeline agent.
# Runs verify-ingest.sh and warns if the wiki is in a half-written state.

INPUT=$(cat)
AGENT_NAME=$(echo "$INPUT" | jq -r '.agent_name // empty')

case "$AGENT_NAME" in
  llm-wiki-ingest-pipeline) ;;
  *) exit 0 ;;
esac

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
SCRIPT="$PROJECT_DIR/.claude/scripts/verify-ingest.sh"
VAULT="$PROJECT_DIR/vault"

if [ ! -x "$SCRIPT" ] || [ ! -d "$VAULT" ]; then
  exit 0
fi

OUTPUT=$("$SCRIPT" "$VAULT" 2>&1)
EXIT_CODE=$?

if [ "$EXIT_CODE" -ne 0 ]; then
  echo "QUALITY GATE: llm-wiki-ingest-pipeline left the wiki with unresolved issues. verify-ingest.sh exit=${EXIT_CODE}. Run @llm-wiki-lint-fix before continuing." >&2
  # Surface a short summary of the problem lines.
  echo "$OUTPUT" | grep -E '^ERROR:|^WARN:' | head -20 >&2
fi

exit 0
