#!/bin/bash
# S1-check — opt-in predicate domain→range lint checker.
#
# Reads the ontology-profile-v1 predicate table from vault/CLAUDE.md (the SINGLE
# source — no inline copy of the table here) and flags any typed wikilink whose
# domain (source page class) or range (target page class) violates a row.
#
# WARN-tier, opt-in detection only — not a write-block, not in verify-ingest.sh.
#
# Usage:
#   scripts/lint-ontology.sh [--target <vault-path>]
#
# Exit codes:
#   0 — no violations found (or no profile table present)
#   1 — one or more WARN-level violations found
#   2 — hard error (vault not found, CLAUDE.md unreadable, etc.)
#
# Respects the four-tier vault resolution from scripts/resolve-vault.sh when
# --target is not given.

set -euo pipefail

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)

while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      VAULT="${2%/}"
      shift 2
      ;;
    *) shift ;;
  esac
done

VAULT_CLAUDE_MD="$VAULT/CLAUDE.md"
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

if [ ! -f "$VAULT_CLAUDE_MD" ]; then
  printf '\033[0;33mINFO:  No CLAUDE.md found at %s — skipping ontology check\033[0m\n' \
    "$VAULT_CLAUDE_MD"
  exit 0
fi

# ──────────────────────────────────────────────
# Parse the predicate table from CLAUDE.md.
#
# Reads the table under "Predicate domain→range table" and emits
# TAB-separated triples: predicate<TAB>domain_cell<TAB>range_cell
# ──────────────────────────────────────────────

PROFILE_TMP=$(mktemp)
# shellcheck disable=SC2064
trap "rm -f '$PROFILE_TMP'" EXIT

awk '
  /Predicate domain.*range table/ { in_table=1; next }
  in_table && /^\| Predicate/ { next }
  in_table && /^\|[[:space:]]*`/ {
    line = $0
    gsub(/^\|[[:space:]]*/, "", line)
    n = split(line, cols, "|")
    if (n < 3) next
    pred = cols[1]; domain = cols[2]; range = cols[3]
    gsub(/^[[:space:]`]+|[[:space:]`]+$/, "", pred)
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", domain)
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", range)
    if (pred != "" && domain != "" && range != "")
      print pred "\t" domain "\t" range
  }
  in_table && /^## / { in_table=0 }
' "$VAULT_CLAUDE_MD" >"$PROFILE_TMP"

ROW_COUNT=$(wc -l <"$PROFILE_TMP" | tr -d ' ')
if [ "$ROW_COUNT" -eq 0 ]; then
  printf '\033[0;33mINFO:  No predicate rows found in %s — skipping ontology check\033[0m\n' \
    "$VAULT_CLAUDE_MD"
  exit 0
fi

header "Predicate domain→range check (S1)"
printf 'Profile: %s (%d predicate rows)\n' "$VAULT_CLAUDE_MD" "$ROW_COUNT"

# ──────────────────────────────────────────────
# Helper: extract the type: value from a file's frontmatter.
# ──────────────────────────────────────────────
_page_type() {
  local file="$1"
  sed -n '/^---$/,/^---$/p' "$file" |
    grep -m1 -E '^type:[[:space:]]' |
    sed 's/^type:[[:space:]]*//' |
    tr -d "\"'" ||
    true
}

# ──────────────────────────────────────────────
# Helper: given a wikilink target name, find its page type in wiki/.
# Prints the type string or "unknown".
# ──────────────────────────────────────────────
_resolve_type() {
  local target="$1"
  if [ ! -d "$WIKI" ]; then
    printf 'unknown'
    return
  fi
  while IFS= read -r candidate; do
    local t
    t=$(sed -n '/^---$/,/^---$/p' "$candidate" |
      grep -m1 -E '^title:[[:space:]]' |
      sed 's/^title:[[:space:]]*//' |
      tr -d "\"'" || true)
    if [ "$t" = "$target" ]; then
      _page_type "$candidate"
      return
    fi
    local a_line
    a_line=$(sed -n '/^---$/,/^---$/p' "$candidate" |
      grep -m1 -E '^aliases:' || true)
    if [ -n "$a_line" ] && echo "$a_line" | grep -qF "\"${target}\""; then
      _page_type "$candidate"
      return
    fi
  done < <(find "$WIKI" -name '*.md' -type f | sort)
  printf 'unknown'
}

# ──────────────────────────────────────────────
# Helper: check whether a type string matches a domain/range cell.
#
# The cell may contain:
#   - backtick-quoted type names, e.g. "`entity`,`concept`,`topic`"
#   - "any non-root page (`entity`,`concept`, ...)"
#   - "same class as domain"
#   - "any non-root page"
#
# Special cells use keyword fallback:
#   "any non-root page" → entity|concept|topic|project|synthesis|index
#   "any" → matches all
#   "same class as domain" → caller must handle; returns 2
#
# Returns: 0 = match, 1 = no match, 2 = "same class as domain"
# ──────────────────────────────────────────────
_type_in_cell() {
  local page_type="$1"
  local cell="$2"

  case "$cell" in
    *"same class as domain"*) return 2 ;;
  esac

  local tokens
  tokens=$(printf '%s' "$cell" | grep -oE '`[a-z_]+`' | tr -d '`' || true)

  if [ -n "$tokens" ]; then
    while IFS= read -r tok; do
      if [ "$tok" = "$page_type" ]; then
        return 0
      fi
    done <<<"$tokens"
    return 1
  fi

  case "$cell" in
    *"any non-root page"*)
      case "$page_type" in
        entity | concept | topic | project | synthesis | index) return 0 ;;
        *) return 1 ;;
      esac
      ;;
    *"any"*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

