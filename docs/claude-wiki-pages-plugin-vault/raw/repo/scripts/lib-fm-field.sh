#!/bin/bash
# lib-fm-field.sh — shared scalar frontmatter-field extractor.
#
# SOURCEABLE (not executable). Source this file to get `_fm_field`, the single
# canonical implementation of "read the first `<field>:` value out of a file's
# YAML frontmatter, strip quotes, return empty when absent."
#
# Previously duplicated verbatim across:
#   - scripts/verify-ingest.sh        (the gate-05 parity twin)
#   - scripts/eval-ingest-extract.sh  (the eval driver, comment C10)
# Consolidated here so both compute identical values from one source. The body
# is byte-identical to the prior inline definitions, so the gate-05 counts and
# the eval scorecards do not move.
#
# This file deliberately omits `set -euo pipefail` — it is sourced, not
# executed, and setting strict mode here would mutate the calling shell's
# options (scripts/CLAUDE.md, "Sourceable vs. executable").
#
# Usage:
#   source "${SCRIPT_DIR}/lib-fm-field.sh"
#   val=$(_fm_field "$file" "title")

# Extract the first `<field>:` scalar from <file>'s YAML frontmatter.
# Returns the trimmed value or empty string.
# `grep -m1` avoids piping into `head` (which would SIGPIPE grep under
# `set -o pipefail`); the trailing `|| true` absorbs grep's exit-1 on no match
# so a missing field yields "" instead of killing the script under `set -e`.
_fm_field() {
  local file="$1" field="$2"
  local line
  line=$(sed -n '/^---$/,/^---$/p' "$file" | grep -m1 -E "^${field}:[[:space:]]" || true)
  [ -z "$line" ] && return 0
  printf '%s' "$line" | sed "s/^${field}:[[:space:]]*//" | tr -d "\"'"
}
