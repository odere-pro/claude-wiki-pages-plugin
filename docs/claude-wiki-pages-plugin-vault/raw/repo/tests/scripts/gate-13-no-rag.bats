#!/usr/bin/env bats
# Tests for tests/gates/gate-13-no-rag.sh — the NO-RAG static enforcement gate.
#
# Behavior under test (§5/§11.1 NO-RAG invariant — must not fail open):
#   - The gate's --self-test mode plants forbidden tokens (fetch(, vector,
#     .embed() in temp files and asserts the scanner catches each — guarding
#     against the unbalanced-paren / swallowed-error fail-open regression.
#   - The gate passes on the real (clean) retrieval path.
#   - A planted forbidden token in a scanned retrieval file makes the gate FAIL
#     (exit non-zero) — this is the direct reproduction that previously passed
#     with exit 0 because `grep -nE 'fetch('` errored (exit 2) and pipefail
#     without -e swallowed it.

load '../test_helper/common'

setup() {
  _load_helpers
  GATE="$REPO_ROOT/tests/gates/gate-13-no-rag.sh"
}

# ---------------------------------------------------------------------------
# Self-test mode: the gate proves its own enforcement is live.
# ---------------------------------------------------------------------------

@test "gate-13: --self-test passes (planted forbidden tokens are caught)" {
  run bash "$GATE" --self-test
  assert_success
  assert_output_contains "planted fetch( is caught"
  assert_output_contains "planted vector is caught"
  assert_output_contains "planted .embed( is caught"
  assert_output_contains "self-test passed"
}

# ---------------------------------------------------------------------------
# Real retrieval path is clean.
# ---------------------------------------------------------------------------

@test "gate-13: passes on the real (clean) retrieval path" {
  run bash "$GATE"
  assert_success
  assert_output_contains "no RAG/embedding/vector/network tokens"
}

# ---------------------------------------------------------------------------
# Direct fail-open reproduction: a planted fetch( in a scanned file must FAIL.
# ---------------------------------------------------------------------------

@test "gate-13: a planted fetch( in a retrieval file makes the gate FAIL" {
  local target="$REPO_ROOT/src/core/stem.ts"
  local backup
  backup="$(mktemp "${BATS_TEST_TMPDIR:-/tmp}/stem-backup.XXXXXX")"
  cp "$target" "$backup"

  # Plant the exact fail-open repro line.
  printf '\nconst v = await fetch("http://x/embed");\n' >>"$target"

  run bash "$GATE"
  local rc="$status"
  local out="$output"

  # Restore BEFORE asserting so a failed assertion never leaves the tree dirty.
  cp "$backup" "$target"
  rm -f "$backup"

  # The gate must have FAILED (exit 1) and named the forbidden token.
  if [ "$rc" -eq 0 ]; then
    printf 'gate-13 FAILED to catch planted fetch( (exit 0 = fail-open)\noutput:\n%s\n' "$out" >&2
    return 1
  fi
  assert_contains "$out" "fetch"
}

# ---------------------------------------------------------------------------
# A planted plain-token (vector) in a scanned file must FAIL.
# ---------------------------------------------------------------------------

@test "gate-13: a planted 'vector' token in a retrieval file makes the gate FAIL" {
  local target="$REPO_ROOT/src/core/stem.ts"
  local backup
  backup="$(mktemp "${BATS_TEST_TMPDIR:-/tmp}/stem-backup.XXXXXX")"
  cp "$target" "$backup"

  printf '\nconst idx = makeVectorStore(); // vector index\n' >>"$target"

  run bash "$GATE"
  local rc="$status"
  local out="$output"

  cp "$backup" "$target"
  rm -f "$backup"

  if [ "$rc" -eq 0 ]; then
    printf 'gate-13 FAILED to catch planted vector (exit 0 = fail-open)\noutput:\n%s\n' "$out" >&2
    return 1
  fi
  assert_contains "$out" "vector"
}
