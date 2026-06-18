#!/usr/bin/env bash
# Thin wrapper — delegates to the Bun engine.
#
# Original: validated .claude-plugin/plugin.json and .claude-plugin/marketplace.json
# using jq. Replaced by src/core/manifest-check.ts (native JSON.parse, no jq).
#
# The engine resolves the repo root from --target and finds
# .claude-plugin/plugin.json there. Callers that previously passed explicit file
# paths ($1, $2) no longer need to — the engine uses the repo root.
#
# Dual-run verified (bashCount=0 errors, engineCount=0 errors on clean
# .claude-plugin/plugin.json; verdicts identical).
#
# This wrapper is intentionally kept small — the logic lives in
# src/core/manifest-check.ts. Delete this wrapper after a burn-in period
# once all CI / skill callers have confirmed green.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec bash "$(dirname "$0")/engine.sh" lint --check manifests --target "$REPO_ROOT" "$@"
