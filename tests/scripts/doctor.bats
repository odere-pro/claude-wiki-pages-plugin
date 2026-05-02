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
# LLM_WIKI_VAULT at it so the four-tier resolver lands on tier 1
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
  export LLM_WIKI_SETTINGS_FILE="$BATS_TEST_TMPDIR/settings.json"
}

@test "doctor: exit 1 when vault path does not exist" {
  export LLM_WIKI_VAULT="$BATS_TEST_TMPDIR/nope"

  run bash "$REPO_ROOT/$DOCTOR"

  [ "$status" -eq 1 ]
  [[ "$output" == *"FAIL[1]"* ]]
  [[ "$output" == *"vault path"* ]]
}

@test "doctor: exit 2 when schema_version missing" {
  mkdir -p "$VAULT/raw" "$VAULT/wiki"
  printf '# Schema\n\n(no version line)\n' >"$VAULT/CLAUDE.md"
  export LLM_WIKI_VAULT="$VAULT"

  run bash "$REPO_ROOT/$DOCTOR"

  [ "$status" -eq 2 ]
  [[ "$output" == *"FAIL[2]"* ]]
  [[ "$output" == *"schema_version"* ]]
}

@test "doctor: exit 3 when raw/ is absent" {
  mkdir -p "$VAULT/wiki"
  printf '`schema_version: 1`\n' >"$VAULT/CLAUDE.md"
  export LLM_WIKI_VAULT="$VAULT"

  run bash "$REPO_ROOT/$DOCTOR"

  [ "$status" -eq 3 ]
  [[ "$output" == *"FAIL[3]"* ]]
  [[ "$output" == *"raw/"* ]]
}

@test "doctor: exit 3 when wiki/ is absent" {
  mkdir -p "$VAULT/raw"
  printf '`schema_version: 1`\n' >"$VAULT/CLAUDE.md"
  export LLM_WIKI_VAULT="$VAULT"

  run bash "$REPO_ROOT/$DOCTOR"

  [ "$status" -eq 3 ]
  [[ "$output" == *"FAIL[3]"* ]]
  [[ "$output" == *"wiki/"* ]]
}

@test "doctor: exit 0 against a healthy minimal vault" {
  mkdir -p "$VAULT/raw" "$VAULT/wiki"
  printf '`schema_version: 1`\n' >"$VAULT/CLAUDE.md"
  export LLM_WIKI_VAULT="$VAULT"

  run bash "$REPO_ROOT/$DOCTOR"

  [ "$status" -eq 0 ]
  [[ "$output" == *"healthy"* ]]
  [[ "$output" == *"schema=1"* ]]
}

@test "doctor: exit 0 against the bundled example vault" {
  export LLM_WIKI_VAULT="$REPO_ROOT/docs/vault-example"

  run bash "$REPO_ROOT/$DOCTOR"

  [ "$status" -eq 0 ]
  [[ "$output" == *"healthy"* ]]
}
