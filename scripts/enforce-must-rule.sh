#!/usr/bin/env bash
# enforce-must-rule.sh — PreToolUse warning for claude-md:must-rule-with-no-hook
#
# When a CLAUDE.md edit introduces an imperative "must / never / always" rule,
# remind the author to back it with an enforcement hook or CI check — an
# unenforced rule is a polite request, not a guarantee. Non-blocking by design:
# this hook only warns and ALWAYS exits 0, so it never interrupts an edit.
#
# Path-filtered inside the script (the hook matcher is the broad Write|Edit|
# MultiEdit), so it is a no-op for any file that is not a CLAUDE.md.
#
# Exit codes: 0 = always (warning only; never blocks).

set -euo pipefail

# Read tool input from stdin (Claude passes it as JSON).
INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null || true)

# Only act on CLAUDE.md files; no-op otherwise.
case "$FILE_PATH" in
  */CLAUDE.md | CLAUDE.md) ;;
  *) exit 0 ;;
esac

# Inspect only the text being written/added: `content` for Write, `new_string`
# for Edit. MultiEdit (no single content/new_string) falls through to a no-op so
# we never warn on edits whose added text we cannot see.
NEW=$(printf '%s' "$INPUT" | python3 -c "import sys,json; ti=json.load(sys.stdin).get('tool_input',{}); print(ti.get('content') or ti.get('new_string') or '')" 2>/dev/null || true)
[[ -z "$NEW" ]] && exit 0

# Heuristic: count imperative rule words in the added text.
RULE_HITS=$(printf '%s' "$NEW" | grep -ciE '\b(must|never|always)\b' || true)
if [[ "$RULE_HITS" -gt 0 ]]; then
  echo "[enforce-must-rule] note: this CLAUDE.md edit adds ${RULE_HITS} imperative 'must/never/always' line(s)." >&2
  echo "[enforce-must-rule] If any is a hard rule, back it with a PreToolUse/Stop hook or a CI check — an unenforced rule is advisory only." >&2
fi

exit 0
