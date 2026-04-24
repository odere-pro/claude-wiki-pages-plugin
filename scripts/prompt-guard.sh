#!/bin/bash
# UserPromptSubmit: warn about common mistakes in user prompts
# Vault resolved via LLM_WIKI_VAULT, auto-detection, or default (docs/vault)
# Non-blocking — outputs warnings but never blocks the prompt

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)
VAULT_NAME=$(basename "$VAULT")

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty')

[ -z "$PROMPT" ] && exit 0

WARNINGS=""

# Warn if user asks to edit/modify raw files
if echo "$PROMPT" | grep -qiE "(edit|modify|change|update|fix|correct)\b.*(${VAULT_NAME}/raw|raw/|raw source|source file)"; then
  WARNINGS="${WARNINGS}WARNING: ${VAULT_NAME}/raw/ files are immutable. Corrections belong in wiki pages, not raw sources.\n"
fi

# Warn if user asks to delete wiki pages
if echo "$PROMPT" | grep -qiE '(delete|remove|drop)\b.*(wiki page|wiki note|from wiki)'; then
  WARNINGS="${WARNINGS}WARNING: Prefer deprecating wiki pages (status: superseded) over deleting them to preserve link integrity.\n"
fi

if [ -n "$WARNINGS" ]; then
  printf "$WARNINGS"
fi

exit 0