# ──────────────────────────────────────────────
# Helper: extract all [[wikilink]] targets from a specific frontmatter field.
#
# Handles three YAML shapes:
#   scalar:      field: "[[Target]]"
#   inline array: field: ["[[A]]", "[[B]]"]
#   multi-line:  field:\n  - "[[A]]"\n  - "[[B]]"
#
# Prints one raw wikilink (with [[ ]] intact) per line.
# ──────────────────────────────────────────────
_extract_field_wikilinks() {
  local frontmatter="$1"
  local field="$2"
  # Extract the field's content lines from frontmatter using awk, then
  # extract all [[...]] patterns from those lines.
  printf '%s\n' "$frontmatter" | awk -v fld="$field" '
    $0 ~ "^"fld":[[:space:]]" {
      in_field = 1
      # Check for scalar: field: "[[Target]]" or field: [[Target]]
      val = $0
      sub(/^[^:]*:[[:space:]]*/, "", val)
      gsub(/^["'"'"' ]+|["'"'"' ]+$/, "", val)
      if (val ~ /^\[\[/) { print val; in_field = 0; next }
      # Check for inline array: field: ["[[A]]", ...]
      if (val ~ /^\[/) {
        # Remove outer brackets
        sub(/^\[/, "", val); sub(/\][[:space:]]*$/, "", val)
        n = split(val, items, ",")
        for (i = 1; i <= n; i++) {
          gsub(/^[[:space:]"'"'"']+|[[:space:]"'"'"']+$/, "", items[i])
          if (items[i] ~ /^\[\[/) print items[i]
        }
        in_field = 0; next
      }
      # Empty value or non-wikilink scalar — no entries
      in_field = 0; next
    }
    # Multi-line array continuation: "  - ..." lines
    in_field && /^[[:space:]]*-[[:space:]]/ {
      item = $0
      gsub(/^[[:space:]]*-[[:space:]]*["'"'"']?|["'"'"']?[[:space:]]*$/, "", item)
      if (item ~ /^\[\[/) print item
      next
    }
    # Any other line ends multi-line collection
    in_field && !/^[[:space:]]*-[[:space:]]/ { in_field = 0 }
  '
}

# ──────────────────────────────────────────────
# Main loop: walk wiki pages, extract typed wikilink fields, check domain/range.
# ──────────────────────────────────────────────

PAGES_CHECKED=0

while IFS= read -r filepath; do
  BASENAME=$(basename "$filepath" .md)
  case "$BASENAME" in
    index | log | dashboard | manifest | .gitkeep) continue ;;
  esac

  PAGE_TYPE=$(_page_type "$filepath")
  [ -z "$PAGE_TYPE" ] && continue

  PAGES_CHECKED=$((PAGES_CHECKED + 1))

  FRONTMATTER=$(sed -n '/^---$/,/^---$/p' "$filepath")

  while IFS=$'\t' read -r pred_field domain_cell range_cell; do
    [ -z "$pred_field" ] && continue

    # ── Domain check: does PAGE_TYPE satisfy the domain? ──
    domain_ok=0
    if _type_in_cell "$PAGE_TYPE" "$domain_cell"; then
      domain_ok=1
    else
      case $? in
        2) domain_ok=1 ;; # "same class as domain" — domain not restricted
        *) domain_ok=0 ;;
      esac
    fi

    if [ "$domain_ok" -eq 0 ]; then
      # PAGE_TYPE not in domain — flag only if the field is actually populated.
      ENTRIES=$(_extract_field_wikilinks "$FRONTMATTER" "$pred_field")
      if [ -n "$ENTRIES" ]; then
        yellow "domain-violation: ${filepath##*/}: type=\"${PAGE_TYPE}\" uses predicate \"${pred_field}\" but domain allows only: ${domain_cell}"
        WARNINGS=$((WARNINGS + 1))
      fi
      continue
    fi

    # ── Range check: for each wikilink target, check its type ──
    ENTRIES=$(_extract_field_wikilinks "$FRONTMATTER" "$pred_field")
    [ -z "$ENTRIES" ] && continue

    while IFS= read -r entry; do
      [ -z "$entry" ] && continue
      # Strip [[ and ]] and alias suffix
      TARGET=$(printf '%s' "$entry" | sed 's/^\[\[//' | sed 's/\]\]$//' | cut -d'|' -f1)
      TARGET_TYPE=$(_resolve_type "$TARGET")
      [ "$TARGET_TYPE" = "unknown" ] && continue

      case "$range_cell" in
        *"same class as domain"*)
          if [ "$TARGET_TYPE" != "$PAGE_TYPE" ]; then
            yellow "range-violation: ${filepath##*/}: predicate \"${pred_field}\" (same-class) points at \"${TARGET}\" (type=${TARGET_TYPE}) but source is \"${PAGE_TYPE}\""
            WARNINGS=$((WARNINGS + 1))
          fi
          continue
          ;;
      esac

      if ! _type_in_cell "$TARGET_TYPE" "$range_cell"; then
        yellow "range-violation: ${filepath##*/}: predicate \"${pred_field}\" points at \"${TARGET}\" (type=${TARGET_TYPE}) but range allows only: ${range_cell}"
        WARNINGS=$((WARNINGS + 1))
      fi
    done <<<"$ENTRIES"

  done <"$PROFILE_TMP"
done < <(find "$WIKI" -name '*.md' -type f 2>/dev/null | sort)

# ──────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────
printf '\nPages checked: %d\n' "$PAGES_CHECKED"
if [ "$WARNINGS" -eq 0 ]; then
  green "No ontology violations found"
  exit 0
else
  printf '\033[0;33mWARNINGS: %d\033[0m\n' "$WARNINGS"
  exit 1
fi
