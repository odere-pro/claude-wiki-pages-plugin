#!/bin/bash
# Post-ingest verification script
# Checks: duplicate index entries, sources field format, index consistency
# Usage: scripts/verify-ingest.sh [--target <vault-path>]
# Exit 0 = all clean, Exit 1 = issues found
set -euo pipefail

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)
while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      VAULT="${2%/}"
      shift 2
      ;; # explicit CLI flag overrides auto-detection
    *) shift ;;
  esac
done
WIKI="$VAULT/wiki"
INDEX="$WIKI/index.md"
VAULT_CLAUDE_MD="$VAULT/CLAUDE.md"
SUPPORTED_SCHEMA_VERSIONS=(1 2 3)

ERRORS=0
WARNINGS=0

red() { printf '\033[0;31mERROR: %s\033[0m\n' "$1"; }
yellow() { printf '\033[0;33mWARN:  %s\033[0m\n' "$1"; }
green() { printf '\033[0;32mOK:    %s\033[0m\n' "$1"; }
header() { printf '\n\033[1m=== %s ===\033[0m\n' "$1"; }

# C08: single shared title extractor — extracts the `title:` value from YAML
# frontmatter of a given file. Reads the file directly (not stdin) so it can
# be called without a subshell pipeline at every call site.
# Usage: _fm_title <file>  →  prints the title string, or empty if absent.
_fm_title() {
  sed -n '/^---$/,/^---$/{/^title:/{s/^title: *"*//;s/"*$//;p;q;};}' "$1"
}

