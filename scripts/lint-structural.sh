#!/bin/bash
# S2-structural — opt-in template-skeleton conformance + no-raw-HTML checker.
#
# For each typed wiki page, checks:
#   1. Template-skeleton conformance: the page must contain every required heading
#      that the corresponding _templates/<type>.md skeleton defines (H2 sections).
#   2. No-raw-HTML: the page body must not contain raw HTML block elements
#      (<div>, <span>, <table>, etc.). Presentation independence, §5.
#
# WARN-tier, opt-in detection only — not a write-block, not in verify-ingest.sh.
#
# Usage:
#   scripts/lint-structural.sh [--target <vault-path>]
#
# Exit codes:
#   0 — no violations
#   1 — one or more WARN-level violations
#   2 — hard error (vault not found, etc.)
#
# Templates are read from vault/_templates/<type>.md. If no templates directory
# is found the skeleton check is skipped (raw-HTML check still runs).

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

WIKI="$VAULT/wiki"
TEMPLATES_DIR="$VAULT/_templates"

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
# Build skeleton map: for each _templates/<type>.md, write the required H2
# headings to a temp file named <type>.headings in a temp directory.
# ──────────────────────────────────────────────

SKELETON_TMP=$(mktemp -d)
# shellcheck disable=SC2064
trap "rm -rf '$SKELETON_TMP'" EXIT

HAS_TEMPLATES=0
if [ -d "$TEMPLATES_DIR" ]; then
  HAS_TEMPLATES=1
  while IFS= read -r tmpl_file; do
    TYPE=$(basename "$tmpl_file" .md)
    # Extract ## headings from the template body (skip frontmatter).
    # Skip placeholder headings like "## {{something}}".
    awk '
      /^---$/ { fm++; next }
      fm < 2 { next }
      /^## / {
        h = $0
        sub(/^## /, "", h)
        if (h !~ /^\{\{/) print h
      }
    ' "$tmpl_file" >"$SKELETON_TMP/${TYPE}.headings"
  done < <(find "$TEMPLATES_DIR" -name '*.md' -type f | sort)
fi

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
# Walk wiki pages
# ──────────────────────────────────────────────

header "Template-skeleton conformance + no-raw-HTML (S2)"

PAGES_CHECKED=0

while IFS= read -r filepath; do
  BASENAME=$(basename "$filepath" .md)
  # Skip bookkeeping files — exempt from template requirements
  case "$BASENAME" in
    index | log | dashboard | manifest | _index | .gitkeep) continue ;;
  esac
  # Skip _proposed/ drafts
  case "$filepath" in
    */_proposed/*) continue ;;
  esac

  PAGE_TYPE=$(_page_type "$filepath")
  [ -z "$PAGE_TYPE" ] && continue

  # Types that don't have templates are exempt from skeleton check
  case "$PAGE_TYPE" in
    source | index | manifest | log) continue ;;
  esac

  PAGES_CHECKED=$((PAGES_CHECKED + 1))

  # ── 1. Template-skeleton conformance ──────────────────────────────────────
  HEADINGS_FILE="$SKELETON_TMP/${PAGE_TYPE}.headings"
  if [ "$HAS_TEMPLATES" -eq 1 ] && [ -f "$HEADINGS_FILE" ]; then
    # Extract actual H2 headings from the page body (skip frontmatter)
    ACTUAL_HEADINGS=$(awk '
      /^---$/ { fm++; next }
      fm < 2 { next }
      /^## / { h=$0; sub(/^## /, "", h); print h }
    ' "$filepath")

    while IFS= read -r req_heading; do
      [ -z "$req_heading" ] && continue
      if ! printf '%s\n' "$ACTUAL_HEADINGS" | grep -qxF "$req_heading"; then
        yellow "missing-section: ${filepath##*/} (type=${PAGE_TYPE}): required heading \"## ${req_heading}\" not found"
        WARNINGS=$((WARNINGS + 1))
      fi
    done <"$HEADINGS_FILE"
  fi

  # ── 2. No-raw-HTML ──────────────────────────────────────────────────────
  # Scan page body (skip frontmatter, skip fenced code blocks) for block-level
  # HTML tags that violate presentation independence (§5).
  RAW_HTML_HITS=$(awk '
    /^---$/ { fm++; next }
    fm < 2 { next }
    /^```/ { in_code = !in_code; next }
    in_code { next }
    /<(div|span|table|thead|tbody|tr|td|th|iframe|script|style|form|input|button|select|textarea)[[:space:]>\/]/ ||
    /<\/(div|span|table|thead|tbody|tr|td|th|iframe|script|style|form|input|button|select|textarea)>/ {
      print NR": "$0
    }
  ' "$filepath" || true)

  if [ -n "$RAW_HTML_HITS" ]; then
    while IFS= read -r hit; do
      [ -z "$hit" ] && continue
      yellow "raw-html: ${filepath##*/} (type=${PAGE_TYPE}): raw HTML found — ${hit}"
      WARNINGS=$((WARNINGS + 1))
    done <<<"$RAW_HTML_HITS"
  fi

done < <(find "$WIKI" -name '*.md' -type f 2>/dev/null | sort)

# ──────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────
printf '\nPages checked: %d\n' "$PAGES_CHECKED"
if [ "$WARNINGS" -eq 0 ]; then
  green "No structural violations found"
  exit 0
else
  printf '\033[0;33mWARNINGS: %d\033[0m\n' "$WARNINGS"
  exit 1
fi
