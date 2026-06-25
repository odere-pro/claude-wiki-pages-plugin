#!/usr/bin/env bats
# Tests for scripts/heal-ghost-links.sh — deterministic ghost-wikilink heal.
#
# Behaviors under test (ADR-0035):
#   - Script declares set -euo pipefail.
#   - Exits 0 and skips when wiki/ is absent.
#   - Rewrites a title-only ghost link to piped basename form.
#   - Preserves the display text and a #heading anchor.
#   - Leaves a genuinely dangling link untouched (not this script's job).
#   - Idempotent: a second run heals nothing.
#   - --check exits 3 when ghosts remain and never writes.

load '../test_helper/common'

SCRIPT="$REPO_ROOT/scripts/heal-ghost-links.sh"

setup() {
  _load_helpers
  VAULT="$BATS_TEST_TMPDIR/vault"
  mkdir -p "$VAULT/wiki/product"
  # A real page whose title differs from its basename.
  cat >"$VAULT/wiki/product/buyer-co-pilot.md" <<'EOF'
---
title: "Buyer Co-pilot"
type: concept
---
The product.
EOF
}

teardown() {
  rm -rf "$VAULT"
}

@test "heal-ghost-links: declares set -euo pipefail" {
  grep -qF 'set -euo pipefail' "$SCRIPT"
}

@test "heal-ghost-links: exits 0 and skips when wiki/ is absent" {
  rm -rf "$VAULT/wiki"
  run bash "$SCRIPT" --target "$VAULT"
  assert_success
  assert_output_contains "no wiki/"
}

@test "heal-ghost-links: rewrites a title-only ghost to piped basename" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  cat >"$VAULT/wiki/product/notes.md" <<'EOF'
---
title: "Notes"
type: concept
---
See [[Buyer Co-pilot]] for the product.
EOF

  run bash "$SCRIPT" --target "$VAULT"
  assert_success

  run cat "$VAULT/wiki/product/notes.md"
  assert_output_contains '[[buyer-co-pilot|Buyer Co-pilot]]'
}

@test "heal-ghost-links: preserves display text and #heading anchor" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  cat >"$VAULT/wiki/product/notes.md" <<'EOF'
---
title: "Notes"
type: concept
---
See [[Buyer Co-pilot#Pricing|the pricing]] section.
EOF

  run bash "$SCRIPT" --target "$VAULT"
  assert_success

  run cat "$VAULT/wiki/product/notes.md"
  assert_output_contains '[[buyer-co-pilot#Pricing|the pricing]]'
}

@test "heal-ghost-links: leaves a genuinely dangling link untouched" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  cat >"$VAULT/wiki/product/notes.md" <<'EOF'
---
title: "Notes"
type: concept
---
See [[Nonexistent Page]] — nothing resolves this.
EOF

  run bash "$SCRIPT" --target "$VAULT"
  assert_success

  run cat "$VAULT/wiki/product/notes.md"
  assert_output_contains '[[Nonexistent Page]]'
}

@test "heal-ghost-links: idempotent — second run heals nothing" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  cat >"$VAULT/wiki/product/notes.md" <<'EOF'
---
title: "Notes"
type: concept
---
See [[Buyer Co-pilot]].
EOF
  bash "$SCRIPT" --target "$VAULT" >/dev/null

  run bash "$SCRIPT" --target "$VAULT"
  assert_success
  assert_output_contains "0 ghost links healed"
}

@test "heal-ghost-links: --check exits 3 on ghosts and never writes" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  cat >"$VAULT/wiki/product/notes.md" <<'EOF'
---
title: "Notes"
type: concept
---
See [[Buyer Co-pilot]].
EOF
  local before
  before="$(cat "$VAULT/wiki/product/notes.md")"

  run bash "$SCRIPT" --check --target "$VAULT"
  assert_equal "$status" 3
  assert_equal "$(cat "$VAULT/wiki/product/notes.md")" "$before"
}
