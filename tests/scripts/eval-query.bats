#!/usr/bin/env bats
# Tests for scripts/eval-query.sh — the MODEL-NEUTRAL query-tier scorer
# (docs/adr/ADR-0019-query-tier-and-answer-verification.md).
#
# H13 regression lock: eval-query.sh MUST source the single canonical
# normalize_ws from scripts/eval-normalize-ws.sh (DRY, ADR-0017) and must NOT
# carry a second inline definition. The self-test exercises the quote-matching
# path that calls normalize_ws, so a forked/missing implementation would cause
# those cases to fail with a "command not found" error (rc 2) rather than the
# expected PASS/FAIL verdict.
#
# Behavior under test:
#   - --self-test PASSES (all five cases produce the expected verdict).
#   - The good-answer case (whitespace-normalized verbatim quote) PASSES.
#   - A fabricated quote (not verbatim in the page) is FLOORED (FAIL, rc 1).
#   - A nonexistent cited page is FLOORED (FAIL, rc 1).
#   - A malformed protocol dies rc 2 (fail-closed, never a silent verdict).
#   - A coverage mismatch (gold expects "none", model claims "full") FAILs.
#   - normalize_ws is sourced from eval-normalize-ws.sh (no inline duplicate).
#
# §5 NO-RAG: scoring is EXACT verbatim substring match after whitespace
# normalization — never embeddings, vectors, cosine, or similarity.
#
# TDD: this file was authored to pin the H13 DRY fix and give the first
# Tier-1 coverage to eval-query.sh. The --self-test and source-check tests
# ran RED when only the old inline normalize_ws existed; they turned GREEN
# once the source directive was wired.

load '../test_helper/common'

setup() {
  _load_helpers
  DRIVER="$REPO_ROOT/scripts/eval-query.sh"
  NORMALIZE_HELPER="$REPO_ROOT/scripts/eval-normalize-ws.sh"

  # Build a minimal vault + gold + answer fixtures in a temp directory.
  TMPVAULT="$(mktemp -d "${BATS_TEST_TMPDIR:-/tmp}/eval-query-test.XXXXXX")"
  mkdir -p "$TMPVAULT/vault/wiki/tools"
  cat >"$TMPVAULT/vault/wiki/tools/widget.md" <<'MDEOF'
---
title: "Widget"
aliases: ["Widget", "widget"]
---
# Widget
The widget spins at nine thousand rpm.
MDEOF

  cat >"$TMPVAULT/gold.json" <<'JSONEOF'
{"expected_coverage":"full","required_citations":["Widget"],
 "required_quotes":["The widget spins at nine thousand rpm."]}
JSONEOF

  cat >"$TMPVAULT/good.txt" <<'ANSEOF'
===ANSWER===
The widget spins at nine thousand rpm.
===COVERAGE: full===
===CITATIONS===
[[Widget]] | "The widget spins at nine thousand rpm."
===END===
ANSEOF

  cat >"$TMPVAULT/fabquote.txt" <<'ANSEOF'
===ANSWER===
It spins very fast.
===COVERAGE: full===
===CITATIONS===
[[Widget]] | "The widget spins at ten thousand rpm."
===END===
ANSEOF

  cat >"$TMPVAULT/fabpage.txt" <<'ANSEOF'
===ANSWER===
See the gizmo page.
===COVERAGE: full===
===CITATIONS===
[[Gizmo]] | "The widget spins at nine thousand rpm."
===END===
ANSEOF

  printf 'no protocol at all\n' >"$TMPVAULT/malformed.txt"

  cat >"$TMPVAULT/gold-none.json" <<'JSONEOF'
{"expected_coverage":"none","required_citations":[],"required_quotes":[]}
JSONEOF
}

# ---------------------------------------------------------------------------
# H13 DRY regression lock: the shared helper must exist and eval-query.sh
# must source it rather than carrying an inline duplicate.
# ---------------------------------------------------------------------------

@test "Eval query: the shared eval-normalize-ws.sh helper exists" { # spec H13
  [ -f "$NORMALIZE_HELPER" ]
}

@test "Eval query: eval-query.sh sources eval-normalize-ws.sh rather than carrying an inline duplicate" { # spec H13
  # The source directive must be present.
  grep -qF 'eval-normalize-ws.sh' "$DRIVER"
}

@test "Eval query: eval-query.sh has no inline normalize_ws function definition" { # spec H13
  # An inline `normalize_ws()` definition would re-introduce the H13 fork.
  # The only definition must live in eval-normalize-ws.sh.
  # We search for a function-declaration line (name followed by '()' or
  # 'function' keyword), which is how the old duplicate was structured.
  if grep -qE '^(function )?normalize_ws[[:space:]]*\(\)' "$DRIVER"; then
    echo "FAIL: eval-query.sh contains an inline normalize_ws() definition — H13 DRY fix has been reverted" >&2
    return 1
  fi
}

