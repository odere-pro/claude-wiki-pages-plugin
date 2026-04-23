#!/bin/bash
# Post-ingest verification script
# Checks: duplicate index entries, sources field format, index consistency
# Usage: .claude/scripts/verify-ingest.sh [vault-path]
# Exit 0 = all clean, Exit 1 = issues found

VAULT="${1:-vault}"
WIKI="$VAULT/wiki"
INDEX="$WIKI/index.md"
VAULT_CLAUDE_MD="$VAULT/CLAUDE.md"
SUPPORTED_SCHEMA_VERSIONS=(1)

ERRORS=0
WARNINGS=0

red()    { printf '\033[0;31mERROR: %s\033[0m\n' "$1"; }
yellow() { printf '\033[0;33mWARN:  %s\033[0m\n' "$1"; }
green()  { printf '\033[0;32mOK:    %s\033[0m\n' "$1"; }
header() { printf '\n\033[1m=== %s ===\033[0m\n' "$1"; }

# ──────────────────────────────────────────────
# CHECK 0: schema_version
# ──────────────────────────────────────────────
header "Schema version"

if [ -f "$VAULT_CLAUDE_MD" ]; then
  # Match both `schema_version: 1` and backtick forms like `schema_version: 1`.
  DECLARED=$(grep -oE '`?schema_version`?:[[:space:]]*`?[0-9]+`?' "$VAULT_CLAUDE_MD" | head -1 \
              | grep -oE '[0-9]+' | head -1)
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
  LINKS=$(echo "$BODY" | grep -oE '\[\[[^]|]+' | sed 's/\[\[//' | sort)
  DUPES=$(echo "$LINKS" | uniq -d)

  if [ -n "$DUPES" ]; then
    while IFS= read -r dup; do
      COUNT=$(echo "$LINKS" | grep -cxF "$dup")
      red "Duplicate in index.md: \"$dup\" appears $COUNT times"
      ERRORS=$((ERRORS + 1))
    done <<< "$DUPES"
  else
    LINK_COUNT=$(echo "$LINKS" | grep -c .)
    green "No duplicates in index.md ($LINK_COUNT unique entries)"
  fi

  # Check for pages in wiki that are NOT in the index
  while IFS= read -r filepath; do
    BASENAME=$(basename "$filepath" .md)
    # Skip bookkeeping files
    case "$BASENAME" in
      index|log|dashboard|_index|.gitkeep) continue ;;
    esac
    # Extract the title from frontmatter
    TITLE=$(sed -n '/^---$/,/^---$/{/^title:/{s/^title: *"*//;s/"*$//;p;q;};}' "$filepath")
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
    index|log|dashboard|_index|.gitkeep) continue ;;
  esac

  # Extract frontmatter block
  FRONTMATTER=$(sed -n '/^---$/,/^---$/p' "$filepath")

  # Extract sources array entries — handles both inline and multi-line YAML
  # Inline: sources: ["[[A]]", "[[B]]"]
  # Multi-line:
  #   sources:
  #     - "[[A]]"
  #     - "[[B]]"
  SOURCES_ENTRIES=$(echo "$FRONTMATTER" | awk '
    /^sources:/ {
      # Check for inline array on same line
      if ($0 ~ /\[/) {
        # Extract items from inline array
        line = $0
        # Strip key and outermost brackets only (not inner [[ ]])
        sub(/^sources:[[:space:]]*\[/, "", line)
        sub(/\][[:space:]]*$/, "", line)
        n = split(line, items, ",")
        for (i = 1; i <= n; i++) {
          gsub(/^[[:space:]"'\'']+|[[:space:]"'\'']+$/, "", items[i])
          if (items[i] != "") print items[i]
        }
        next
      }
      # Multi-line array — read subsequent "  - " lines
      while ((getline line) > 0) {
        if (line !~ /^[[:space:]]*-/) break
        gsub(/^[[:space:]]*-[[:space:]]*"?/, "", line)
        gsub(/"?[[:space:]]*$/, "", line)
        if (line != "") print line
      }
    }
  ')

  if [ -z "$SOURCES_ENTRIES" ]; then
    continue
  fi

  while IFS= read -r entry; do
    # Skip empty entries
    [ -z "$entry" ] && continue
    # Check for [[wikilink]] format
    if echo "$entry" | grep -qE '^\[\[.+\]\]$'; then
      SOURCES_OK=$((SOURCES_OK + 1))
    else
      red "Plain string in sources: \"$entry\" in $(basename "$filepath")"
      SOURCES_BAD=$((SOURCES_BAD + 1))
      ERRORS=$((ERRORS + 1))
    fi
  done <<< "$SOURCES_ENTRIES"
done < <(find "$WIKI" -name '*.md' -type f | sort)

if [ "$SOURCES_BAD" -eq 0 ]; then
  green "All sources fields use [[wikilinks]] ($SOURCES_OK entries checked)"
else
  red "$SOURCES_BAD plain-string sources found ($SOURCES_OK OK)"
fi

# ──────────────────────────────────────────────
# CHECK 3: _index.md consistency with folder contents
# ──────────────────────────────────────────────
header "Index consistency"

while IFS= read -r index_file; do
  FOLDER=$(dirname "$index_file")
  FOLDER_NAME=$(basename "$FOLDER")

  # Get children listed in the index frontmatter
  INDEX_FRONTMATTER=$(sed -n '/^---$/,/^---$/p' "$index_file")
  INDEX_CHILDREN=$(echo "$INDEX_FRONTMATTER" | awk '
    /^children:/ {
      if ($0 ~ /\[/) {
        line = $0
        gsub(/.*\[/, "", line)
        gsub(/\].*/, "", line)
        n = split(line, items, ",")
        for (i = 1; i <= n; i++) {
          gsub(/^[ "'\'']+|[ "'\'']+$/, "", items[i])
          gsub(/^\[\[|\]\]$/, "", items[i])
          if (items[i] != "") print items[i]
        }
        next
      }
      while ((getline line) > 0) {
        if (line !~ /^[[:space:]]*-/) break
        gsub(/^[[:space:]]*-[[:space:]]*"?/, "", line)
        gsub(/"?[[:space:]]*$/, "", line)
        gsub(/^\[\[|\]\]$/, "", line)
        if (line != "") print line
      }
    }
  ')

  INDEX_CHILD_INDEXES=$(echo "$INDEX_FRONTMATTER" | awk '
    /^child_indexes:/ {
      if ($0 ~ /\[/) {
        line = $0
        gsub(/.*\[/, "", line)
        gsub(/\].*/, "", line)
        n = split(line, items, ",")
        for (i = 1; i <= n; i++) {
          gsub(/^[ "'\'']+|[ "'\'']+$/, "", items[i])
          gsub(/^\[\[|\]\]$/, "", items[i])
          if (items[i] != "") print items[i]
        }
        next
      }
      while ((getline line) > 0) {
        if (line !~ /^[[:space:]]*-/) break
        gsub(/^[[:space:]]*-[[:space:]]*"?/, "", line)
        gsub(/"?[[:space:]]*$/, "", line)
        gsub(/^\[\[|\]\]$/, "", line)
        if (line != "") print line
      }
    }
  ')

  # Get actual .md files in this folder (excluding _index.md itself)
  ACTUAL_FILES=""
  while IFS= read -r f; do
    TITLE=$(sed -n '/^---$/,/^---$/{/^title:/{s/^title: *"*//;s/"*$//;p;q;};}' "$f")
    if [ -n "$TITLE" ]; then
      ACTUAL_FILES="${ACTUAL_FILES}${TITLE}"$'\n'
    fi
  done < <(find "$FOLDER" -maxdepth 1 -name '*.md' -not -name '_index.md' -type f | sort)

  # Get actual subdirectories
  ACTUAL_SUBDIRS=""
  while IFS= read -r d; do
    [ -z "$d" ] && continue
    ACTUAL_SUBDIRS="${ACTUAL_SUBDIRS}$(basename "$d")"$'\n'
  done < <(find "$FOLDER" -mindepth 1 -maxdepth 1 -type d | sort)

  # Check: pages in folder but missing from index children
  while IFS= read -r title; do
    [ -z "$title" ] && continue
    if [ -n "$INDEX_CHILDREN" ]; then
      if ! echo "$INDEX_CHILDREN" | grep -qxF "$title"; then
        yellow "Page \"$title\" in $FOLDER_NAME/ but not in $FOLDER_NAME/_index.md children"
        WARNINGS=$((WARNINGS + 1))
      fi
    else
      yellow "Page \"$title\" in $FOLDER_NAME/ but _index.md has empty children list"
      WARNINGS=$((WARNINGS + 1))
    fi
  done <<< "$ACTUAL_FILES"

  # Check: entries in index children but no matching file
  while IFS= read -r child; do
    [ -z "$child" ] && continue
    if [ -n "$ACTUAL_FILES" ]; then
      if ! echo "$ACTUAL_FILES" | grep -qxF "$child"; then
        red "Index lists \"$child\" but no matching page found in $FOLDER_NAME/"
        ERRORS=$((ERRORS + 1))
      fi
    else
      red "Index lists \"$child\" but folder $FOLDER_NAME/ has no pages"
      ERRORS=$((ERRORS + 1))
    fi
  done <<< "$INDEX_CHILDREN"

  # Check: subdirectories should have corresponding child_indexes entries
  while IFS= read -r subdir; do
    [ -z "$subdir" ] && continue
    if [ ! -f "$FOLDER/$subdir/_index.md" ]; then
      red "Subfolder $FOLDER_NAME/$subdir/ has no _index.md"
      ERRORS=$((ERRORS + 1))
    fi
  done <<< "$ACTUAL_SUBDIRS"

  green "$FOLDER_NAME/_index.md checked"

done < <(find "$WIKI" -name '_index.md' -type f | sort)

# CHECK 3b: Source summaries referenced by at least one wiki page
header "Orphan source summaries"

SOURCES_DIR="$WIKI/_sources"
ORPHAN_SOURCES=0
if [ -d "$SOURCES_DIR" ]; then
  while IFS= read -r source_file; do
    SOURCE_TITLE=$(sed -n '/^---$/,/^---$/{/^title:/{s/^title: *"*//;s/"*$//;p;q;};}' "$source_file")
    if [ -z "$SOURCE_TITLE" ]; then
      SOURCE_TITLE=$(basename "$source_file" .md)
    fi
    # Search all wiki pages (excluding _sources/) for this source in their sources: field
    REFS=$(grep -rl "\[\[${SOURCE_TITLE}\]\]" "$WIKI" --include='*.md' 2>/dev/null | grep -v '/_sources/' | grep -v '/index\.md$' | grep -v '/log\.md$' | head -1)
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

# Also check for topic folders that lack an _index.md entirely
while IFS= read -r dir; do
  [ -z "$dir" ] && continue
  DIRNAME=$(basename "$dir")
  # Skip special folders
  case "$DIRNAME" in
    _sources|_synthesis) continue ;;
  esac
  if [ ! -f "$dir/_index.md" ]; then
    red "Topic folder $DIRNAME/ has no _index.md"
    ERRORS=$((ERRORS + 1))
  fi
done < <(find "$WIKI" -mindepth 1 -maxdepth 1 -type d | sort)

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
