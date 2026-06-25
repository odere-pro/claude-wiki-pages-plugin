#!/usr/bin/env bats
# Tests for scripts/health-score.sh — the vault's single self-health estimate.
#
# Behaviors under test:
#   - Declares strict mode (set -euo pipefail).
#   - Exits 0 always (it reports; callers gate on the output).
#   - --json emits valid JSON with the required keys (score, grade, needsHeal, issues).
#   - A clean, fully-resolved vault scores high and reports needsHeal=false.
#   - A vault with a dangling wikilink reports needsHeal=true and names the issue.
#   - Skips gracefully when wiki/ is absent.

load '../test_helper/common'

SCRIPT="$REPO_ROOT/scripts/health-score.sh"

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

@test "Health score: the script declares set -euo pipefail (strict mode)" {
  run grep -qE '^set -euo pipefail' "$SCRIPT"
  assert_success
}

@test "Health score: exits 0 and skips when the wiki/ directory is absent" {
  mkdir -p "$VAULT"
  run bash "$SCRIPT" --target "$VAULT"
  assert_success
}

@test "Health score: --json emits valid JSON with the required keys (score, grade, needsHeal, issues)" {
  command -v bun >/dev/null 2>&1 || skip "bun not installed"
  _make_vault "$VAULT" \
    "CLAUDE.md:---\nschema_version: 1\n---\n# Vault" \
    "wiki/index.md:---\ntitle: index\n---\n- [[topic-a]]" \
    "wiki/log.md:---\ntitle: log\n---\n" \
    "wiki/topic-a/topic-a.md:---\ntitle: Topic A\n---\nbody"
  run bash "$SCRIPT" --target "$VAULT" --json
  assert_success
  echo "$output" | bun -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));["score","grade","needsHeal","issues"].forEach(k=>{if(!(k in d))process.exit(1)})'
}

@test "Health score: a dangling wikilink raises needsHeal=true and names the issue" {
  command -v bun >/dev/null 2>&1 || skip "bun not installed"
  _make_vault "$VAULT" \
    "CLAUDE.md:---\nschema_version: 1\n---\n# Vault" \
    "wiki/index.md:---\ntitle: index\n---\n- [[topic-a]]" \
    "wiki/log.md:---\ntitle: log\n---\n" \
    "wiki/topic-a/topic-a.md:---\ntitle: Topic A\n---\nSee [[no-such-page]]."
  run bash "$SCRIPT" --target "$VAULT" --json
  assert_success
  assert_output_contains '"needsHeal": true'
  assert_output_contains 'dangling'
}
