#!/usr/bin/env bats
# Tests for scripts/graph-quality.sh — dangling-wikilink scanner and
# topic-cluster metric.
#
# Behaviors under test:
#   - Exits 0 (always; script reports and callers gate).
#   - Text output shows dangling count and cluster metrics.
#   - JSON output (--json) is valid JSON with the expected keys.
#   - A vault with no dangling links reports danglingCount=0.
#   - A vault with a dangling link reports danglingCount=1 and names the target.
#   - A vault with no wiki/ directory skips gracefully.
#   - Bun absence is handled gracefully (skipped or reported).
#   - Cn=1.0 when all topic pages are in known clusters.
#   - dangling links from _sources/ pages are detected.
#   - strict-mode (set -euo pipefail) is declared so mid-sequence failures
#     are not silently swallowed (N18-graph-quality).

load '../test_helper/common'

SCRIPT="$REPO_ROOT/scripts/graph-quality.sh"

# Build a minimal vault directory with a given wiki/ subtree.
# Usage: _make_vault_dir <dir> [files...]
# Files: passed as "rel-path:content" strings.
_make_vault() {
  local vdir="$1"
  shift
  mkdir -p "$vdir/wiki"
  local entry rel content
  for entry in "$@"; do
    rel="${entry%%:*}"
    content="${entry#*:}"
    mkdir -p "$vdir/$(dirname "$rel")"
    # Use printf '%b' so \n sequences in content strings are interpreted as real
    # newlines. printf '%s' writes them literally, which breaks YAML frontmatter
    # parsing since the Python parser never sees actual line breaks.
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

# ---------------------------------------------------------------------------
# Strict-mode guard (N18-graph-quality)
# Every executable script must declare set -euo pipefail so that
# mid-sequence command failures are not silently swallowed.
# ---------------------------------------------------------------------------

@test "graph-quality: script declares set -euo pipefail (strict mode)" {
  run grep -qE '^set -[a-z]*e[a-z]*uo[a-z]* pipefail|^set -euo pipefail' "$SCRIPT"
  assert_success
}

# ---------------------------------------------------------------------------
# Exit code
# ---------------------------------------------------------------------------

@test "graph-quality: always exits 0 (clean vault)" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  _make_vault "$VAULT" \
    "wiki/plugin/plugin.md:---\ntitle: Plugin\ntype: index\n---\nbody"

  run bash "$SCRIPT" --target "$VAULT"
  assert_success
}

@test "graph-quality: always exits 0 (dangling vault)" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  _make_vault "$VAULT" \
    "wiki/plugin/plugin.md:---\ntitle: Plugin\ntype: index\n---\n[[NonExistent]]"

  run bash "$SCRIPT" --target "$VAULT"
  assert_success
}

# ---------------------------------------------------------------------------
# Missing wiki/ — graceful skip
# ---------------------------------------------------------------------------

@test "graph-quality: skips gracefully when wiki/ is absent" {
  mkdir -p "$VAULT"

  run bash "$SCRIPT" --target "$VAULT"
  assert_success
  assert_output_contains "no wiki/"
}

# ---------------------------------------------------------------------------
# No dangling links
# ---------------------------------------------------------------------------

@test "graph-quality: reports zero dangling when all links resolve" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  _make_vault "$VAULT" \
    "wiki/index.md:---\ntitle: index\n---\n[[Plugin]]" \
    "wiki/plugin/plugin.md:---\ntitle: Plugin\ntype: index\n---\nbody"

  run bash "$SCRIPT" --target "$VAULT"
  assert_success
  assert_output_contains "dangling targets: 0"
}

# ---------------------------------------------------------------------------
# Dangling link detected
# ---------------------------------------------------------------------------

@test "graph-quality: reports dangling target by name" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  _make_vault "$VAULT" \
    "wiki/plugin/plugin.md:---\ntitle: Plugin\ntype: index\n---\n[[GhostPage]]"

  run bash "$SCRIPT" --target "$VAULT"
  assert_success
  assert_output_contains "GhostPage"
  assert_output_contains "dangling targets: 1"
}

# ---------------------------------------------------------------------------
# JSON output
# ---------------------------------------------------------------------------

@test "graph-quality: --json emits valid JSON with required keys" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  command -v jq >/dev/null 2>&1 || skip "jq not available"
  _make_vault "$VAULT" \
    "wiki/plugin/plugin.md:---\ntitle: Plugin\ntype: index\n---\nbody"

  run bash "$SCRIPT" --target "$VAULT" --json
  assert_success
  # Must be parseable JSON.
  printf '%s' "$output" | jq -e . >/dev/null
  assert_output_contains '"danglingCount"'
  assert_output_contains '"Cn"'
  assert_output_contains '"treeConformance"'
}

@test "graph-quality: --json danglingCount=0 for resolved-only vault" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  command -v jq >/dev/null 2>&1 || skip "jq not available"
  _make_vault "$VAULT" \
    "wiki/index.md:---\ntitle: index\n---\n[[Plugin]]" \
    "wiki/plugin/plugin.md:---\ntitle: Plugin\ntype: index\n---\nbody"

  run bash "$SCRIPT" --target "$VAULT" --json
  assert_success
  count=$(printf '%s' "$output" | jq -r '.danglingCount')
  assert_eq "$count" "0"
}

# ---------------------------------------------------------------------------
# Connectivity / orphans / shadows (ADR-0031)
# ---------------------------------------------------------------------------

