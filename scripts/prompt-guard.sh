#!/bin/bash
# UserPromptSubmit: warn about common mistakes in user prompts
# Vault resolved via CLAUDE_WIKI_PAGES_VAULT, auto-detection, or default (docs/vault)
# Non-blocking — outputs warnings but never blocks the prompt.
#
# Advisory scope: this script is intentionally advisory-only (non-blocking).
# It does NOT attempt semantic injection detection on prompt body text or on
# ingested raw/ body content — the defense against prompt injection via sources
# is structural: protect-raw.sh immutability + validate-frontmatter.sh schema,
# tested by replay-corpus.sh. See SECURITY.md "Prompt injection via ingested
# sources" for the documented posture.
#
# ReDoS note: the two grep -qiE alternations below are intentionally simple
# (no nested quantifiers) and run once over a bounded user prompt in a
# non-blocking hook, so catastrophic backtracking is not exploitable here.
# Accepted risk. See SECURITY.md "Known limitations" if a regex audit is needed.
set -euo pipefail

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)
VAULT_NAME=$(basename "$VAULT")

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty')

if [ -z "$PROMPT" ]; then exit 0; fi

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
  # H02: use '%b' format to prevent LLM-influenced content from being
  # interpreted as a printf format string (command-injection / format-string).
  # '%b' renders \n as a newline (preserving the intended line breaks) but does
  # NOT treat %-specifiers in $WARNINGS as format directives — safe against
  # format-string injection while keeping the same visual output as the old
  # `printf "$WARNINGS"` call.
  printf '%b' "$WARNINGS"
fi

exit 0
