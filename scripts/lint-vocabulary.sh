#!/bin/bash
# S3-vocabulary — opt-in controlled-vocabulary freshness checker.
#
# Three signals:
#   1. Orphaned vocabulary form — any canonical or variant that appears in no
#      wiki page (frontmatter tags/aliases/title OR body prose), case-folded.
#   2. Fully-unreferenced group — all forms orphaned → ONE WARN by canonical.
#   3. Tag below usage floor — a vocabulary form used as a page tag on fewer
#      than MIN_TAG_USAGE pages (default 2, override with --min-tag-usage N).
#
# WARN-only, NEVER blocks. Detection only — never mutates _vocabulary.md.
#
# Usage:
#   scripts/lint-vocabulary.sh [--target <vault-path>] [--min-tag-usage N]
#
# Exit codes:
#   0 — no violations (or absent _vocabulary.md)
#   1 — one or more WARN-level findings
#   2 — hard error (vault not found, unreadable file)
#
# Respects the four-tier vault resolution from scripts/resolve-vault.sh when
# --target is not given.

set -euo pipefail

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)

# Named constant for the tag usage floor — not a magic number.
MIN_TAG_USAGE=2

while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      VAULT="${2%/}"
      shift 2
      ;;
    --min-tag-usage)
      MIN_TAG_USAGE="$2"
      shift 2
      ;;
    *) shift ;;
  esac
done

VOCAB_FILE="$VAULT/_vocabulary.md"
WIKI="$VAULT/wiki"

WARNINGS=0

yellow() { printf '\033[0;33mWARN:  %s\033[0m\n' "$1"; }
green() { printf '\033[0;32mOK:    %s\033[0m\n' "$1"; }
header() { printf '\n\033[1m=== %s ===\033[0m\n' "$1"; }

# ──────────────────────────────────────────────
# Guard: vault must exist
# ──────────────────────────────────────────────
if [ ! -d "$VAULT" ]; then
  printf '\033[0;31mERROR: Vault directory not found at %q\033[0m\n' "$VAULT" >&2
  exit 2
fi

# ──────────────────────────────────────────────
# Guard: absent _vocabulary.md → info, exit 0
# ──────────────────────────────────────────────
if [ ! -f "$VOCAB_FILE" ]; then
  printf '\033[0;33mINFO:  No _vocabulary.md found at %s — skipping vocabulary check\033[0m\n' \
    "$VOCAB_FILE"
  exit 0
fi

header "Controlled-vocabulary freshness (S3)"
printf 'Vocabulary: %s\n' "$VOCAB_FILE"
printf 'Tag usage floor: %d\n' "$MIN_TAG_USAGE"

# ──────────────────────────────────────────────
# Load the lexicon via bun: emit one line per group as
#   yaml-canonical<TAB>form1,form2,...
#
# Uses parseFrontmatter+loadLexicon (read-only imports). The YAML canonical
# field is preserved as the first field; the comma-separated forms are the
# complete union-find-closed component (all forms that are synonyms).
# Output is sorted by yaml-canonical for determinism.
# ──────────────────────────────────────────────

LEXICON_TMP=$(mktemp)
# shellcheck disable=SC2064
trap "rm -f '$LEXICON_TMP'" EXIT

_SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if ! bun -e "
import { parseFrontmatter } from '${_SCRIPT_DIR}/../src/core/frontmatter.ts';
import { loadLexicon } from '${_SCRIPT_DIR}/../src/core/vocabulary.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const vault = '${VAULT}';
const vocabPath = join(vault, '_vocabulary.md');

// Read raw YAML to get the original canonical names.
let rawContent;
try { rawContent = readFileSync(vocabPath, 'utf8'); } catch { process.exit(0); }
const fm = parseFrontmatter(rawContent);
const rawGroups = Array.isArray(fm['groups']) ? fm['groups'] : [];

// Build a map from normalised-form -> yaml-canonical (lowercased+trimmed).
// This lets us look up any form's YAML canonical even after union-find merging.
const formToYamlCanon = new Map();
for (const g of rawGroups) {
  if (typeof g !== 'object' || g === null) continue;
  const canon = typeof g.canonical === 'string' ? g.canonical.toLowerCase().trim() : '';
  if (!canon) continue;
  formToYamlCanon.set(canon, canon);
  const variants = Array.isArray(g.variants) ? g.variants : [];
  for (const v of variants) {
    if (typeof v === 'string' && v.trim()) formToYamlCanon.set(v.toLowerCase().trim(), canon);
  }
}

// Load the union-find-closed expand map so we know which forms share a component.
const lex = loadLexicon(vault);

