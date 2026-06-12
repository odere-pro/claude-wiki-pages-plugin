#!/usr/bin/env bash
# tests/smoke/ablation-smoke.sh — opt-in scaffolding-ablation smoke
# (docs/adr/ADR-0020-scaffolding-ablation-eval.md).
#
# Runs ONE golden case (ingest-extract / extract-basic) through both arms of
# the ablation with the configured local model, scores both candidates with
# the model-neutral scorer, and asserts the directional invariant the plugin
# claims: the plugin arm is >= the baseline arm on schema_validity AND
# claim_source_fidelity. Prints the mini side-by-side table.
#
# Self-skips (exit 0 with a [SKIP] marker) unless BOTH hold:
#   - CLAUDE_WIKI_PAGES_EVAL_MODEL names a model (the eval-tier opt-in), and
#   - the Ollama endpoint answers the /api/tags preflight.
# CI never runs the live path (no model env there).
#
# Exit codes: 0 invariant holds (or SKIP) · 1 invariant violated ·
# 2 produce/score error (fail-closed — an unmeasurable smoke never passes).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CASE="extract-basic"
ENDPOINT="${OLLAMA_HOST:-http://localhost:11434}"

MODEL="${CLAUDE_WIKI_PAGES_EVAL_MODEL:-}"
if [ -z "$MODEL" ]; then
  echo "[SKIP] ablation smoke is opt-in — set CLAUDE_WIKI_PAGES_EVAL_MODEL=<model>"
  exit 0
fi
if ! curl -sS --fail --connect-timeout 5 "$ENDPOINT/api/tags" >/dev/null 2>&1; then
  echo "[SKIP] Ollama endpoint not answering at $ENDPOINT — ablation smoke needs a live model"
  exit 0
fi

OUT="$(mktemp -d -t claude-wiki-pages-ablation-smoke.XXXXXX)"
trap 'rm -rf "$OUT"' EXIT
SLUG=$(printf '%s' "$MODEL" | tr ':/' '--')

echo "[ablation-smoke] $MODEL × $CASE — producing both arms"
bash "$REPO_ROOT/scripts/eval-produce-ollama.sh" --model "$MODEL" --case "$CASE" \
  --out "$OUT/plugin" --retries 2 ||
  {
    echo "ERROR: plugin-arm produce failed" >&2
    exit 2
  }
bash "$REPO_ROOT/scripts/eval-produce-baseline.sh" --tier ingest-extract --model "$MODEL" \
  --case "$CASE" --out "$OUT/baseline" --retries 2 ||
  {
    echo "ERROR: baseline-arm produce failed" >&2
    exit 2
  }

GOLD="$REPO_ROOT/tests/eval/ingest-extract/cases/$CASE/expected"
INPUT="$REPO_ROOT/tests/eval/ingest-extract/cases/$CASE/input.md"

score_arm() { # $1 = candidate dir, $2 = out json — rc 0/1 are measurements
  bash "$REPO_ROOT/scripts/eval-ingest-extract.sh" --score "$1" --gold "$GOLD" \
    --input "$INPUT" --json >"$2"
  local rc=$?
  [ "$rc" -lt 2 ] || {
    echo "ERROR: scorer unscorable (rc $rc) for $1" >&2
    exit 2
  }
  jq -e . "$2" >/dev/null 2>&1 || {
    echo "ERROR: invalid score JSON for $1" >&2
    exit 2
  }
}

set +e
score_arm "$OUT/plugin/$SLUG/$CASE" "$OUT/plugin.scores.json"
score_arm "$OUT/baseline/$SLUG-baseline/$CASE" "$OUT/baseline.scores.json"
set -e

metric() { jq -r ".$2" "$OUT/$1.scores.json"; }

P_SCHEMA=$(metric plugin schema_validity)
P_FID=$(metric plugin claim_source_fidelity)
B_SCHEMA=$(metric baseline schema_validity)
B_FID=$(metric baseline claim_source_fidelity)

echo ""
echo "metric|plugin|baseline"
echo "schema_validity|$P_SCHEMA|$B_SCHEMA"
echo "claim_source_fidelity|$P_FID|$B_FID"
echo "verdict|$(metric plugin verdict)|$(metric baseline verdict)"
echo ""

ge() { awk -v a="$1" -v b="$2" 'BEGIN { exit !(a >= b) }'; }

FAIL=0
ge "$P_SCHEMA" "$B_SCHEMA" || {
  echo "FAIL: plugin schema_validity $P_SCHEMA < baseline $B_SCHEMA"
  FAIL=1
}
ge "$P_FID" "$B_FID" || {
  echo "FAIL: plugin claim_source_fidelity $P_FID < baseline $B_FID"
  FAIL=1
}
[ "$FAIL" -eq 0 ] || exit 1
echo "[ablation-smoke] OK: plugin arm >= baseline arm on schema_validity and claim_source_fidelity"
