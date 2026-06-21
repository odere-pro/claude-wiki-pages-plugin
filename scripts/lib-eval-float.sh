#!/bin/bash
# lib-eval-float.sh — shared awk float-math helpers for the eval quality-gate
# scripts (bash is integer-only, so every ratio/threshold uses awk).
#
# SOURCEABLE (not executable). Source this file to get the four float helpers
# below, the single canonical implementations of the ADR-0017 scoring math.
#
# Previously duplicated across:
#   - scripts/eval-ingest-extract.sh (ratio/meets/meets_ratio/min_ratio defs)
#   - scripts/eval-query.sh          (inline `awk printf "%.4f"` + `exit !(r>=t)`)
# Consolidated here so both gates compute identical numbers from one source.
# Output is byte-identical to the prior inline forms (ratio with den>0 equals
# `printf "%.4f", n/d`; meets equals `exit !(v>=t)`), so the gated scorecards do
# not move.
#
# Usage:
#   source "$(dirname "$0")/lib-eval-float.sh"
#   rate=$(ratio "$num" "$den")
#   meets "$rate" "$threshold" && echo "clears the bar"

# Format a fraction num/den to 4 decimals; den==0 yields 1.0000 (nothing to get
# wrong scores perfectly). Uses awk for float math (bash is integer-only).
ratio() {
  local num="$1" den="$2"
  awk -v n="$num" -v d="$den" 'BEGIN { if (d == 0) { printf "1.0000" } else { printf "%.4f", n / d } }'
}

# Return 0 when value >= threshold (float compare via awk), else 1.
# Used for already-computed rates (e.g. the schema cap) where no raw counts
# exist. For count-derived metrics use meets_ratio instead to avoid rounding.
meets() {
  awk -v v="$1" -v t="$2" 'BEGIN { exit (v + 0 >= t + 0) ? 0 : 1 }'
}

# Return 0 when num/den >= bar, computed EXACTLY on the RAW counts — never the
# rounded display string. Avoids the rounding edge where e.g. 0.969957 prints as
# "0.9700" and would falsely clear a 0.97 bar. The comparison cross-multiplies
# integers: n/d >= t  <=>  n * SCALE >= round(t * SCALE) * d, with SCALE large
# enough that every bar (0.98 / 0.97 / 0.90) is an exact integer multiple. No
# division, no rounding of the ratio, so a value strictly below the bar can never
# round onto it. den == 0 means "nothing to score" → meets the bar (1.0).
meets_ratio() {
  awk -v n="$1" -v d="$2" -v t="$3" '
    BEGIN {
      if (d + 0 == 0) { exit 0 }                 # empty set scores perfectly
      SCALE = 1000000
      tnum = int(t * SCALE + 0.5)                # bar as an exact integer
      lhs = (n + 0) * SCALE                       # n/d, numerator side, exact
      rhs = tnum * (d + 0)                         # bar * d, exact
      exit (lhs >= rhs) ? 0 : 1
    }'
}

# Print the smaller of two floats (4 decimals).
min_ratio() {
  awk -v a="$1" -v b="$2" 'BEGIN { printf "%.4f", (a + 0 < b + 0) ? a : b }'
}