# ---------------------------------------------------------------------------
# Driver existence and executability (the RED→GREEN boundary).
# ---------------------------------------------------------------------------

@test "Eval query: driver script exists" {
  [ -f "$DRIVER" ]
}

@test "Eval query: driver script is executable" {
  [ -x "$DRIVER" ]
}

# ---------------------------------------------------------------------------
# --self-test mode: the driver proves its own enforcement is live (fail-closed).
# This exercises all five built-in cases, including the normalize_ws path.
# ---------------------------------------------------------------------------

@test "Eval query: --self-test passes with all five built-in cases producing the expected verdict" {
  run bash "$DRIVER" --self-test
  assert_success
  assert_output_contains "good answer passes"
  assert_output_contains "fabricated quote is floored"
  assert_output_contains "nonexistent cited page is floored"
  assert_output_contains "malformed protocol dies rc 2"
  assert_output_contains "coverage mismatch fails"
  assert_output_contains "self-test passed"
}

# ---------------------------------------------------------------------------
# --self-test must run without any configured local model.
# ---------------------------------------------------------------------------

@test "Eval query: --self-test runs without any configured local model" {
  run env -u CLAUDE_WIKI_PAGES_EVAL_MODEL bash "$DRIVER" --self-test
  assert_success
  assert_output_contains "self-test passed"
}

# ---------------------------------------------------------------------------
# Individual scoring cases — exercise the normalize_ws code path directly.
# ---------------------------------------------------------------------------

@test "Eval query: good answer with a verbatim whitespace-normalized quote verdicts PASS at rc 0" {
  run bash "$DRIVER" --answer "$TMPVAULT/good.txt" --gold "$TMPVAULT/gold.json" --vault "$TMPVAULT/vault"
  assert_success
  assert_output_contains "PASS"
}

@test "Eval query: good answer emits a JSON scorecard with the expected keys" {
  run bash "$DRIVER" --answer "$TMPVAULT/good.txt" --gold "$TMPVAULT/gold.json" --vault "$TMPVAULT/vault" --json
  assert_success
  assert_output_contains "verdict"
  assert_output_contains "citation_recall"
  assert_output_contains "quote_coverage"
  assert_output_contains "fabricated_citations"
  # JSON verdict must be pass.
  echo "$output" | jq -e '.verdict == "pass"'
}

@test "Eval query: a fabricated quote that is not verbatim in the page verdicts FAIL at rc 1" {
  # normalize_ws is called inside verify_citations; a forked/missing
  # implementation would produce rc 2 (command-not-found via set -u), not rc 1.
  run bash "$DRIVER" --answer "$TMPVAULT/fabquote.txt" --gold "$TMPVAULT/gold.json" --vault "$TMPVAULT/vault"
  assert_status 1
  assert_output_contains "FAIL"
}

@test "Eval query: a nonexistent cited page verdicts FAIL at rc 1" {
  run bash "$DRIVER" --answer "$TMPVAULT/fabpage.txt" --gold "$TMPVAULT/gold.json" --vault "$TMPVAULT/vault"
  assert_status 1
  assert_output_contains "FAIL"
}

@test "Eval query: a malformed answer protocol dies rc 2, fail-closed and never silent" {
  run bash "$DRIVER" --answer "$TMPVAULT/malformed.txt" --gold "$TMPVAULT/gold.json" --vault "$TMPVAULT/vault"
  assert_status 2
}

@test "Eval query: a coverage mismatch where gold is none and answer is full verdicts FAIL at rc 1" {
  run bash "$DRIVER" --answer "$TMPVAULT/good.txt" --gold "$TMPVAULT/gold-none.json" --vault "$TMPVAULT/vault"
  assert_status 1
  assert_output_contains "FAIL"
}

# ---------------------------------------------------------------------------
# §5 NO-RAG: the scorer makes no network call (fail-closed self-contained).
# We verify by running without OLLAMA_HOST / any model env vars and confirming
# the exit code is 0 (PASS) — a network call to a missing endpoint would
# either hang or produce a non-zero exit with a curl error, not a PASS verdict.
# ---------------------------------------------------------------------------

@test "Eval query: scorer makes no network call, returning a PASS verdict without any model env" {
  run env -u OLLAMA_HOST -u CLAUDE_WIKI_PAGES_EVAL_MODEL \
    bash "$DRIVER" --answer "$TMPVAULT/good.txt" --gold "$TMPVAULT/gold.json" --vault "$TMPVAULT/vault"
  assert_success
  assert_output_contains "PASS"
}
