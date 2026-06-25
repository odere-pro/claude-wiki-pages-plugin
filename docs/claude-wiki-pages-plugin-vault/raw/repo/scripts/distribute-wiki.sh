#!/bin/bash
# scripts/distribute-wiki.sh — export wiki pages as plain markdown.
#
# Thin wrapper: delegates to the Bun engine `export` verb.
# All logic now lives in src/commands/export/export.ts (migrated, Phase 1,
# tmp/migration-plan.md §3). This wrapper preserves every caller signature and
# the original stdout (`READY: …`) and exit codes.
#
# Usage:
#   scripts/distribute-wiki.sh [--target <vault>] [--links] [--tree] [--clean]
#
# Flags:
#   --target <vault>  Override the resolved vault path.
#   --links           Keep wikilinks as [Title](title-slug.md) markdown links.
#   --tree            Write one file per wiki page (mirror tree) to output/wiki/.
#   --clean           Remove the existing output target before writing.
#
# Exit codes (preserved):
#   0 — export succeeded.
#   1 — usage error or vault not found.

set -euo pipefail

ENGINE_ARGS=(export)

while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      ENGINE_ARGS+=(--target "${2%/}")
      shift 2
      ;;
    --links)
      ENGINE_ARGS+=(--links)
      shift
      ;;
    --tree)
      ENGINE_ARGS+=(--tree)
      shift
      ;;
    --clean)
      ENGINE_ARGS+=(--clean)
      shift
      ;;
    -h | --help)
      sed -n '8,21p' "$0"
      exit 0
      ;;
    *)
      printf '[distribute-wiki] ERROR: unknown argument: %s\n' "$1" >&2
      exit 1
      ;;
  esac
done

exec bash "$(dirname "$0")/engine.sh" "${ENGINE_ARGS[@]}"
