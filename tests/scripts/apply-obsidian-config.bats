#!/usr/bin/env bats
# Tests for scripts/apply-obsidian-config.sh — deterministic .obsidian writer.
#
# Behaviors under test (ADR-0035):
#   - Script declares set -euo pipefail.
#   - Exits 0 and skips when wiki/ is absent.
#   - Converges an Obsidian-default graph.json to the island filter:
#     search filter set, hideUnresolved:true, showTags:false.
#   - Asserts app.json userIgnoreFilters + new-file keys.
#   - Preserves unrelated graph keys (force params) and existing colorGroups.
#   - Idempotent: a second run reports unchanged.
#   - --check exits 0 in sync, exit 3 on drift, and never writes.

load '../test_helper/common'

SCRIPT="$REPO_ROOT/scripts/apply-obsidian-config.sh"

setup() {
  _load_helpers
  VAULT="$BATS_TEST_TMPDIR/vault"
  mkdir -p "$VAULT/wiki/product" "$VAULT/wiki/legal" "$VAULT/wiki/_sources" \
    "$VAULT/.obsidian"
}

teardown() {
  rm -rf "$VAULT"
}

@test "Obsidian config: the writer declares set -euo pipefail" {
  grep -qF 'set -euo pipefail' "$SCRIPT"
}

@test "Obsidian config: exits 0 and skips when wiki/ is absent" {
  rm -rf "$VAULT/wiki"
  run bash "$SCRIPT" --target "$VAULT"
  assert_success
  assert_output_contains "no wiki/"
}

@test "Obsidian config: converges an Obsidian-default graph.json to the island filter" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  # Obsidian's harmful defaults + an unrelated force param that must survive.
  printf '{"search":"","showTags":true,"hideUnresolved":false,"scale":0.5,"colorGroups":[]}\n' \
    >"$VAULT/.obsidian/graph.json"

  run bash "$SCRIPT" --target "$VAULT"
  assert_success

  run cat "$VAULT/.obsidian/graph.json"
  assert_output_contains 'wiki/_sources/'
  assert_output_contains '"hideUnresolved": true'
  assert_output_contains '"showTags": false'
  assert_output_contains '"scale": 0.5'
}

@test "Obsidian config: asserts the app.json exclusions and new-file keys" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  printf '{"useMarkdownLinks":false}\n' >"$VAULT/.obsidian/app.json"

  run bash "$SCRIPT" --target "$VAULT"
  assert_success

  run cat "$VAULT/.obsidian/app.json"
  assert_output_contains '"userIgnoreFilters"'
  assert_output_contains '"raw/"'
  assert_output_contains '"newFileFolderPath": "_inbox"'
  assert_output_contains '"useMarkdownLinks": false'
}

@test "Obsidian config: appends color groups for topic folders in a merge-only way" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  # An existing group for product must be preserved; legal gets appended.
  printf '{"colorGroups":[{"query":"path:wiki/product","color":{"a":1,"rgb":111}}]}\n' \
    >"$VAULT/.obsidian/graph.json"

  run bash "$SCRIPT" --target "$VAULT"
  assert_success

  run cat "$VAULT/.obsidian/graph.json"
  assert_output_contains '"rgb": 111'          # existing product color untouched
  assert_output_contains 'path:wiki/legal'      # legal appended
}

@test "Obsidian config: is idempotent — a second run reports unchanged" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  bash "$SCRIPT" --target "$VAULT" >/dev/null

  run bash "$SCRIPT" --target "$VAULT"
  assert_success
  assert_output_contains "graph[unchanged]"
  assert_output_contains "app[unchanged]"
}

@test "Obsidian config: --check exits 3 on drift and 0 in sync, and never writes" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  printf '{"search":""}\n' >"$VAULT/.obsidian/graph.json"
  local before
  before="$(cat "$VAULT/.obsidian/graph.json")"

  run bash "$SCRIPT" --check --target "$VAULT"
  assert_equal "$status" 3
  assert_equal "$(cat "$VAULT/.obsidian/graph.json")" "$before"  # no write

  # Bring it in sync, then --check must pass.
  bash "$SCRIPT" --target "$VAULT" >/dev/null
  run bash "$SCRIPT" --check --target "$VAULT"
  assert_success
}
