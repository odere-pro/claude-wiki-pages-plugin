#!/bin/bash
# Shared sourceable helper — defines _page_type().
# H12: extracted from lint-ontology.sh:102 and lint-structural.sh:87 (byte-for-byte duplicate).
# Source this file from any script that needs to extract the `type:` frontmatter field.
#
# Do NOT execute directly; source it from other scripts.
# This file deliberately omits `set -euo pipefail` — it is sourced, not executed.

# _page_type <file>
# Extract the type: value from a file's frontmatter.
# Prints the type string on stdout, or nothing if absent.
_page_type() {
  local file="$1"
  sed -n '/^---$/,/^---$/p' "$file" 2>/dev/null |
    grep -m1 -E '^type:[[:space:]]' |
    sed 's/^type:[[:space:]]*//' |
    tr -d "\"'" ||
    true
}
