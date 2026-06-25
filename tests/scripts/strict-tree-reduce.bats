#!/usr/bin/env bats
# Tests for scripts/strict-tree-reduce.sh — strict-tree remediation (ADR-0036).
#
# Behaviors under test:
#   - Declares strict mode (set -euo pipefail).
#   - Skips gracefully when wiki/ is absent.
#   - Dry-run (default) writes nothing.
#   - --apply on the tangled fixture → spine-only graph: treeConformance=1,
#     nonSpineEdgeCount=0, crossTreeEdgeCount=0, danglingCount=0.
#   - Tag de-cycle: a demoted cross-tree edge adds topic/<tree> to the source.
#   - Spine + provenance fields (parent/sources) are never touched.
#   - Idempotent: a second --apply changes 0 files.

load '../test_helper/common'

SCRIPT="$REPO_ROOT/scripts/strict-tree-reduce.sh"

setup() {
  _load_helpers
  VAULT="$BATS_TEST_TMPDIR/vault"
  # Copy-then-mutate: the committed fixture stays pristine.
  cp -R "$REPO_ROOT/tests/fixtures/tangled-vault" "$VAULT"
}

teardown() {
  rm -rf "$VAULT"
}

@test "Strict-tree reduce: the script declares set -euo pipefail (strict mode)" {
  run grep -qE '^set -euo pipefail' "$SCRIPT"
  assert_success
}

@test "Strict-tree reduce: skips gracefully when the wiki/ directory is absent" {
  local empty="$BATS_TEST_TMPDIR/empty"
  mkdir -p "$empty"
  run bash "$SCRIPT" --target "$empty"
  assert_success
  assert_output_contains "no wiki/"
}

@test "Strict-tree reduce: the default dry-run writes nothing" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  before="$(cat "$VAULT/wiki/alpha/a1.md")"
  run bash "$SCRIPT" --target "$VAULT"
  assert_success
  after="$(cat "$VAULT/wiki/alpha/a1.md")"
  assert_eq "$before" "$after"
}

@test "Strict-tree reduce: --apply yields a spine-only graph with conformance 1 and no danglers" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  command -v jq >/dev/null 2>&1 || skip "jq not available"
  run bash "$SCRIPT" --target "$VAULT" --apply
  assert_success

  gq="$(bun "$REPO_ROOT/scripts/graph-quality.ts" --target "$VAULT" --json)"
  assert_eq "$(printf '%s' "$gq" | jq -r '.treeConformance')" "1"
  assert_eq "$(printf '%s' "$gq" | jq -r '.nonSpineEdgeCount')" "0"
  assert_eq "$(printf '%s' "$gq" | jq -r '.crossTreeEdgeCount')" "0"
  assert_eq "$(printf '%s' "$gq" | jq -r '.transitiveRedundantEdgeCount')" "0"
  assert_eq "$(printf '%s' "$gq" | jq -r '.danglingCount')" "0"
}

@test "Strict-tree reduce: --apply adds topic/<tree> de-cycle tags for demoted cross-tree edges" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  run bash "$SCRIPT" --target "$VAULT" --apply
  assert_success
  # a1 (alpha) linked b1 (beta) → topic/beta; b1 (beta) linked a1 (alpha) → topic/alpha.
  run grep -E '^tags:.*topic/beta' "$VAULT/wiki/alpha/a1.md"
  assert_success
  run grep -E '^tags:.*topic/alpha' "$VAULT/wiki/beta/b1.md"
  assert_success
}

@test "Strict-tree reduce: never touches the spine and provenance fields (parent, sources)" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  run bash "$SCRIPT" --target "$VAULT" --apply
  assert_success
  # parent spine link preserved verbatim.
  run grep -F 'parent: "[[alpha|Alpha]]"' "$VAULT/wiki/alpha/a1.md"
  assert_success
  # sources field preserved (empty list here, but the line stays).
  run grep -E '^sources:' "$VAULT/wiki/alpha/a1.md"
  assert_success
}

@test "Strict-tree reduce: is idempotent — a second --apply changes 0 files" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  command -v jq >/dev/null 2>&1 || skip "jq not available"
  bash "$SCRIPT" --target "$VAULT" --apply >/dev/null
  run bash "$SCRIPT" --target "$VAULT" --apply --json
  assert_success
  assert_eq "$(printf '%s' "$output" | jq -r '.filesChanged')" "0"
}
