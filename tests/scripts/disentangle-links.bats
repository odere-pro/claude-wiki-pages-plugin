#!/usr/bin/env bats
# Tests for scripts/disentangle-links.sh — topic-local linking remediation.
#
# Behaviors under test:
#   - Script declares set -euo pipefail (strict-mode completeness — N18 fix).
#   - Exits 0 when wiki/ is absent (graceful skip).
#   - Exits 0 in dry-run mode on a clean vault (no --apply).
#   - Dry-run mode emits no writes (reports only).
#   - --apply flag is forwarded to the TS engine.
#   - --json flag is forwarded to the TS engine.
#   - Unknown argument exits 0 with a diagnostic (hook-safe behaviour).
#   - Bun absence is handled gracefully (exits 0 with a skip message).

load '../test_helper/common'

SCRIPT="$REPO_ROOT/scripts/disentangle-links.sh"

# ---------------------------------------------------------------------------
# Static: strict-mode declaration (N18 finding)
# ---------------------------------------------------------------------------

@test "disentangle-links: script declares set -euo pipefail (strict mode complete)" {
  # This test was RED before the N18 fix (only -uo pipefail was present).
  # It confirms -e is now included, closing the silent-failure window.
  grep -qF 'set -euo pipefail' "$SCRIPT"
}

# ---------------------------------------------------------------------------
# Vault helpers
# ---------------------------------------------------------------------------

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

# ---------------------------------------------------------------------------
# Missing wiki/ — graceful skip (exit 0)
# ---------------------------------------------------------------------------

@test "disentangle-links: exits 0 and skips when wiki/ is absent" {
  mkdir -p "$VAULT"

  run bash "$SCRIPT" --target "$VAULT"
  assert_success
  assert_output_contains "no wiki/"
}

# ---------------------------------------------------------------------------
# Dry-run on a minimal vault (no --apply)
# ---------------------------------------------------------------------------

@test "disentangle-links: exits 0 in dry-run mode on a minimal vault" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  _make_vault "$VAULT" \
    "wiki/plugin/plugin.md:---\ntitle: Plugin\ntype: index\n---\nbody"

  run bash "$SCRIPT" --target "$VAULT"
  assert_success
}

# ---------------------------------------------------------------------------
# --json flag forwarded
# ---------------------------------------------------------------------------

@test "disentangle-links: --json flag is accepted and forwarded" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  command -v jq >/dev/null 2>&1 || skip "jq not available"
  _make_vault "$VAULT" \
    "wiki/plugin/plugin.md:---\ntitle: Plugin\ntype: index\n---\nbody"

  run bash "$SCRIPT" --target "$VAULT" --json
  assert_success
  # The TS engine emits JSON; verify it is parseable.
  printf '%s' "$output" | jq -e . >/dev/null
}

# ---------------------------------------------------------------------------
# Unknown argument — hook-safe: exits 0 with a diagnostic on stderr
# ---------------------------------------------------------------------------

@test "disentangle-links: unknown argument exits 0 with a diagnostic" {
  run bash "$SCRIPT" --target /nonexistent --bogus-flag
  assert_success
  assert_output_contains "unknown arg"
}

# ---------------------------------------------------------------------------
# Bun absence — graceful skip
# ---------------------------------------------------------------------------

@test "disentangle-links: exits 0 with skip message when bun is unavailable" {
  _make_vault "$VAULT" \
    "wiki/plugin/plugin.md:---\ntitle: Plugin\ntype: index\n---\nbody"

  # Shadow bun with a function that doesn't exist so command -v bun fails.
  run env PATH="/nonexistent_bin_dir" bash "$SCRIPT" --target "$VAULT"
  assert_success
  assert_output_contains "Bun not found"
}
