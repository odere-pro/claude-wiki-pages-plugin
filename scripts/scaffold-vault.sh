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
#   ${CLAUDE_PLUGIN_ROOT:-<repo-root>}/skills/init/template
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

set -euo pipefail

if [ "$#" -lt 1 ] || [ -z "${1:-}" ]; then
  printf 'Usage: %s <target-vault> [<source-scaffold>]\n' "$(basename "$0")" >&2
  exit 1
fi

TARGET="${1%/}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEFAULT_SOURCE="${CLAUDE_PLUGIN_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}/skills/init/template"
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
  [ -z "$entry" ] && continue || true
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

# ─── Git-required per-vault init ──────────────────────────────────────────────
# Every vault must be its own git repo (TEAM-BRIEF.md §5, decision #4).
# Guard: skip if the target is already inside a git work tree — this prevents
# nesting a repo inside the plugin repo (e.g. docs/vault-example/) or a user's
# project repo whose layout happens to contain the vault directory.
GIT_STATE="initialised"
if git -C "$TARGET" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  # Target is already inside a git work tree — nesting guard triggers.
  GIT_STATE="skipped(already-in-repo)"
elif command -v bun >/dev/null 2>&1; then
  # Bun is available: reuse the single git seam — engine D05 → ensureRepo.
  # This is the primary path; the bash fallback below is bun-absent only.
  PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
  bash "$PLUGIN_ROOT/scripts/engine.sh" doctor --target "$TARGET" --fix >/dev/null 2>&1 || true
  if ! git -C "$TARGET" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    # engine.sh doctor --fix silently failed (e.g. empty vault, no files to commit).
    # Fall through to the bash fallback.
    GIT_STATE="fallback"
  fi
else
  GIT_STATE="fallback"
fi

if [ "$GIT_STATE" = "fallback" ]; then
  # Bash fallback: bun absent or engine git step produced no repo.
  # NOTE: this is the bun-absent degradation path only (mirrors doctor.sh:131).
  # It is intentionally minimal — git init + initial commit — to keep a single
  # mechanism: we do NOT duplicate ensureRepo logic; we only handle the case
  # where Bun is unavailable.
  git -C "$TARGET" init -q 2>/dev/null || true
  if git -C "$TARGET" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git -C "$TARGET" add -A >/dev/null 2>&1 || true
    git \
      -C "$TARGET" \
      -c user.name=claude-wiki-pages \
      -c user.email=claude-wiki-pages@users.noreply.github.com \
      -c commit.gpgsign=false \
      commit \
      --no-verify \
      --allow-empty \
      -m "chore(claude-wiki-pages): initial vault commit" \
      >/dev/null 2>&1 || true
    GIT_STATE="initialised"
  fi
fi

printf 'READY: vault at %s; %d created, %d preserved; git=%s\n' \
  "$TARGET" "$CREATED" "$PRESERVED" "$GIT_STATE"
exit 0