@test "graph-quality: connected pair → one component, zero orphans" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  command -v jq >/dev/null 2>&1 || skip "jq not available"
  _make_vault "$VAULT" \
    "wiki/a/one.md:---\ntitle: One\n---\n[[Two]]" \
    "wiki/a/two.md:---\ntitle: Two\n---\n[[One]]"

  run bash "$SCRIPT" --target "$VAULT" --json
  assert_success
  assert_eq "$(printf '%s' "$output" | jq -r '.connectivity.components')" "1"
  assert_eq "$(printf '%s' "$output" | jq -r '.connectivity.orphanCount')" "0"
  assert_eq "$(printf '%s' "$output" | jq -r '.connectivity.nodes')" "2"
}

@test "graph-quality: a linkless page is reported as an orphan" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  command -v jq >/dev/null 2>&1 || skip "jq not available"
  _make_vault "$VAULT" \
    "wiki/a/one.md:---\ntitle: One\n---\n[[Two]]" \
    "wiki/a/two.md:---\ntitle: Two\n---\n[[One]]" \
    "wiki/c/lonely.md:---\ntitle: Lonely\n---\nno links here"

  run bash "$SCRIPT" --target "$VAULT" --json
  assert_success
  assert_eq "$(printf '%s' "$output" | jq -r '.connectivity.orphanCount')" "1"
  assert_eq "$(printf '%s' "$output" | jq -r '.connectivity.orphans[0]')" "wiki/c/lonely.md"
}

@test "graph-quality: two disconnected pairs → two components" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  command -v jq >/dev/null 2>&1 || skip "jq not available"
  _make_vault "$VAULT" \
    "wiki/a/one.md:---\ntitle: One\n---\n[[Two]]" \
    "wiki/a/two.md:---\ntitle: Two\n---\n[[One]]" \
    "wiki/b/three.md:---\ntitle: Three\n---\n[[Four]]" \
    "wiki/b/four.md:---\ntitle: Four\n---\n[[Three]]"

  run bash "$SCRIPT" --target "$VAULT" --json
  assert_success
  assert_eq "$(printf '%s' "$output" | jq -r '.connectivity.components')" "2"
  assert_eq "$(printf '%s' "$output" | jq -r '.connectivity.orphanCount')" "0"
}

@test "graph-quality: a link resolving into output/ is a shadow, not an edge" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  command -v jq >/dev/null 2>&1 || skip "jq not available"
  # plugin.md links [[Foo]]; the only "Foo" is an Obsidian stub in output/ →
  # basename match into a scratch folder → shadow (counted, not a real edge).
  _make_vault "$VAULT" \
    "wiki/plugin/plugin.md:---\ntitle: Plugin\ntype: index\n---\n[[Foo]]" \
    "output/Foo.md:"

  run bash "$SCRIPT" --target "$VAULT" --json
  assert_success
  assert_eq "$(printf '%s' "$output" | jq -r '.connectivity.shadowCount')" "1"
  assert_eq "$(printf '%s' "$output" | jq -r '.connectivity.shadows[0].to')" "output/Foo.md"
  # The link is NOT a connecting edge — plugin.md is left isolated.
  assert_eq "$(printf '%s' "$output" | jq -r '.connectivity.orphanCount')" "1"
  # The wiki-only dangling scan (ADR-0028) still flags it (no WIKI target);
  # connectivity is the scratch-aware view that names it a shadow.
  assert_eq "$(printf '%s' "$output" | jq -r '.danglingCount')" "1"
}

@test "graph-quality: --json danglingCount=1 for vault with one dangling link" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  command -v jq >/dev/null 2>&1 || skip "jq not available"
  _make_vault "$VAULT" \
    "wiki/plugin/plugin.md:---\ntitle: Plugin\ntype: index\n---\n[[Ghost]]"

  run bash "$SCRIPT" --target "$VAULT" --json
  assert_success
  count=$(printf '%s' "$output" | jq -r '.danglingCount')
  assert_eq "$count" "1"
  target=$(printf '%s' "$output" | jq -r '.dangling[0].target')
  assert_eq "$target" "Ghost"
}

# ---------------------------------------------------------------------------
# Cluster metric: Cn=1.0 when all topic pages are in known clusters
# ---------------------------------------------------------------------------

@test "graph-quality: Cn=1.0 when all topic pages are in known clusters" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  command -v jq >/dev/null 2>&1 || skip "jq not available"
  # "plugin" is one of the 7 CLUSTERS in graph-quality.sh.
  _make_vault "$VAULT" \
    "wiki/plugin/plugin.md:---\ntitle: Plugin\ntype: index\n---\nbody" \
    "wiki/plugin/detail.md:---\ntitle: Plugin Detail\n---\nbody"

  run bash "$SCRIPT" --target "$VAULT" --json
  assert_success
  cn=$(printf '%s' "$output" | jq -r '.Cn')
  assert_eq "$cn" "1"
}

# ---------------------------------------------------------------------------
# Dangling from _sources/ pages are detected
# ---------------------------------------------------------------------------

@test "graph-quality: dangling link inside _sources/ page is detected" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  _make_vault "$VAULT" \
    "wiki/_sources/src.md:---\ntitle: Src\n---\n[[Nowhere]]"

  run bash "$SCRIPT" --target "$VAULT"
  assert_success
  assert_output_contains "Nowhere"
}

# ---------------------------------------------------------------------------
# Alias resolution: [[Alias]] resolves when the target declares that alias
# ---------------------------------------------------------------------------

@test "graph-quality: alias link resolves (not dangling)" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  command -v jq >/dev/null 2>&1 || skip "jq not available"
  _make_vault "$VAULT" \
    "wiki/plugin/plugin.md:---\ntitle: Plugin\naliases: [\"The Plugin\"]\ntype: index\n---\nbody" \
    "wiki/plugin/detail.md:---\ntitle: Detail\n---\n[[The Plugin]]"

  run bash "$SCRIPT" --target "$VAULT" --json
  assert_success
  count=$(printf '%s' "$output" | jq -r '.danglingCount')
  assert_eq "$count" "0"
}