// Reconstruct groups: for each component, find its yaml-canonical by picking
// the canonical that was declared in the YAML (not the lexicographic root).
const seen = new Set();
const output = [];
for (const [form, peers] of lex.expand.entries()) {
  const component = [form, ...peers].sort();
  const key = component.join('|');
  if (seen.has(key)) continue;
  seen.add(key);

  // Find the yaml-canonical for this component.
  let yamlCanon = '';
  for (const f of component) {
    const c = formToYamlCanon.get(f);
    if (c && formToYamlCanon.get(c) === c) { yamlCanon = c; break; }
  }
  if (!yamlCanon) yamlCanon = component[0];

  output.push(yamlCanon + '\t' + component.join(','));
}

// Single-form groups (forms that appear in rawGroups but have no synonyms in the
// expand map — i.e. they were registered but all their forms are the same form).
for (const g of rawGroups) {
  if (typeof g !== 'object' || g === null) continue;
  const canon = typeof g.canonical === 'string' ? g.canonical.toLowerCase().trim() : '';
  if (!canon) continue;
  if (!lex.expand.has(canon)) {
    // Canonical not in expand map (zero synonyms for this canonical).
    const variants = Array.isArray(g.variants) ? g.variants : [];
    const allForms = [canon, ...variants.filter(v => typeof v === 'string').map(v => v.toLowerCase().trim()).filter(v => v)];
    const key2 = [...new Set(allForms)].sort().join('|');
    if (!seen.has(key2)) {
      seen.add(key2);
      output.push(canon + '\t' + [...new Set(allForms)].sort().join(','));
    }
  }
}

output.sort((a, b) => a.localeCompare(b));
for (const line of output) {
  process.stdout.write(line + '\n');
}
" 2>/dev/null >"$LEXICON_TMP"; then
  printf '\033[0;31mERROR: Failed to load _vocabulary.md (bun unavailable or parse error)\033[0m\n' >&2
  exit 2
fi

GROUP_COUNT=$(wc -l <"$LEXICON_TMP" | tr -d ' ')
if [ "$GROUP_COUNT" -eq 0 ]; then
  printf '\033[0;33mINFO:  _vocabulary.md parsed but contains no groups — nothing to check\033[0m\n'
  exit 0
fi

printf 'Groups loaded: %d\n' "$GROUP_COUNT"

# ──────────────────────────────────────────────
# Build a sorted list of all wiki page paths (deterministic iteration).
# ──────────────────────────────────────────────
WIKI_PAGES_TMP=$(mktemp)
# shellcheck disable=SC2064
trap "rm -f '$LEXICON_TMP' '$WIKI_PAGES_TMP'" EXIT

find "$WIKI" -name '*.md' -type f 2>/dev/null | sort >"$WIKI_PAGES_TMP"

PAGE_COUNT=$(wc -l <"$WIKI_PAGES_TMP" | tr -d ' ')
printf 'Wiki pages: %d\n' "$PAGE_COUNT"

if [ "$PAGE_COUNT" -eq 0 ]; then
  printf '\033[0;33mINFO:  No wiki pages found — no forms can be referenced\033[0m\n'
  # All vocabulary groups are unreferenced by definition.
  while IFS= read -r group_line; do
    [ -z "$group_line" ] && continue
    yaml_canonical=$(printf '%s' "$group_line" | cut -f1)
    yellow "unreferenced-group: canonical=\"${yaml_canonical}\" — all forms absent from wiki"
    WARNINGS=$((WARNINGS + 1))
  done <"$LEXICON_TMP"
  printf '\033[0;33mWARNINGS: %d\033[0m\n' "$WARNINGS"
  exit 1
fi

# ──────────────────────────────────────────────
# For each page, build two lookup structures:
#   - BODY_TMP: lowercased full-page text (for form presence check)
#   - TAGS_TMP: one line per tag entry as "tag<TAB>filepath"
# ──────────────────────────────────────────────
BODY_TMP=$(mktemp)
TAGS_TMP=$(mktemp)
# shellcheck disable=SC2064
trap "rm -f '$LEXICON_TMP' '$WIKI_PAGES_TMP' '$BODY_TMP' '$TAGS_TMP'" EXIT

