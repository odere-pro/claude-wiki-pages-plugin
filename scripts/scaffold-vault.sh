#!/bin/bash
# scripts/scaffold-vault.sh — idempotent vault scaffolding.
#
# Usage: scripts/scaffold-vault.sh <target-vault> [<source-scaffold>]
#
# Ensures <target-vault> exists and contains every top-level entry present in
# <source-scaffold>. Missing entries are copied from the source; existing
# entries are left untouched (no-clobber). Safe to run repeatedly.
#
# If <source-scaffold> is omitted, defaults to
#   ${CLAUDE_PLUGIN_ROOT:-<repo-root>}/skills/llm-wiki/template
# — the empty starter vault that ships inside the onboarding skill so it is
# guaranteed to be present in the runtime plugin install. (docs/vault-example/
# is the populated demo; the onboarding skill copies from the skill's own
# template, not the demo.)
#
# Exit codes:
#   0 — vault scaffolded or already complete (idempotent success).
#   1 — usage error, missing source, or copy failure.
#
# Stdout contract (for the caller to parse / surface to the user):
#   CREATED: <path>       — copied from source (one line per entry)
#   EXISTS:  <path>       — already present, left as-is (one line per entry)
#   MISSING-IN-SOURCE: <name>  — required entry absent from scaffold source
#   READY: vault at <target-vault>; <N> created, <M> preserved
#
# Required entries are derived from the source tree — the authoritative
# scaffold is whatever the plugin ships.

set -uo pipefail

if [ "$#" -lt 1 ] || [ -z "${1:-}" ]; then
  printf 'Usage: %s <target-vault> [<source-scaffold>]\n' "$(basename "$0")" >&2
  exit 1
fi

TARGET="${1%/}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEFAULT_SOURCE="${CLAUDE_PLUGIN_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}/skills/llm-wiki/template"
SOURCE="${2:-$DEFAULT_SOURCE}"
SOURCE="${SOURCE%/}"

if [ ! -d "$SOURCE" ]; then
  printf '[scaffold-vault] ERROR: source scaffold not found at %s\n' "$SOURCE" >&2
  exit 1
fi

if ! mkdir -p "$TARGET"; then
  printf '[scaffold-vault] ERROR: cannot create target %s\n' "$TARGET" >&2
  exit 1
fi

CREATED=0
PRESERVED=0

# Iterate every top-level entry in source (files and directories, including
# dotfiles). `find -mindepth 1 -maxdepth 1` is portable on BSD and GNU.
while IFS= read -r entry; do
  [ -z "$entry" ] && continue
  name="$(basename "$entry")"
  # Skip common filesystem noise so it doesn't land in user vaults.
  case "$name" in
    .DS_Store | Thumbs.db) continue ;;
  esac

  dest="$TARGET/$name"
  if [ -e "$dest" ]; then
    printf 'EXISTS:  %s\n' "$dest"
    PRESERVED=$((PRESERVED + 1))
    continue
  fi

  if ! cp -R "$entry" "$dest"; then
    printf '[scaffold-vault] ERROR: copy failed for %s -> %s\n' "$entry" "$dest" >&2
    exit 1
  fi
  printf 'CREATED: %s\n' "$dest"
  CREATED=$((CREATED + 1))
done < <(find "$SOURCE" -mindepth 1 -maxdepth 1 2>/dev/null | sort)

printf 'READY: vault at %s; %d created, %d preserved\n' "$TARGET" "$CREATED" "$PRESERVED"
exit 0
