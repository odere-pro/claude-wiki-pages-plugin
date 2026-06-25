#!/bin/bash
# Sourceable helper — shared gate skeleton for PreToolUse validation hooks.
# B08: extracted from firewall.sh and validate-frontmatter.sh to eliminate
# the byte-identical block-decision JSON helper (template-method / DRY fix).
#
# Do NOT execute directly; source it from the gate scripts.
# This file deliberately omits `set -euo pipefail` — it is sourced, not executed,
# so strict mode must be set by the calling script, not here.
#
# Public surface:
#   emit_block_decision <reason>
#     Emit a PreToolUse block-decision JSON object to stdout using jq.
#     <reason> is passed as an argument (never interpolated into a format string),
#     so arbitrary characters — backslash, newline, tab, C0 controls — are safe.
#     Requires jq (available in all hook shells; firewall.sh already depends on it).
#
# Injection note (B02/B05): jq --arg passes the value as a JSON string literal
# internally, escaping all special characters automatically. This is the only
# safe way to build a JSON string from externally-controlled input in bash.

emit_block_decision() {
  local reason="$1"
  jq -cn --arg reason "$reason" '{"decision":"block","reason":$reason}'
}
