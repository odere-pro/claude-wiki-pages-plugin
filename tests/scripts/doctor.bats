#!/usr/bin/env bats
# Tests for scripts/doctor.sh — environment health check.
#
# Behavior under test:
#   - Exit 1 when the resolved vault directory does not exist.
#   - Exit 2 when CLAUDE.md exists but lacks a schema_version.
#   - Exit 3 when raw/ or wiki/ are missing.
#   - Exit 0 when a complete, well-formed vault is present.
#
# We construct a minimal vault inside BATS_TEST_TMPDIR and point
# CLAUDE_WIKI_PAGES_VAULT at it so the four-tier resolver lands on tier 1
# without touching any real project state. Hooks (#4) and validate-docs (#5)
# are exercised against the real plugin tree (CLAUDE_PLUGIN_ROOT) since they
# don't depend on the per-test vault.

load '../test_helper/common'

DOCTOR="scripts/doctor.sh"

setup() {
  _load_helpers
  VAULT="$BATS_TEST_TMPDIR/vault"
  export CLAUDE_PLUGIN_ROOT="$REPO_ROOT"
  # Isolate settings.json writes so the test does not mutate the worktree.
  export CLAUDE_WIKI_PAGES_SETTINGS_FILE="$BATS_TEST_TMPDIR/settings.json"
}

@test "doctor: exit 1 when vault path does not exist" {
  export CLAUDE_WIKI_PAGES_VAULT="$BATS_TEST_TMPDIR/nope"

  run bash "$REPO_ROOT/$DOCTOR"

  [ "$status" -eq 1 ]
  [[ "$output" == *"FAIL[1]"* ]]
  [[ "$output" == *"vault path"* ]]
}

@test "doctor: exit 2 when schema_version missing" {
  mkdir -p "$VAULT/raw" "$VAULT/wiki"
  printf '# Schema\n\n(no version line)\n' >"$VAULT/CLAUDE.md"
  export CLAUDE_WIKI_PAGES_VAULT="$VAULT"

  run bash "$REPO_ROOT/$DOCTOR"

  [ "$status" -eq 2 ]
  [[ "$output" == *"FAIL[2]"* ]]
  [[ "$output" == *"schema_version"* ]]
}

@test "doctor: exit 3 when raw/ is absent" {
  mkdir -p "$VAULT/wiki"
  printf '`schema_version: 1`\n' >"$VAULT/CLAUDE.md"
  export CLAUDE_WIKI_PAGES_VAULT="$VAULT"

  run bash "$REPO_ROOT/$DOCTOR"

  [ "$status" -eq 3 ]
  [[ "$output" == *"FAIL[3]"* ]]
  [[ "$output" == *"raw/"* ]]
}

@test "doctor: exit 3 when wiki/ is absent" {
  mkdir -p "$VAULT/raw"
  printf '`schema_version: 1`\n' >"$VAULT/CLAUDE.md"
  export CLAUDE_WIKI_PAGES_VAULT="$VAULT"

  run bash "$REPO_ROOT/$DOCTOR"

  [ "$status" -eq 3 ]
  [[ "$output" == *"FAIL[3]"* ]]
  [[ "$output" == *"wiki/"* ]]
}

@test "doctor: exit 0 against a healthy minimal vault" {
  mkdir -p "$VAULT/raw" "$VAULT/wiki"
  printf '`schema_version: 1`\n' >"$VAULT/CLAUDE.md"
  export CLAUDE_WIKI_PAGES_VAULT="$VAULT"

  run bash "$REPO_ROOT/$DOCTOR"

  [ "$status" -eq 0 ]
  [[ "$output" == *"healthy"* ]]
  [[ "$output" == *"schema=1"* ]]
}

@test "doctor: exit 0 against the bundled example vault" {
  export CLAUDE_WIKI_PAGES_VAULT="$REPO_ROOT/docs/vault-example"

  run bash "$REPO_ROOT/$DOCTOR"

  [ "$status" -eq 0 ]
  [[ "$output" == *"healthy"* ]]
}

# ── git-required per-vault init (Phase 0, item 6) — bash doctor git check ────

@test "doctor: reports OK for git when vault is a git repo" {
  mkdir -p "$VAULT/raw" "$VAULT/wiki"
  printf '`schema_version: 1`\n' >"$VAULT/CLAUDE.md"
  # Initialise a git repo in the vault so the check passes.
  git init -q "$VAULT"
  git -C "$VAULT" config user.email "test@example.com"
  git -C "$VAULT" config user.name "Test"
  git -C "$VAULT" config commit.gpgsign false
  git -C "$VAULT" add -A
  git -C "$VAULT" -c commit.gpgsign=false commit -q -m "init"
  export CLAUDE_WIKI_PAGES_VAULT="$VAULT"

  run bash "$REPO_ROOT/$DOCTOR"

  [ "$status" -eq 0 ]
  [[ "$output" == *"healthy"* ]]
  # The git check should emit an OK line.
  [[ "$output" == *"git:"* ]]
}

@test "doctor: warns (not fatal) when vault is not a git repo" {
  mkdir -p "$VAULT/raw" "$VAULT/wiki"
  printf '`schema_version: 1`\n' >"$VAULT/CLAUDE.md"
  # Deliberately do NOT git-init the vault.
  export CLAUDE_WIKI_PAGES_VAULT="$VAULT"

  run bash "$REPO_ROOT/$DOCTOR"

  # Must still exit 0 — "vault not a repo" is WARN, not fail.
  [ "$status" -eq 0 ]
  [[ "$output" == *"healthy"* ]]
  # The git check should emit a NOTE/WARN advisory.
  [[ "$output" == *"git:"* ]]
  [[ "$output" == *"not a git repo"* ]]
}
