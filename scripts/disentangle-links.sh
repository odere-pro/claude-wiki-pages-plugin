#!/bin/bash
# disentangle-links.sh — enforce topic-local linking so the Obsidian graph forms
# clean topic islands instead of one dense hairball (ADR-0033).
#
# The wiki over-links: every topic folder cross-references every other through
# `related:` frontmatter and inline body [[wikilinks]], plus the synthesis note
# and log.md fan out to detail pages. In Obsidian's force graph that fuses all
# seven topic folders into a single tangled component (see tmp images 6/7). The
# target shape is per-topic islands (tmp image 8): edges stay WITHIN a topic;
# cross-topic references survive as readable text, not graph edges.
#
# Policy (the refined linking algorithm — same rule the authoring skills now
# follow, see docs/adr/ADR-0033 and the CLAUDE.md "Topic-local linking" rule):
#   KEEP   a [[link]] iff the target resolves to a page in the SAME top-level
#          topic folder as the source, OR the link is part of the navigation
#          spine (`parent:` up to the folder note / index), OR a provenance
#          citation (`sources:` → wiki/_sources/**, never demoted — provenance
#          is load-bearing data), OR the source is the folder note / index.md.
#   DEMOTE a cross-topic body [[Target|Display]] to plain `Display` (or `Target`
#          when unpiped). The reader still sees the concept; the graph edge dies.
#   PRUNE  cross-topic entries from `related:` frontmatter lists.
#   CAP    `_synthesis/**` and `log.md` to folder-note links only; their
#          detail-page links are demoted to text.
#
# Resolution model mirrors scripts/graph-quality.sh (ADR-0031): path/basename/
# title/alias, case-insensitive, code spans/fences skipped. Thin bash wrapper
# over scripts/disentangle-links.ts (Bun), which reuses the engine's own resolver
# (src/core/link-resolver.ts); no network — consistent with the NO-RAG stance.
#
# Usage:
#   scripts/disentangle-links.sh [--target <vault>] [--apply] [--json]
# Default is a DRY RUN: it reports what would change and writes nothing.
# `--apply` rewrites the wiki files in place (run inside git; changes are
# reversible with `git checkout`). Exit 0 always.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

TARGET=""
APPLY=0
JSON=0
while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      TARGET="${2:-}"
      shift 2
      ;;
    --apply)
      APPLY=1
      shift
      ;;
    --json)
      JSON=1
      shift
      ;;
    -h | --help)
      sed -n '2,40p' "$0"
      exit 0
      ;;
    *)
      echo "disentangle-links: unknown arg: $1" >&2
      exit 0
      ;;
  esac
done

if [ -z "$TARGET" ]; then
  # shellcheck source=resolve-vault.sh
  source "${SCRIPT_DIR}/resolve-vault.sh"
  TARGET="$(resolve_vault)"
fi
if ! command -v bun >/dev/null 2>&1; then
  echo "[claude-wiki-pages] disentangle-links: Bun not found — skipped." >&2
  exit 0
fi
if [ ! -d "$TARGET/wiki" ]; then
  echo "[claude-wiki-pages] disentangle-links: no wiki/ under '$TARGET'." >&2
  exit 0
fi

DL_ARGS=(--target "$TARGET")
[ "$APPLY" = "1" ] && DL_ARGS+=(--apply)
[ "$JSON" = "1" ] && DL_ARGS+=(--json)
exec bun "$SCRIPT_DIR/disentangle-links.ts" "${DL_ARGS[@]}"
