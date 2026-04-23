#!/usr/bin/env bash
# tests/smoke/fresh-install.sh — Tier 2 smoke test.
#
# End-to-end "clone → onboard → ingest one source → verify" flow.
#
# Runs in two modes depending on Claude Code CLI availability:
#
#   CLI present (local dev machine with `claude` in PATH):
#     Runs the real flow. Each STUB block is replaced with its live command
#     when Phase E wires the CLI into CI.
#
#   CLI absent (default in CI until Phase E):
#     Skips the STUB steps, exits 0 with a [SKIP] marker. The local
#     verify-ingest.sh call against a pre-built fixture still runs so the
#     script is not a total no-op.
#
# See docs/SPECIFICATION.md §13 for the test contract.

set -euo pipefail

# Resolve repo root from this script's location.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# -- Guard: require Claude Code CLI for the full flow. ------------------------

if ! command -v claude >/dev/null 2>&1; then
  echo "[SKIP] Claude Code CLI not available — smoke test stubbed"
  exit 0
fi

echo "[smoke] Claude Code CLI detected at: $(command -v claude)"

# -- Stage 1: scaffold a throwaway project directory. -------------------------

TMP_PROJECT="$(mktemp -d -t llm-wiki-smoke.XXXXXX)"
trap 'rm -rf "$TMP_PROJECT"' EXIT
echo "[smoke] Scratch project: $TMP_PROJECT"

mkdir -p "$TMP_PROJECT"
cd "$TMP_PROJECT"

# -- Stage 2: install the plugin from the repo path. --------------------------

# STUB: requires Claude Code CLI in PATH and real plugin installation.
# Example (fill in during Phase E):
#   claude -p /plugin install "$REPO_ROOT"
echo "[smoke] (STUB) plugin install from $REPO_ROOT"

# -- Stage 3: onboarding wizard. ----------------------------------------------

# STUB: requires Claude Code CLI + non-interactive wizard mode.
# Example:
#   claude -p /llm-wiki-stack:llm-wiki --non-interactive --accept-defaults
echo "[smoke] (STUB) run /llm-wiki-stack:llm-wiki"

# -- Stage 4: drop a fixture source into vault/raw/. --------------------------

mkdir -p "$TMP_PROJECT/vault/raw"
cp "$REPO_ROOT/tests/fixtures/minimal-vault/raw/sample.md" "$TMP_PROJECT/vault/raw/"

# Also seed the wiki side so verify-ingest has something to check.
cp -R "$REPO_ROOT/tests/fixtures/minimal-vault/wiki" "$TMP_PROJECT/vault/"
cp "$REPO_ROOT/tests/fixtures/minimal-vault/CLAUDE.md" "$TMP_PROJECT/vault/"
echo "[smoke] Seeded vault/ from minimal-vault fixture"

# -- Stage 5: ingest the source. ----------------------------------------------

# STUB: requires Claude Code CLI + ingest skill invocation.
# Example:
#   claude -p /llm-wiki-stack:llm-wiki-ingest --non-interactive
echo "[smoke] (STUB) run /llm-wiki-stack:llm-wiki-ingest"

# -- Stage 6: verify the post-ingest state. -----------------------------------

echo "[smoke] running verify-ingest.sh against the scratch vault"
if "$REPO_ROOT/scripts/verify-ingest.sh" "$TMP_PROJECT/vault"; then
  echo "[smoke] PASS"
  exit 0
else
  echo "[smoke] FAIL — verify-ingest.sh exited non-zero"
  exit 1
fi