# M11: single shared YAML list extractor for sources:, children:, and any
# other inline-or-multi-line list field. Reads YAML text from stdin, extracts
# the named field's list entries (one per output line, quotes/brackets stripped,
# wikilink markers stripped).
# Usage: _extract_yaml_list <field-name>  (reads frontmatter from stdin)
_extract_yaml_list() {
  local field="$1"
  awk -v field="$field" '
    $0 ~ ("^" field ":") {
      if ($0 ~ /\[/) {
        line = $0
        # Strip everything up to and including the opening [
        sub(/.*\[/, "", line)
        # Strip trailing ] and beyond
        sub(/\].*/, "", line)
        n = split(line, items, ",")
        for (i = 1; i <= n; i++) {
          gsub(/^[ "\x27]+|[ "\x27]+$/, "", items[i])
          gsub(/^\[\[|\]\]$/, "", items[i])
          if (items[i] != "") print items[i]
        }
        next
      }
      # Multi-line array: read subsequent "  - " lines
      while ((getline line) > 0) {
        if (line !~ /^[[:space:]]*-/) break
        gsub(/^[[:space:]]*-[[:space:]]*"?/, "", line)
        gsub(/"?[[:space:]]*$/, "", line)
        gsub(/^\[\[|\]\]$/, "", line)
        if (line != "") print line
      }
    }
  '
}

# Variant: extract sources: entries WITHOUT stripping wikilink [[ ]] so the
# wikilink-format check (CHECK 2) can test the brackets.
_extract_sources_raw() {
  awk '
    /^sources:/ {
      if ($0 ~ /\[/) {
        line = $0
        sub(/^sources:[[:space:]]*\[/, "", line)
        sub(/\][[:space:]]*$/, "", line)
        n = split(line, items, ",")
        for (i = 1; i <= n; i++) {
          gsub(/^[[:space:]"'\'']+|[[:space:]"'\'']+$/, "", items[i])
          if (items[i] != "") print items[i]
        }
        next
      }
      while ((getline line) > 0) {
        if (line !~ /^[[:space:]]*-/) break
        gsub(/^[[:space:]]*-[[:space:]]*"?/, "", line)
        gsub(/"?[[:space:]]*$/, "", line)
        if (line != "") print line
      }
    }
  '
}

# Folder note (schema v3): filename stem equals its parent directory name AND
# frontmatter declares `type: index`. Twin of isFolderNote in src/core/fs.ts —
# both names (folder note and legacy _index.md) classify as index files
# identically at any schema version.
_is_folder_note() {
  local f="$1"
  [ -f "$f" ] || return 1
  local stem dir
  stem=$(basename "$f" .md)
  dir=$(basename "$(dirname "$f")")
  [ "$stem" = "$dir" ] || return 1
  grep -Eq '^type:[[:space:]]*["'\'']?index["'\'']?[[:space:]]*$' "$f"
}

# The folder's index file exists: folder note when present, else legacy
# _index.md. Twin of indexFileOf in src/core/fs.ts.
_has_index_file() {
  local d="$1" name
  name=$(basename "$d")
  if [ -f "$d/$name.md" ] && _is_folder_note "$d/$name.md"; then return 0; fi
  [ -f "$d/_index.md" ]
}

if [ ! -d "$VAULT" ]; then
  red "Vault directory not found at '$VAULT'"
  printf 'Run /claude-wiki-pages:init to initialise, or set a different path: bash scripts/set-vault.sh <path>\n'
  exit 1
fi

# ──────────────────────────────────────────────
# CHECK 0: schema_version
# ──────────────────────────────────────────────
header "Schema version"

DECLARED=""
if [ -f "$VAULT_CLAUDE_MD" ]; then
  # Match both `schema_version: 1` and backtick forms like `schema_version: 1`.
  DECLARED=$(grep -oE '`?schema_version`?:[[:space:]]*`?[0-9]+`?' "$VAULT_CLAUDE_MD" | head -1 |
    grep -oE '[0-9]+' | head -1 || true)
  if [ -z "$DECLARED" ]; then
    red "$VAULT_CLAUDE_MD declares no schema_version. Add \`schema_version: 1\` near the top."
    ERRORS=$((ERRORS + 1))
  else
    SUPPORTED=0
    for v in "${SUPPORTED_SCHEMA_VERSIONS[@]}"; do
      if [ "$DECLARED" -eq "$v" ]; then
        SUPPORTED=1
        break
      fi
    done
    if [ "$SUPPORTED" -eq 1 ]; then
      green "schema_version $DECLARED supported"
    else
      red "schema_version $DECLARED is unsupported (this build supports: ${SUPPORTED_SCHEMA_VERSIONS[*]})"
      red "See CHANGELOG.md for migration notes."
      ERRORS=$((ERRORS + 1))
    fi
  fi
else
  yellow "$VAULT_CLAUDE_MD not found — skipping schema_version check"
fi

# ──────────────────────────────────────────────
# CHECK 1: Duplicate entries in index.md
# ──────────────────────────────────────────────
header "Index duplicates"

if [ ! -f "$INDEX" ]; then
  red "index.md not found at $INDEX"
  ERRORS=$((ERRORS + 1))
else
  # Extract all [[Page Title]] wikilinks from the body (skip frontmatter)
  BODY=$(sed -n '/^---$/,/^---$/d; p' "$INDEX")
  LINKS=$(echo "$BODY" | grep -oE '\[\[[^]|]+' | sed 's/\[\[//' | sort || true)
  DUPES=$(echo "$LINKS" | uniq -d)

  if [ -n "$DUPES" ]; then
    while IFS= read -r dup; do
      COUNT=$(echo "$LINKS" | grep -cxF "$dup")
      red "Duplicate in index.md: \"$dup\" appears $COUNT times"
      ERRORS=$((ERRORS + 1))
    done <<<"$DUPES"
  else
    LINK_COUNT=$(echo "$LINKS" | grep -c . || true)
    green "No duplicates in index.md ($LINK_COUNT unique entries)"
  fi

  # Check for pages in wiki that are NOT in the index
  while IFS= read -r filepath; do
    BASENAME=$(basename "$filepath" .md)
    # Skip bookkeeping files (by name, or a folder note)
    case "$BASENAME" in
      index | log | dashboard | manifest | _index | .gitkeep) continue ;;
    esac
    if _is_folder_note "$filepath"; then continue; fi
    # Extract the title from frontmatter
    TITLE=$(_fm_title "$filepath")
    if [ -z "$TITLE" ]; then
      TITLE="$BASENAME"
    fi
    if ! echo "$LINKS" | grep -qxF "$TITLE"; then
      yellow "Page not in index.md: \"$TITLE\" ($filepath)"
      WARNINGS=$((WARNINGS + 1))
    fi
  done < <(find "$WIKI" -name '*.md' -type f | sort)
fi

# ──────────────────────────────────────────────
# CHECK 2: sources fields use [[wikilinks]]
# ──────────────────────────────────────────────
header "Sources field format"

SOURCES_OK=0
SOURCES_BAD=0

while IFS= read -r filepath; do
  BASENAME=$(basename "$filepath" .md)
  case "$BASENAME" in
    index | log | dashboard | manifest | _index | .gitkeep) continue ;;
  esac
  if _is_folder_note "$filepath"; then continue; fi

  # Extract frontmatter block
  FRONTMATTER=$(sed -n '/^---$/,/^---$/p' "$filepath")

  # M11: use the shared _extract_sources_raw helper (DRY — previously duplicated
  # in CHECK 2, CHECK 4, and CHECK 5a).
  SOURCES_ENTRIES=$(printf '%s\n' "$FRONTMATTER" | _extract_sources_raw)

  if [ -z "$SOURCES_ENTRIES" ]; then
    continue
  fi

  while IFS= read -r entry; do
    # Skip empty entries
    [ -z "$entry" ] && continue || true
    # Check for [[wikilink]] format
    if echo "$entry" | grep -qE '^\[\[.+\]\]$'; then
      SOURCES_OK=$((SOURCES_OK + 1))
    else
      red "Plain string in sources: \"$entry\" in $(basename "$filepath")"
      SOURCES_BAD=$((SOURCES_BAD + 1))
      ERRORS=$((ERRORS + 1))
    fi
  done <<<"$SOURCES_ENTRIES"
done < <(find "$WIKI" -name '*.md' -type f | sort)

if [ "$SOURCES_BAD" -eq 0 ]; then
  green "All sources fields use [[wikilinks]] ($SOURCES_OK entries checked)"
else
  red "$SOURCES_BAD plain-string sources found ($SOURCES_OK OK)"
fi

# ──────────────────────────────────────────────
# CHECK 3: per-folder index (folder note or legacy _index.md) consistency
# with folder contents
# ──────────────────────────────────────────────
header "Index consistency"

# All per-folder index files: legacy _index.md plus folder notes.
_list_index_files() {
  local f
  while IFS= read -r f; do
    if [ "$(basename "$f")" = "_index.md" ] || _is_folder_note "$f"; then
      printf '%s\n' "$f"
    fi
  done < <(find "$WIKI" -name '*.md' -type f | sort)
}

while IFS= read -r index_file; do
  FOLDER=$(dirname "$index_file")
  FOLDER_NAME=$(basename "$FOLDER")
  INDEX_BASENAME=$(basename "$index_file")

  # Get children listed in the index frontmatter.
  # M06/M11: use the shared _extract_yaml_list helper (DRY + flattened nesting).
  INDEX_FRONTMATTER=$(sed -n '/^---$/,/^---$/p' "$index_file")
  INDEX_CHILDREN=$(printf '%s\n' "$INDEX_FRONTMATTER" | _extract_yaml_list "children")

  # Get actual .md files in this folder (excluding the index files themselves).
  ACTUAL_FILES=""
  while IFS= read -r f; do
    if _is_folder_note "$f"; then continue; fi
    TITLE=$(_fm_title "$f")
    if [ -n "$TITLE" ]; then
      ACTUAL_FILES="${ACTUAL_FILES}${TITLE}"$'\n'
    fi
  done < <(find "$FOLDER" -maxdepth 1 -name '*.md' -not -name '_index.md' -type f | sort)

  # Get actual subdirectories
  ACTUAL_SUBDIRS=""
  while IFS= read -r d; do
    [ -z "$d" ] && continue || true
    ACTUAL_SUBDIRS="${ACTUAL_SUBDIRS}$(basename "$d")"$'\n'
  done < <(find "$FOLDER" -mindepth 1 -maxdepth 1 -type d | sort)

  # Check: pages in folder but missing from index children
  while IFS= read -r title; do
    [ -z "$title" ] && continue || true
    if [ -n "$INDEX_CHILDREN" ]; then
      if ! echo "$INDEX_CHILDREN" | grep -qxF "$title"; then
        yellow "Page \"$title\" in $FOLDER_NAME/ but not in $FOLDER_NAME/$INDEX_BASENAME children"
        WARNINGS=$((WARNINGS + 1))
      fi
    else
      yellow "Page \"$title\" in $FOLDER_NAME/ but $INDEX_BASENAME has empty children list"
      WARNINGS=$((WARNINGS + 1))
    fi
  done <<<"$ACTUAL_FILES"

  # Check: entries in index children but no matching file
  while IFS= read -r child; do
    [ -z "$child" ] && continue || true
    if [ -n "$ACTUAL_FILES" ]; then
      if ! echo "$ACTUAL_FILES" | grep -qxF "$child"; then
        red "Index lists \"$child\" but no matching page found in $FOLDER_NAME/"
        ERRORS=$((ERRORS + 1))
      fi
    else
      red "Index lists \"$child\" but folder $FOLDER_NAME/ has no pages"
      ERRORS=$((ERRORS + 1))
    fi
  done <<<"$INDEX_CHILDREN"

  # Check: subdirectories should have corresponding child_indexes entries
  while IFS= read -r subdir; do
    [ -z "$subdir" ] && continue || true
    if ! _has_index_file "$FOLDER/$subdir"; then
      red "Subfolder $FOLDER_NAME/$subdir/ has no index file (folder note or _index.md)"
      ERRORS=$((ERRORS + 1))
    fi
  done <<<"$ACTUAL_SUBDIRS"

  green "$FOLDER_NAME/$INDEX_BASENAME checked"

done < <(_list_index_files)

# CHECK 3b: Source summaries referenced by at least one wiki page
header "Orphan source summaries"

SOURCES_DIR="$WIKI/_sources"
ORPHAN_SOURCES=0
if [ -d "$SOURCES_DIR" ]; then
  while IFS= read -r source_file; do
    # The source manifest (type: manifest) is bookkeeping, not a source summary;
    # the schema exempts it from index-membership checks, so it is never an orphan.
    SOURCE_TYPE=$(sed -n '/^---$/,/^---$/{/^type:/{s/^type: *//;s/ *$//;p;q;};}' "$source_file")
    if [ "$SOURCE_TYPE" = "manifest" ]; then
      continue
    fi
    SOURCE_TITLE=$(_fm_title "$source_file")
    if [ -z "$SOURCE_TITLE" ]; then
      SOURCE_TITLE=$(basename "$source_file" .md)
    fi
    # Search all wiki pages (excluding _sources/) for this source in their sources: field
    REFS=$(grep -rl "\[\[${SOURCE_TITLE}\]\]" "$WIKI" --include='*.md' 2>/dev/null | grep -v '/_sources/' | grep -v '/index\.md$' | grep -v '/log\.md$' | head -1 || true)
    if [ -z "$REFS" ]; then
      yellow "Orphan source: \"$SOURCE_TITLE\" ($(basename "$source_file")) — not referenced by any wiki page"
      WARNINGS=$((WARNINGS + 1))
      ORPHAN_SOURCES=$((ORPHAN_SOURCES + 1))
    fi
  done < <(find "$SOURCES_DIR" -name '*.md' -not -name '.gitkeep' -type f | sort)

  if [ "$ORPHAN_SOURCES" -eq 0 ]; then
    green "All source summaries are referenced by at least one wiki page"
  fi
else
  yellow "No _sources/ directory found"
fi

# Also check for topic folders that lack an index file entirely
while IFS= read -r dir; do
  [ -z "$dir" ] && continue || true
  DIRNAME=$(basename "$dir")
  # Skip special folders
  case "$DIRNAME" in
    _sources | _synthesis) continue ;;
  esac
  if ! _has_index_file "$dir"; then
    red "Topic folder $DIRNAME/ has no index file (folder note or _index.md)"
    ERRORS=$((ERRORS + 1))
  fi
done < <(find "$WIKI" -mindepth 1 -maxdepth 1 -type d | sort)

# ──────────────────────────────────────────────
# Legacy index filename (schema v3): at schema_version >= 3, a remaining
# wiki/**/_index.md is deprecated — folder notes (<dir>/<dirname>.md) are the
# v3 name. WARN with the migrate remediation; older vaults emit nothing.
# ──────────────────────────────────────────────
if [ -n "$DECLARED" ] && [ "$DECLARED" -ge 3 ]; then
  while IFS= read -r legacy_file; do
    [ -z "$legacy_file" ] && continue || true
    yellow "legacy-index-filename: $legacy_file uses the legacy _index.md name — rename to the folder note $(basename "$(dirname "$legacy_file")").md (run: bash scripts/engine.sh migrate --write)"
    WARNINGS=$((WARNINGS + 1))
  done < <(find "$WIKI" -name '_index.md' -type f | sort)
fi

# ──────────────────────────────────────────────
# CHECK 4: S4-derivation — staleness from updated vs newest cited-source date
#
# For each wiki page (excluding bookkeeping) that carries a sources: list,
# resolve each [[wikilink]] to the matching file in wiki/_sources/ (by title:
# or aliases: match). Find the newest date on the cited source (updated: first,
# then date_ingested:, then date_published:). If that source date is strictly
# newer than the wiki page's own updated:, emit a WARN-level "stale-source"
# finding. An unresolvable wikilink emits a separate "dangling-source" WARN and
# is NOT counted as fresh (source-relative, not calendar-relative; no auto-
# mutation of status:).
# ──────────────────────────────────────────────
header "Cited-source staleness (S4)"

# Helper: extract the first occurrence of a scalar frontmatter field.
# Usage: _fm_field <file> <field-name>
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

# Helper: given a wikilink target name (without [[ ]]), find the source file in
# _sources/ whose title: or aliases: contains that name.
# Prints the absolute filepath or nothing.
_resolve_source_wikilink() {
  local target="$1"
  local sources_dir="$2"
  [ -d "$sources_dir" ] || return 0
  while IFS= read -r candidate; do
    # Match against title:
    local title
    title=$(_fm_field "$candidate" "title")
    if [ "$title" = "$target" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
    # Match against aliases: (inline list, e.g. aliases: ["Foo", "foo"])
    local aliases_line
    aliases_line=$(sed -n '/^---$/,/^---$/p' "$candidate" |
      grep -m1 -E "^aliases:" || true)
    if [ -n "$aliases_line" ] && echo "$aliases_line" | grep -qF "\"${target}\""; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done < <(find "$sources_dir" -name '*.md' -not -name '.gitkeep' -type f | sort)
  # Not found
  return 0
}

# Helper: return the best available date from a source file (YYYY-MM-DD string).
# Priority: updated: > date_ingested: > date_published:
_source_best_date() {
  local file="$1"
  local d
  d=$(_fm_field "$file" "updated")
  [ -n "$d" ] && printf '%s\n' "$d" && return
  d=$(_fm_field "$file" "date_ingested")
  [ -n "$d" ] && printf '%s\n' "$d" && return
  d=$(_fm_field "$file" "date_published")
  [ -n "$d" ] && printf '%s\n' "$d" && return
  printf ''
}

STALE_SOURCE_FOUND=0

while IFS= read -r filepath; do
  BASENAME=$(basename "$filepath" .md)
  # Skip bookkeeping files; _sources/ pages are the targets, not the checkers.
  case "$BASENAME" in
    index | log | dashboard | manifest | _index | .gitkeep) continue ;;
  esac
  # Skip the _sources/ directory itself and _synthesis/.
  case "$filepath" in
    */_sources/*) continue ;;
    */_synthesis/*) continue ;;
  esac

  # Extract the wiki page's own updated: date.
  PAGE_UPDATED=$(_fm_field "$filepath" "updated")
  [ -z "$PAGE_UPDATED" ] && continue # no updated: field — skip staleness check

  # M11: use shared _extract_sources_raw helper (DRY — third occurrence).
  PAGE_SOURCES=$(sed -n '/^---$/,/^---$/p' "$filepath" | _extract_sources_raw)
  [ -z "$PAGE_SOURCES" ] && continue

  while IFS= read -r entry; do
    [ -z "$entry" ] && continue
    # Only process [[wikilink]] entries (plain-string check is CHECK 2).
    if echo "$entry" | grep -qE '^\[\[.+\]\]$'; then
      # Strip [[ and ]] to get target name; also strip alias suffix after |.
      TARGET=$(echo "$entry" | sed 's/^\[\[//' | sed 's/\]\]$//' | cut -d'|' -f1)
      # Resolve to a file in _sources/.
      SOURCE_FILE=$(_resolve_source_wikilink "$TARGET" "$WIKI/_sources")
      if [ -z "$SOURCE_FILE" ]; then
        yellow "dangling-source: \"${TARGET}\" cited by $(basename "$filepath") could not be resolved in _sources/"
        WARNINGS=$((WARNINGS + 1))
        STALE_SOURCE_FOUND=$((STALE_SOURCE_FOUND + 1))
        continue
      fi
      SOURCE_DATE=$(_source_best_date "$SOURCE_FILE")
      if [ -z "$SOURCE_DATE" ]; then
        continue # source has no date field — cannot evaluate staleness
      fi
      # Compare YYYY-MM-DD strings lexicographically (valid for ISO dates).
      # Stale when source_date is strictly greater than page_updated.
      if [[ "$SOURCE_DATE" > "$PAGE_UPDATED" ]]; then
        PAGE_TITLE=$(_fm_field "$filepath" "title")
        [ -z "$PAGE_TITLE" ] && PAGE_TITLE="$BASENAME"
        yellow "stale-source: \"${PAGE_TITLE}\" ($(basename "$filepath")) updated ${PAGE_UPDATED} but cited source \"${TARGET}\" has date ${SOURCE_DATE}"
        WARNINGS=$((WARNINGS + 1))
        STALE_SOURCE_FOUND=$((STALE_SOURCE_FOUND + 1))
      fi
    fi
  done <<<"$PAGE_SOURCES"
done < <(find "$WIKI" -name '*.md' -type f | sort)

if [ "$STALE_SOURCE_FOUND" -eq 0 ]; then
  green "All cited sources are current (no staleness findings)"
fi

# ──────────────────────────────────────────────
# CHECK 5: I3 — provenance-completeness
#
# 5a. source-presence: a page whose type: is one of entity / concept / topic /
#     project / synthesis MUST have at least one entry in sources:.  An empty
#     or absent sources: list is an ERROR.  Pages whose sources: list is
#     non-empty but contains malformed entries are already caught by CHECK 2;
#     this check counts only the presence of at least one entry and must NOT
#     double-flag those pages.
#
# 5b. derived/confidence consistency: a page with derived: true must keep
#     confidence < 0.8.  Any violation is a WARN.
# ──────────────────────────────────────────────
header "Provenance completeness (I3)"

SOURCE_REQUIRING_TYPES="entity concept topic project synthesis"
PROVENANCE_ERRORS=0
DERIVED_WARNS=0

while IFS= read -r filepath; do
  BASENAME=$(basename "$filepath" .md)
  # Skip bookkeeping files.
  case "$BASENAME" in
    index | log | dashboard | manifest | _index | .gitkeep) continue ;;
  esac
  # Skip _sources/ and _synthesis/ directories.
  case "$filepath" in
    */_sources/*) continue ;;
    */_synthesis/*) continue ;;
  esac

  # Read the type: field from frontmatter.
  PAGE_TYPE=$(sed -n '/^---$/,/^---$/p' "$filepath" |
    grep -m1 -E '^type:[[:space:]]' | sed 's/^type:[[:space:]]*//' | tr -d "\"'" || true)

  # ── 5a: source-presence ──────────────────────────────────────────────────
  # Only check source-requiring types.
  IS_REQUIRING=0
  for t in $SOURCE_REQUIRING_TYPES; do
    if [ "$PAGE_TYPE" = "$t" ]; then
      IS_REQUIRING=1
      break
    fi
  done

  if [ "$IS_REQUIRING" -eq 1 ]; then
    # Count entries in sources: via the shared helper. We need the raw count
    # regardless of format so that malformed-but-present entries are not
    # double-flagged. M11: uses _extract_sources_raw instead of an inline awk.
    _fm_block=$(sed -n '/^---$/,/^---$/p' "$filepath")
    ENTRY_COUNT=$(printf '%s\n' "$_fm_block" | _extract_sources_raw | grep -c . || true)
    ENTRY_COUNT="${ENTRY_COUNT:-0}"

    if [ "$ENTRY_COUNT" -eq 0 ]; then
      PAGE_TITLE=$(_fm_title "$filepath")
      [ -z "$PAGE_TITLE" ] && PAGE_TITLE="$BASENAME"
      red "no-sources: \"${PAGE_TITLE}\" ($(basename "$filepath")) has type \"${PAGE_TYPE}\" but no sources entries"
      PROVENANCE_ERRORS=$((PROVENANCE_ERRORS + 1))
      ERRORS=$((ERRORS + 1))
    fi
  fi

  # ── 5b: derived/confidence consistency ────────────────────────────────────
  DERIVED_VAL=$(sed -n '/^---$/,/^---$/p' "$filepath" |
    grep -m1 -E '^derived:[[:space:]]' | sed 's/^derived:[[:space:]]*//' | tr -d "\"'" || true)

  if [ "$DERIVED_VAL" = "true" ]; then
    CONF_VAL=$(sed -n '/^---$/,/^---$/p' "$filepath" |
      grep -m1 -E '^confidence:[[:space:]]' | sed 's/^confidence:[[:space:]]*//' | tr -d "\"'" || true)
    if [ -n "$CONF_VAL" ]; then
      # Use awk for floating-point comparison (bash arithmetic is integer-only).
      IS_HIGH=$(awk -v c="$CONF_VAL" 'BEGIN { print (c + 0 >= 0.8) ? "1" : "0" }')
      if [ "$IS_HIGH" = "1" ]; then
        PAGE_TITLE=$(_fm_title "$filepath")
        [ -z "$PAGE_TITLE" ] && PAGE_TITLE="$BASENAME"
        yellow "derived-high-confidence: \"${PAGE_TITLE}\" ($(basename "$filepath")) has derived: true but confidence ${CONF_VAL} >= 0.8 — lower confidence to reflect inferred status"
        DERIVED_WARNS=$((DERIVED_WARNS + 1))
        WARNINGS=$((WARNINGS + 1))
      fi
    fi
  fi

done < <(find "$WIKI" -name '*.md' -type f | sort)

if [ "$PROVENANCE_ERRORS" -eq 0 ] && [ "$DERIVED_WARNS" -eq 0 ]; then
  green "All provenance checks passed"
fi

# ──────────────────────────────────────────────
# FU1 (ADR-0028): dangling-wikilink WARN check
#
# One WARN per (page, distinct-normalised-target) whose [[link]] resolves to
# no page in wiki/.  Resolution model (identical to the TS twin in
# src/core/wikilink-check.ts and scripts/graph-quality.sh):
#
#   A link [[T]] resolves iff, case-insensitively, the normalised target
#   (stripped of "|alias", "#heading", "^block") equals:
#     - the filename stem of some page, OR
#     - the title: value of some page, OR
#     - any aliases: entry of some page.
#
# BOOKKEEPING pages (index, log, dashboard, manifest, _index, .gitkeep) and
# folder notes (type: index, stem == dir name) are skipped as subjects.
# All pages contribute to the resolvable-name set (targets are not filtered).
#
# Implementation uses an inline python3 block (same pattern as
# scripts/graph-quality.sh) so the regex and normalisation are byte-identical
# across both bash-twin and TS-engine on every vault.
# ──────────────────────────────────────────────
header "Dangling wikilinks (FU1)"

if ! command -v python3 >/dev/null 2>&1; then
  yellow "python3 not found — dangling-wikilink check skipped"
else
  DANGLING_WARNS=0
  # Run the python3 block; capture its output as "COUNT\tFILE\tTARGET" lines.
  # Each line is one (file, distinct-normalised-target) pair that dangles.
  DANGLING_OUTPUT=$(
    VERIFY_WIKI="$WIKI" python3 - <<'PY'
import os, re

wiki = os.environ["VERIFY_WIKI"]

BOOKKEEPING_STEMS = {"index", "log", "dashboard", "manifest", "_index", ".gitkeep"}
LINK_RE = re.compile(r"\[\[([^\[\]]+?)\]\]")

def norm(s):
    return s.strip().lower()

def normalise_target(raw):
    """Strip |alias, #heading, ^block, then lower+strip."""
    t = raw
    pipe = t.find("|")
    if pipe != -1:
        t = t[:pipe]
    hash_ = t.find("#")
    if hash_ != -1:
        t = t[:hash_]
    caret = t.find("^")
    if caret != -1:
        t = t[:caret]
    return t.strip().lower()

def split_frontmatter(text):
    if not text.startswith("---"):
        return "", text
    end = text.find("\n---", 3)
    if end == -1:
        return "", text
    return text[3:end], text[end + 4:]

def parse_title_aliases(text):
    """Tolerant extraction of title: and aliases: — mirrors graph-quality.sh."""
    fm, _ = split_frontmatter(text)
    title = None
    aliases = []
    lines = fm.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        m = re.match(r"^title:\s*(.+?)\s*$", line)
        if m:
            title = m.group(1).strip().strip('"').strip("'")
        m = re.match(r"^aliases:\s*(.*)$", line)
        if m:
            rest = m.group(1).strip()
            if rest.startswith("["):
                items = re.findall(r"\"([^\"]*)\"|'([^']*)'", rest)
                if items:
                    for a, b in items:
                        val = a or b
                        if val:
                            aliases.append(val)
                else:
                    for piece in rest.strip("[]").split(","):
                        piece = piece.strip().strip('"').strip("'")
                        if piece:
                            aliases.append(piece)
            else:
                j = i + 1
                while j < len(lines):
                    bm = re.match(r"^\s*-\s*(.+?)\s*$", lines[j])
                    if bm:
                        aliases.append(bm.group(1).strip().strip('"').strip("'"))
                        j += 1
                    else:
                        break
                i = j - 1
        i += 1
    return title, aliases

def is_folder_note(full_path, stem, parent_name):
    """Matches _is_folder_note in verify-ingest.sh: stem==parent AND type: index."""
    if stem != parent_name:
        return False
    try:
        text = open(full_path, encoding="utf-8").read()
    except Exception:
        return False
    return bool(re.search(r"^type:\s*[\"']?index[\"']?\s*$", text, re.MULTILINE))

# ── Pass 1: build the resolvable-name set (ALL pages are potential targets) ──
resolvable = set()
for dirpath, _dirs, files in os.walk(wiki):
    for fn in sorted(files):
        if not fn.endswith(".md"):
            continue
        stem = fn[:-3]
        resolvable.add(norm(stem))
        full = os.path.join(dirpath, fn)
        try:
            text = open(full, encoding="utf-8").read()
        except Exception:
            continue
        title, aliases = parse_title_aliases(text)
        if title:
            resolvable.add(norm(title))
        for a in aliases:
            resolvable.add(norm(a))

# ── Pass 2: scan non-bookkeeping pages as subjects ───────────────────────────
for dirpath, _dirs, files in os.walk(wiki):
    for fn in sorted(files):
        if not fn.endswith(".md"):
            continue
        stem = fn[:-3]
        # Skip bookkeeping stems.
        if stem in BOOKKEEPING_STEMS:
            continue
        parent_name = os.path.basename(dirpath)
        full = os.path.join(dirpath, fn)
        # Skip folder notes (type: index, stem == parent dir name).
        if is_folder_note(full, stem, parent_name):
            continue

        try:
            text = open(full, encoding="utf-8").read()
        except Exception:
            continue

        rel = os.path.relpath(full, wiki)
        seen_norms = set()
        for raw in LINK_RE.findall(text):
            nt = normalise_target(raw)
            if not nt or nt in seen_norms:
                continue
            seen_norms.add(nt)
            if nt not in resolvable:
                # Display form: strip alias/anchor for readability.
                display = raw
                pipe = display.find("|")
                if pipe != -1:
                    display = display[:pipe]
                hash_ = display.find("#")
                if hash_ != -1:
                    display = display[:hash_]
                caret = display.find("^")
                if caret != -1:
                    display = display[:caret]
                display = display.strip()
                # Output two lines per finding: FILE then TARGET.
                # Bash twin reads them in pairs below.
                print(rel)
                print(display)
PY
  )

  # Emit one WARN per (file, target) pair and count.
  # Python output: alternating lines — FILE, TARGET, FILE, TARGET, ...
  # Read them in pairs with a two-read loop.
  if [ -n "$DANGLING_OUTPUT" ]; then
    while IFS= read -r dangling_file && IFS= read -r dangling_target; do
      [ -z "$dangling_file" ] && continue || true
      yellow "dangling-wikilink: [[${dangling_target}]] in ${dangling_file} has no matching page (stem, title, or alias)"
      DANGLING_WARNS=$((DANGLING_WARNS + 1))
      WARNINGS=$((WARNINGS + 1))
    done <<<"$DANGLING_OUTPUT"
  fi

  if [ "$DANGLING_WARNS" -eq 0 ]; then
    green "No dangling wikilinks found"
  fi
fi

# ──────────────────────────────────────────────
# SUMMARY
# ──────────────────────────────────────────────
header "Summary"
printf "Errors:   %d\n" "$ERRORS"
printf "Warnings: %d\n" "$WARNINGS"

if [ "$ERRORS" -gt 0 ]; then
  red "Verification failed — fix errors before continuing"
  exit 1
else
  if [ "$WARNINGS" -gt 0 ]; then
    yellow "Passed with warnings"
  else
    green "All checks passed"
  fi
  exit 0
fi