# Build the combined body corpus and tags index in one sorted pass.
while IFS= read -r filepath; do
  [ -z "$filepath" ] && continue
  # Lowercase entire file and append to BODY_TMP with a separator so searches
  # do not bleed across file boundaries.
  awk 'BEGIN{ORS=" "}{print tolower($0)}' "$filepath" >>"$BODY_TMP"
  printf '\x00FILE_BOUNDARY\x00' >>"$BODY_TMP"

  # Extract tags: handle inline array ("tags: [a, b]") and block array ("tags:\n  - a").
  awk -v fp="$filepath" '
    /^---$/ { fm_count++; next }
    fm_count < 2 {
      if ($0 ~ /^tags:[[:space:]]*\[/) {
        line = $0
        sub(/^tags:[[:space:]]*\[/, "", line)
        sub(/\][[:space:]]*$/, "", line)
        n = split(line, items, ",")
        for (i = 1; i <= n; i++) {
          tag = items[i]
          gsub(/^[[:space:]"'"'"']+|[[:space:]"'"'"']+$/, "", tag)
          if (tag != "") print tolower(tag) "\t" fp
        }
      } else if ($0 ~ /^tags:[[:space:]]*$/) {
        in_tags = 1
        next
      } else if ($0 ~ /^tags:[[:space:]]/) {
        tag = $0
        sub(/^tags:[[:space:]]*/, "", tag)
        gsub(/^["'"'"' ]+|["'"'"' ]+$/, "", tag)
        if (tag != "") print tolower(tag) "\t" fp
        next
      }
    }
    fm_count < 2 && in_tags && /^[[:space:]]*-[[:space:]]/ {
      tag = $0
      gsub(/^[[:space:]]*-[[:space:]]*["'"'"']?|["'"'"']?[[:space:]]*$/, "", tag)
      if (tag != "") print tolower(tag) "\t" fp
      next
    }
    fm_count < 2 && in_tags && !/^[[:space:]]*-[[:space:]]/ { in_tags = 0 }
  ' "$filepath" >>"$TAGS_TMP"
done <"$WIKI_PAGES_TMP"

# ──────────────────────────────────────────────
# Main loop: process each vocabulary group.
#
# Each line in LEXICON_TMP: yaml-canonical<TAB>form1,form2,...
#
#   Signal 1 — orphaned form: a form that matches no wiki page (body/frontmatter).
#   Signal 2 — fully-unreferenced group: ALL forms absent → ONE WARN by yaml-canonical.
#   Signal 3 — tag below usage floor: group forms used as tags on < N pages total.
# ──────────────────────────────────────────────

BODY_TEXT=$(cat "$BODY_TMP")

while IFS=$'\t' read -r yaml_canonical forms_csv; do
  [ -z "$yaml_canonical" ] && continue

  IFS=',' read -ra forms <<<"$forms_csv"

  all_orphaned=1
  any_warned=0

  # Signal 3: count pages that have ANY form of this group as a tag.
  tag_page_count=0
  tag_form_found=""
  for form in "${forms[@]}"; do
    form_count=$(grep -c "^${form}	" "$TAGS_TMP" 2>/dev/null || true)
    tag_page_count=$((tag_page_count + form_count))
    if [ "$form_count" -gt 0 ] && [ -z "$tag_form_found" ]; then
      tag_form_found="$form"
    fi
  done

  # Check body presence for each form (for signal 1 + 2).
  for form in "${forms[@]}"; do
    case "$BODY_TEXT" in
      *"${form}"*)
        all_orphaned=0
        ;;
    esac
  done

  # Signal 2: fully-unreferenced group → ONE WARN by yaml-canonical.
  if [ "$all_orphaned" -eq 1 ]; then
    yellow "unreferenced-group: canonical=\"${yaml_canonical}\" — all forms absent from wiki"
    WARNINGS=$((WARNINGS + 1))
    any_warned=1
  else
    # Signal 1: individually orphaned forms within a partially-referenced group.
    for form in "${forms[@]}"; do
      case "$BODY_TEXT" in
        *"${form}"*) ;;
        *)
          yellow "orphaned-form: \"${form}\" (group canonical=\"${yaml_canonical}\") appears in no wiki page"
          WARNINGS=$((WARNINGS + 1))
          any_warned=1
          ;;
      esac
    done
  fi

  # Signal 3: tag below usage floor (only when the form IS used as a tag at all).
  if [ "$tag_page_count" -gt 0 ] && [ "$tag_page_count" -lt "$MIN_TAG_USAGE" ]; then
    yellow "tag-floor: \"${tag_form_found}\" (group canonical=\"${yaml_canonical}\") used as a tag on only ${tag_page_count} page(s) — floor is ${MIN_TAG_USAGE}"
    WARNINGS=$((WARNINGS + 1))
    any_warned=1
  fi

  # Suppress unused variable warning from shellcheck.
  : "$any_warned"

done <"$LEXICON_TMP"

# ──────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────
printf '\nGroups checked: %d\n' "$GROUP_COUNT"
if [ "$WARNINGS" -eq 0 ]; then
  green "No vocabulary drift found"
  exit 0
else
  printf '\033[0;33mWARNINGS: %d\033[0m\n' "$WARNINGS"
  exit 1
fi
