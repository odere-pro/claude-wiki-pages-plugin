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
# ReDoS note: both the raw-edit check and the delete-wiki check are split into
# two sequential greps so there is no .* between alternation groups —
# eliminating the backtracking surface entirely. Neither check uses a
# cross-group wildcard and neither is susceptible to catastrophic backtracking.
set -euo pipefail

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)
VAULT_NAME=$(basename "$VAULT")
# Escape regex metacharacters in VAULT_NAME so a vault named e.g. "my(vault)"
# cannot inject arbitrary ERE syntax into the grep -E pattern below (regex injection).
VAULT_NAME_RE=$(printf '%s' "$VAULT_NAME" | sed 's/[]\.|$(){}?+*^[]/\\&/g')

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty')

if [ -z "$PROMPT" ]; then exit 0; fi

WARNINGS=""

# Warn if user asks to edit/modify raw files.
# Split into two sequential greps to avoid a .* between alternation groups
# (which would be a ReDoS surface on NFA engines given adversarial input).
# First grep checks for an edit-intent verb; second checks for a raw-path
# indicator. Both must match — equivalent logic, zero cross-group wildcard.
if echo "$PROMPT" | grep -qiE "(edit|modify|change|update|fix|correct)\b" &&
  echo "$PROMPT" | grep -qiE "(${VAULT_NAME_RE}/raw|raw/|raw source|source file)"; then
  WARNINGS="${WARNINGS}WARNING: ${VAULT_NAME}/raw/ files are immutable. Corrections belong in wiki pages, not raw sources.\n"
fi

# Warn if user asks to delete wiki pages.
# Split into two sequential greps to avoid a .* between alternation groups
# (which would be a ReDoS surface on NFA engines given adversarial input).
# First grep checks for a delete-intent verb; second checks for a wiki-target
# indicator. Both must match — equivalent logic, zero cross-group wildcard.
if echo "$PROMPT" | grep -qiE '(delete|remove|drop)\b' &&
  echo "$PROMPT" | grep -qiE '(wiki page|wiki note|from wiki)'; then
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
