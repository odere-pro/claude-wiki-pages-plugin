#!/usr/bin/env bats
# Tests for scripts/tree-lint.sh — read-only strict-tree conformance report
# (ADR-0036).
#
# Behaviors under test:
#   - Declares strict mode (set -euo pipefail).
#   - Exits 0 always (it reports; callers gate).
#   - Skips gracefully when wiki/ is absent.
#   - --json emits valid JSON with the metric keys.
#   - A spine-only vault reports treeConformance=1 and nonSpineEdgeCount=0.
#   - A cross-tree edge is counted as cross-tree and non-spine.
#   - A page with no parent is reported as an orphan.
#   - A parent loop is reported as a cycle.
#   - --max-saturation flags an over-threshold node.

load '../test_helper/common'

SCRIPT="$REPO_ROOT/scripts/tree-lint.sh"

# Build a vault directory; files passed as "rel-path:content" (\\n → newline).
_make_vault() {
  local vdir="$1"
  shift
  mkdir -p "$vdir/wiki"
  local entry rel content
  for entry in "$@"; do
    rel="${entry%%:*}"
    content="${entry#*:}"
    mkdir -p "$vdir/$(dirname "$rel")"
    printf '%b\n' "$content" >"$vdir/$rel"
  done
}

setup() {
  _load_helpers
  VAULT="$BATS_TEST_TMPDIR/vault"
}

teardown() {
  rm -rf "$VAULT"
}

@test "tree-lint: script declares set -euo pipefail (strict mode)" {
  run grep -qE '^set -euo pipefail' "$SCRIPT"
  assert_success
}

@test "tree-lint: skips gracefully when wiki/ is absent" {
  mkdir -p "$VAULT"
  run bash "$SCRIPT" --target "$VAULT"
  assert_success
  assert_output_contains "no wiki/"
}

@test "tree-lint: spine-only vault → conformance 1, zero non-spine edges" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  command -v jq >/dev/null 2>&1 || skip "jq not available"
  _make_vault "$VAULT" \
    "wiki/index.md:---\ntitle: \"Wiki Index\"\ntype: index\nparent: \"\"\n---\n" \
    "wiki/topic/topic.md:---\ntitle: \"Topic\"\ntype: index\nparent: \"[[index|Wiki Index]]\"\nchildren: [\"[[p1|P1]]\"]\n---\n# Topic\nChild: [[p1|P1]]" \
    "wiki/topic/p1.md:---\ntitle: \"P1\"\nparent: \"[[topic|Topic]]\"\n---\n# P1"

  run bash "$SCRIPT" --target "$VAULT" --json
  assert_success
  assert_eq "$(printf '%s' "$output" | jq -r '.metric.nonSpineEdgeCount')" "0"
  assert_eq "$(printf '%s' "$output" | jq -r '.metric.treeConformance')" "1"
}

@test "tree-lint: a cross-tree edge is counted as cross-tree and non-spine" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  command -v jq >/dev/null 2>&1 || skip "jq not available"
  _make_vault "$VAULT" \
    "wiki/index.md:---\ntitle: \"Wiki Index\"\ntype: index\nparent: \"\"\n---\n" \
    "wiki/a/a.md:---\ntitle: \"A\"\ntype: index\nparent: \"[[index|Wiki Index]]\"\n---\n# A" \
    "wiki/a/p1.md:---\ntitle: \"P1\"\nparent: \"[[a|A]]\"\n---\n# P1\nlinks [[p2|P2]] across" \
    "wiki/b/b.md:---\ntitle: \"B\"\ntype: index\nparent: \"[[index|Wiki Index]]\"\n---\n# B" \
    "wiki/b/p2.md:---\ntitle: \"P2\"\nparent: \"[[b|B]]\"\n---\n# P2"

  run bash "$SCRIPT" --target "$VAULT" --json
  assert_success
  assert_eq "$(printf '%s' "$output" | jq -r '.metric.crossTreeEdgeCount')" "1"
  assert_eq "$(printf '%s' "$output" | jq -r '.metric.nonSpineEdgeCount')" "1"
}

@test "tree-lint: a page with no parent is reported as an orphan" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  command -v jq >/dev/null 2>&1 || skip "jq not available"
  _make_vault "$VAULT" \
    "wiki/index.md:---\ntitle: \"Wiki Index\"\ntype: index\nparent: \"\"\n---\n" \
    "wiki/a/lonely.md:---\ntitle: \"Lonely\"\n---\n# Lonely (no parent)"

  run bash "$SCRIPT" --target "$VAULT" --json
  assert_success
  assert_eq "$(printf '%s' "$output" | jq -r '.metric.orphanCount')" "1"
  assert_eq "$(printf '%s' "$output" | jq -r '.orphans[0]')" "a/lonely.md"
}

@test "tree-lint: a parent loop is reported as a cycle" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  command -v jq >/dev/null 2>&1 || skip "jq not available"
  _make_vault "$VAULT" \
    "wiki/index.md:---\ntitle: \"Wiki Index\"\ntype: index\nparent: \"\"\n---\n" \
    "wiki/a/x.md:---\ntitle: \"X\"\nparent: \"[[y|Y]]\"\n---\n# X" \
    "wiki/a/y.md:---\ntitle: \"Y\"\nparent: \"[[x|X]]\"\n---\n# Y"

  run bash "$SCRIPT" --target "$VAULT" --json
  assert_success
  assert_eq "$(printf '%s' "$output" | jq -r '.metric.cycleCount')" "1"
}

@test "tree-lint: --max-saturation flags an over-threshold node" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  command -v jq >/dev/null 2>&1 || skip "jq not available"
  _make_vault "$VAULT" \
    "wiki/index.md:---\ntitle: \"Wiki Index\"\ntype: index\nparent: \"\"\n---\n" \
    "wiki/a/a.md:---\ntitle: \"A\"\ntype: index\nparent: \"[[index|Wiki Index]]\"\nchildren: [\"[[p1|P1]]\", \"[[p2|P2]]\"]\n---\n# A" \
    "wiki/a/p1.md:---\ntitle: \"P1\"\nparent: \"[[a|A]]\"\n---\n# P1" \
    "wiki/a/p2.md:---\ntitle: \"P2\"\nparent: \"[[a|A]]\"\n---\n# P2"

  run bash "$SCRIPT" --target "$VAULT" --json --max-saturation 1
  assert_success
  # a.md links out to p1 + p2 (out-degree 2 > 1).
  assert_eq "$(printf '%s' "$output" | jq -r '.oversaturated[0].page')" "a/a.md"
}
