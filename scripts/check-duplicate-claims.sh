#!/bin/bash
# check-duplicate-claims.sh — P2.4 duplicate-claim warning (ADR-0014 Part B)
#
# Usage:
#   scripts/check-duplicate-claims.sh --target <vault-path> [--proposed <file>]
#
# Scans source_quotes fields in wiki/**/*.md pages and, for each quote in the
# given _proposed/ page, warns (exit 0 — advisory only, never blocks) when the
# quote's canonical form already appears in an existing wiki/ page.
#
# WARN only: exits 0 in all cases. Does NOT raise VIOLATIONS or block promotion.
# Invoke from skills/review/SKILL.md as a review step; do NOT wire as a hook.
#
# ── Canonical (normalized) form ──────────────────────────────────────────────
# Applied in this exact documented order to every source_quotes.quote value:
#
#   1. Strip surrounding YAML scalar quoting: remove leading/trailing
#      double-quote, single-quote, or bracket characters from the raw
#      YAML scalar string.
#   2. ASCII lowercase: tr '[:upper:]' '[:lower:]'
#   3. Collapse whitespace runs (space, tab, newline) to a single space.
#   4. Trim leading and trailing whitespace.
#   5. Remove a fixed ASCII punctuation class — exactly these characters:
#        .  ,  ;  :  !  ?  "  '  `  (  )  [  ]  -  –  —
#      (period, comma, semicolon, colon, exclamation mark, question mark,
#       double quote, single quote, backtick, open/close parenthesis,
#       open/close square bracket, hyphen-minus, en dash U+2013, em dash U+2014)
#
# Two quotes are duplicates iff steps 1–5 produce the byte-identical string.
#
# HARD NON-NEGOTIABLE (TEAM-BRIEF §5/§11.1): comparison is EXACT/NORMALIZED
# string equality ONLY. No fuzzy matching, no edit-distance, no token-overlap,
# no embeddings, no semantic similarity — ever. A paraphrase must NOT match.
# This is the absolute NO-RAG boundary.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)
PROPOSED_FILE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      VAULT="${2%/}"
      shift 2
      ;;
    --proposed)
      PROPOSED_FILE="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

WIKI="$VAULT/wiki"

# ── Canonical-form function ───────────────────────────────────────────────────
# Applies normalization steps 1–5 (documented in the header) to a single string.
# Input: raw quote string from YAML. Output: canonical form on stdout.
#
# NOTE: Unicode NFC normalization is not attempted in bash; we operate on bytes
# as-is (ADR-0014 Part B, item 2a).
canonical_form() {
  local raw="$1"

  # Step 1: strip surrounding YAML scalar quoting — leading/trailing
  # double quotes, single quotes, or square brackets.
  local stripped
  stripped=$(printf '%s' "$raw" | sed "s/^[\"'\[]*//; s/[\"'\]]*$//")

  # Steps 2–5: lowercase → collapse whitespace → trim → remove punctuation.
  # The punctuation class is fixed and explicitly enumerated (not [:punct:],
  # which is locale-dependent). We use tr -d for the ASCII punctuation set
  # and sed for the multi-byte en/em dash sequences.
  # Punctuation removed: . , ; : ! ? " ' ` ( ) [ ] - (hyphen-minus)
  # Plus multi-byte: en dash (–, U+2013) and em dash (—, U+2014) via sed.
  printf '%s' "$stripped" |
    tr '[:upper:]' '[:lower:]' |
    tr -s '[:space:]' ' ' |
    sed 's/^ //; s/ $//' |
    tr -d '.,;:!?"'"'"'`()[]-' |
    sed 's/–//g; s/—//g'
}

# ── Extract source_quotes from a page ─────────────────────────────────────────
# Reads the YAML frontmatter of a page and extracts quote: values from the
# source_quotes list. Outputs one raw quote string per line.
# Degrades safely when source_quotes is absent or [] — emits nothing.
extract_quotes() {
  local file="$1"

  # Extract the frontmatter block (between the two --- delimiters).
  local fm
  fm=$(awk 'NR==1 && /^---$/{n++; next} /^---$/{if(n){exit}} n{print}' "$file")

  # Bail out early if source_quotes is not present or is the empty list.
  if ! printf '%s\n' "$fm" | grep -q '^source_quotes:'; then
    return 0
  fi
  if printf '%s\n' "$fm" | grep -q '^source_quotes: *\[\]'; then
    return 0
  fi

  # Extract every "quote: ..." line from the frontmatter. Handles both the
  # block-mapping shape ("- source:" then indented "quote:") and the inline
  # list-item shape ("- quote: ..."), plus inline/quoted scalar values.
  printf '%s\n' "$fm" |
    grep -E '^ *(- )?quote:' |
    sed -E 's/^ *(- )?quote: *//'
}

# ── Build the wiki canonical-quote index ──────────────────────────────────────
# For each wiki page that has source_quotes, collect entries of the form:
#   <canonical_form>TAB<page-basename>
# Written to a temp file for lookup.
build_wiki_index() {
  local index_file="$1"
  : >"$index_file"

  while IFS= read -r -d '' wiki_file; do
    local page_name
    page_name=$(basename "$wiki_file" .md)

    while IFS= read -r raw_quote; do
      [ -z "$raw_quote" ] && continue
      local canon
      canon=$(canonical_form "$raw_quote")
      [ -z "$canon" ] && continue
      printf '%s\t%s\n' "$canon" "$page_name" >>"$index_file"
    done < <(extract_quotes "$wiki_file")
  done < <(find "$WIKI" -name "*.md" -print0 2>/dev/null)
}

# ── Main ──────────────────────────────────────────────────────────────────────

if [ -z "$PROPOSED_FILE" ] || [ ! -f "$PROPOSED_FILE" ]; then
  # No proposed file supplied or file does not exist — clean no-op.
  exit 0
fi

PROPOSED_NAME=$(basename "$PROPOSED_FILE" .md)
INDEX_FILE="$(mktemp)"
trap 'rm -f "$INDEX_FILE"' EXIT

build_wiki_index "$INDEX_FILE"

WARNED=0

while IFS= read -r raw_quote; do
  [ -z "$raw_quote" ] && continue
  canon=$(canonical_form "$raw_quote")
  [ -z "$canon" ] && continue

  # Look up the canonical form in the wiki index.
  # grep returns exit 1 when no match; suppress that with || true.
  local_matches=$(grep -F "${canon}	" "$INDEX_FILE" || true)

  if [ -n "$local_matches" ]; then
    while IFS=$'\t' read -r _form existing_page; do
      printf 'WARN: duplicate claim in "%s"\n' "$PROPOSED_NAME"
      printf '  Quote (normalized): %s\n' "$canon"
      printf '  Already in wiki page: "%s"\n' "$existing_page"
      printf '  Suggestion: link to [[%s]] instead of restating the claim.\n' "$existing_page"
      WARNED=$((WARNED + 1))
    done <<<"$local_matches"
  fi
done < <(extract_quotes "$PROPOSED_FILE")

if [ "$WARNED" -gt 0 ]; then
  printf '\n%d duplicate claim(s) found (advisory — does not block promotion).\n' "$WARNED"
fi

# Always exit 0: this is a WARN-only check. It never blocks.
exit 0
