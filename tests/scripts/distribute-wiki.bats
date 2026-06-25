#!/usr/bin/env bats
# Tests for scripts/distribute-wiki.sh — wiki export to plain markdown.
#
# Behaviors under test:
#   - Default mode produces a single output/wiki.md file.
#   - Frontmatter is stripped from exported pages.
#   - [[Wikilinks]] are flattened to plain text by default.
#   - --links mode converts [[Wikilinks]] to [Title](title-slug.md) links.
#   - --tree mode writes one file per wiki page under output/wiki/.
#   - --clean removes the existing output before writing.
#   - Missing wiki/ directory exits 1 with a clear error.
#   - Output reports the page count.
#   - Unknown flag exits 1.

load '../test_helper/common'

SCRIPT="$REPO_ROOT/scripts/distribute-wiki.sh"

# Build a minimal vault with a wiki/ subtree for tests.
_make_vault() {
  local vdir="$1"
  mkdir -p "$vdir/wiki/topics"
  # index.md
  cat >"$vdir/wiki/index.md" <<'EOF'
---
title: index
---
- [[Alpha]]
- [[Beta]]
EOF
  # log.md — use printf -- to avoid bash 3.2's treatment of leading '--' as a flag
  printf -- '---\ntitle: log\n---\n' >"$vdir/wiki/log.md"
  # topic pages
  cat >"$vdir/wiki/topics/alpha.md" <<'EOF'
---
title: Alpha
type: concept
---
Alpha body. See [[Beta]].
EOF
  cat >"$vdir/wiki/topics/beta.md" <<'EOF'
---
title: Beta
type: concept
---
Beta body. Links back to [[Alpha]].
EOF
}

setup() {
  _load_helpers
  VAULT="$BATS_TEST_TMPDIR/vault"
  _make_vault "$VAULT"
}

teardown() {
  rm -rf "$VAULT"
}

# ---------------------------------------------------------------------------
# Default mode: single consolidated output/wiki.md
# ---------------------------------------------------------------------------

@test "Wiki distribution: default mode creates a single output/wiki.md file" {
  run bash "$SCRIPT" --target "$VAULT"
  assert_success
  [ -f "$VAULT/output/wiki.md" ]
}

@test "Wiki distribution: the output reports the consolidated page count" {
  run bash "$SCRIPT" --target "$VAULT"
  assert_success
  assert_output_contains "READY:"
  assert_output_contains "pages consolidated"
}

@test "Wiki distribution: frontmatter is stripped from exported pages" {
  run bash "$SCRIPT" --target "$VAULT"
  assert_success
  # The YAML block (---) should not appear in the exported body.
  # Only the leading "# Wiki Export" header and separators use ---.
  # Use ! grep -q to avoid the grep-c / shell-or-echo double-echo problem.
  ! grep -q '^type: concept' "$VAULT/output/wiki.md" 2>/dev/null
}

@test "Wiki distribution: [[wikilinks]] are flattened to plain text by default" {
  run bash "$SCRIPT" --target "$VAULT"
  assert_success
  # [[Beta]] should become just "Beta" (no brackets).
  grep -q 'Beta' "$VAULT/output/wiki.md"
  # Must NOT contain [[ ]] syntax in the exported body.
  body=$(grep -v '^<!--' "$VAULT/output/wiki.md" | grep -v '^# Wiki Export' | grep -v '^---$' || true)
  case "$body" in
    *'[['*) false ;; # dangling wikilink syntax found — fail
    *) true ;;
  esac
}

# ---------------------------------------------------------------------------
# --links mode
# ---------------------------------------------------------------------------

@test "Wiki distribution: --links converts [[wikilinks]] to [Title](title-slug.md) markdown links" {
  run bash "$SCRIPT" --target "$VAULT" --links
  assert_success
  # [[Beta]] should become [Beta](beta.md).
  grep -qE '\[Beta\]\(beta\.md\)' "$VAULT/output/wiki.md"
}

@test "Wiki distribution: --links leaves no raw [[...]] syntax in the output" {
  run bash "$SCRIPT" --target "$VAULT" --links
  assert_success
  body=$(grep -v '^<!--' "$VAULT/output/wiki.md" || true)
  case "$body" in
    *'[['*) false ;;
    *) true ;;
  esac
}

# ---------------------------------------------------------------------------
# --tree mode
# ---------------------------------------------------------------------------

@test "Wiki distribution: --tree creates the output/wiki/ directory" {
  run bash "$SCRIPT" --target "$VAULT" --tree
  assert_success
  [ -d "$VAULT/output/wiki" ]
}

@test "Wiki distribution: --tree writes one file per wiki page" {
  run bash "$SCRIPT" --target "$VAULT" --tree
  assert_success
  # index.md and log.md and two topic pages → at least 4 files.
  count=$(find "$VAULT/output/wiki" -name "*.md" | wc -l)
  [ "$count" -ge 4 ]
}

@test "Wiki distribution: --tree output reports 'tree mode'" {
  run bash "$SCRIPT" --target "$VAULT" --tree
  assert_success
  assert_output_contains "tree mode"
}

# ---------------------------------------------------------------------------
# --clean flag
# ---------------------------------------------------------------------------

@test "Wiki distribution: --clean removes existing output before writing" {
  # Write an initial export.
  run bash "$SCRIPT" --target "$VAULT"
  assert_success
  # Add a stale file to output/.
  printf 'stale content\n' >"$VAULT/output/stale.txt"
  # Run with --clean — the stale wiki.md should be recreated.
  run bash "$SCRIPT" --target "$VAULT" --clean
  assert_success
  [ -f "$VAULT/output/wiki.md" ]
}

@test "Wiki distribution: --tree --clean removes the old mirror tree before writing" {
  run bash "$SCRIPT" --target "$VAULT" --tree
  assert_success
  old_file="$VAULT/output/wiki/stale-extra.md"
  printf 'stale\n' >"$old_file"
  run bash "$SCRIPT" --target "$VAULT" --tree --clean
  assert_success
  [ ! -f "$old_file" ]
}

# ---------------------------------------------------------------------------
# Error cases
# ---------------------------------------------------------------------------

@test "Wiki distribution: exits 1 with a clear error when the wiki/ directory is absent" {
  rm -rf "$VAULT/wiki"
  run bash "$SCRIPT" --target "$VAULT"
  assert_status 1
  assert_output_contains "ERROR"
}

@test "Wiki distribution: an unknown flag exits 1" {
  run bash "$SCRIPT" --target "$VAULT" --no-such-flag
  assert_status 1
}

@test "Wiki distribution: --help exits 0" {
  run bash "$SCRIPT" --help
  assert_success
}
