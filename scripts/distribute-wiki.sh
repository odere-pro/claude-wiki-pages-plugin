#!/bin/bash
# scripts/distribute-wiki.sh — export wiki pages as plain markdown.
#
# Default: one consolidated markdown file at <vault>/output/wiki.md.
# Every wiki page is concatenated, frontmatter stripped, [[wikilinks]]
# flattened to plain text. Suitable for handing to a reader who does not
# have Obsidian.
#
# With --tree, writes a mirror directory instead: <vault>/output/wiki/
# preserving the source paths, one file per wiki page.
#
# Output lives under <vault>/output/ — per vault/CLAUDE.md, that is
# schema-free, git-ignored scratch space. No hook or validator touches it.
#
# Usage:
#   scripts/distribute-wiki.sh [--target <vault>] [--links] [--tree] [--clean]
#
#   --target <vault>  Override the resolved vault path.
#   --links           Keep wikilinks as [Title](title-slug.md) markdown links
#                     instead of flattening to plain text.
#   --tree            Write one file per wiki page (mirror tree) to
#                     <vault>/output/wiki/ instead of a single consolidated file.
#   --clean           Remove the existing output target before writing.
#
# Exit codes:
#   0 — output produced.
#   1 — usage error or vault not found.

set -uo pipefail

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"

VAULT=$(resolve_vault)
LINKS=0
TREE=0
CLEAN=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --target)
      VAULT="${2%/}"
      shift 2
      ;;
    --links)
      LINKS=1
      shift
      ;;
    --tree)
      TREE=1
      shift
      ;;
    --clean)
      CLEAN=1
      shift
      ;;
    -h | --help)
      sed -n '2,28p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      printf 'Unknown flag: %s\n' "$1" >&2
      exit 1
      ;;
  esac
done

WIKI="$VAULT/wiki"

if [ ! -d "$WIKI" ]; then
  printf '[distribute-wiki] ERROR: wiki directory not found at %s\n' "$WIKI" >&2
  exit 1
fi

# [[Title]] → Title (flatten) or [Title](title-slug.md) (with --links).
transform() {
  if [ "$LINKS" -eq 1 ]; then
    awk '
      {
        while (match($0, /\[\[[^\]]+\]\]/)) {
          label = substr($0, RSTART+2, RLENGTH-4)
          slug = tolower(label)
          gsub(/[^a-z0-9]+/, "-", slug)
          sub(/^-+|-+$/, "", slug)
          $0 = substr($0, 1, RSTART-1) "[" label "](" slug ".md)" substr($0, RSTART+RLENGTH)
        }
        print
      }
    '
  else
    sed -E 's/\[\[([^]]+)\]\]/\1/g'
  fi
}

# Strip YAML frontmatter block.
strip_frontmatter() {
  awk '
    NR==1 && /^---$/ { fm=1; next }
    fm && /^---$/    { fm=0; next }
    !fm              { print }
  ' "$1"
}

if [ "$TREE" -eq 1 ]; then
  # ── Mirror-tree mode ────────────────────────────────────────────────────
  DIST="$VAULT/output/wiki"
  [ "$CLEAN" -eq 1 ] && [ -d "$DIST" ] && rm -rf "$DIST"
  mkdir -p "$DIST"

  COUNT=0
  while IFS= read -r -d '' src; do
    rel="${src#"$WIKI"/}"
    out="$DIST/$rel"
    mkdir -p "$(dirname "$out")"
    strip_frontmatter "$src" | transform >"$out"
    COUNT=$((COUNT + 1))
  done < <(find "$WIKI" -type f -name "*.md" -print0 2>/dev/null)

  printf 'READY: %d pages written to %s (tree mode)\n' "$COUNT" "$DIST"
  exit 0
fi

# ── Default: single-file mode ──────────────────────────────────────────────
OUT="$VAULT/output/wiki.md"
mkdir -p "$(dirname "$OUT")"
[ "$CLEAN" -eq 1 ] && [ -f "$OUT" ] && rm -f "$OUT"

# Section order: index.md, log.md, topic folders (sorted) with _index.md
# first then children (sorted), then _sources/, then _synthesis/.
collect_paths() {
  local top="$WIKI"
  # Always-first files.
  [ -f "$top/index.md" ] && printf '%s\n' "$top/index.md"
  [ -f "$top/log.md" ] && printf '%s\n' "$top/log.md"
  # Topic folders (excluding _sources, _synthesis, and any dotfile/meta).
  local dir
  while IFS= read -r dir; do
    local name
    name="$(basename "$dir")"
    case "$name" in _sources | _synthesis | _*) continue ;; esac
    [ -f "$dir/_index.md" ] && printf '%s\n' "$dir/_index.md"
    find "$dir" -type f -name '*.md' ! -name '_index.md' 2>/dev/null | sort
  done < <(find "$top" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort)
  # Meta folders last.
  [ -d "$top/_sources" ] && find "$top/_sources" -type f -name '*.md' 2>/dev/null | sort
  [ -d "$top/_synthesis" ] && find "$top/_synthesis" -type f -name '*.md' 2>/dev/null | sort
}

{
  printf '# Wiki Export\n\n'
  printf 'Generated from vault at `%s` on %s.\n\n' "$VAULT" "$(date +%Y-%m-%d)"
  printf '%s\n\n' '---'
  COUNT=0
  while IFS= read -r src; do
    [ -z "$src" ] && continue
    rel="${src#"$WIKI"/}"
    printf '<!-- %s -->\n\n' "$rel"
    strip_frontmatter "$src" | transform
    printf '\n%s\n\n' '---'
    COUNT=$((COUNT + 1))
  done < <(collect_paths)
} >"$OUT"

printf 'READY: %d pages consolidated into %s\n' "$COUNT" "$OUT"
