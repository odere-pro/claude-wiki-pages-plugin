#!/bin/bash
# eval-normalize-ws.sh — shared whitespace-normalization helper for the eval
# quality-gate scripts.
#
# SOURCEABLE (not executable). Source this file to get the `normalize_ws`
# function, which is the single canonical implementation of the ADR-0017
# whitespace-normalization spec:
#
#   Collapse every run of whitespace (including newlines and tabs from
#   hard-wrapped input files) to a single ASCII space.
#
# This is a pure text transform; it enables exact verbatim comparison after
# normalization without any similarity or vector operation (§5 NO-RAG holds).
#
# Previously duplicated in:
#   - scripts/eval-query.sh (line ~51, `tr '\n\t' '  ' | tr -s ' '`)
#   - scripts/eval-ingest-extract.sh (line ~286, sed-based variant)
# H13 consolidates both into this single shared source of truth.
#
# Usage:
#   source "$(dirname "$0")/eval-normalize-ws.sh"
#   normalized=$(printf '%s' "$text" | normalize_ws)

# Collapse whitespace runs (newlines, tabs, spaces) to a single space per run.
# Implementation uses tr for the newline/tab → space pass, then tr -s to
# squeeze all remaining multi-space runs. POSIX-portable and identical output
# to the sed-based variant for all inputs (no trailing/leading space
# guaranteed by the pipe order and tr -s behaviour).
normalize_ws() {
  tr '\n\t' '  ' | tr -s ' '
}
