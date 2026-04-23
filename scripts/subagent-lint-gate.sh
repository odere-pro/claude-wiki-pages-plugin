#!/bin/bash
# SubagentStop: quality gate for llm-wiki-lint-fix agent
# Warns if the agent's output indicates unresolved errors

INPUT=$(cat)
AGENT_NAME=$(echo "$INPUT" | jq -r '.agent_name // empty')

# Only gate the lint-fix agent
case "$AGENT_NAME" in
  llm-wiki-lint-fix) ;;
  *) exit 0 ;;
esac

STDOUT=$(echo "$INPUT" | jq -r '.stdout // empty')

# Check for unresolved errors in the agent's output
if echo "$STDOUT" | grep -qiE '(unresolved.*error|error.*unresolved|errors:.*[1-9]|ERROR:)'; then
  echo "QUALITY GATE: llm-wiki-lint-fix agent completed with unresolved errors. Review the report before continuing the pipeline."
fi

exit 0
