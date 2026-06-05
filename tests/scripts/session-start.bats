#!/usr/bin/env bats
# Tests for scripts/session-start.sh
#
# Behavior under test:
#   - Prints SETUP prompt when vault directory does not exist.
#   - Prints REMINDER when vault directory exists.
#   - Creates settings.json on first run (settings file absent before test).
#   - Prints MOC pointer (INDEX:) when wiki/index.md exists.
#   - Omits MOC pointer when wiki/index.md does not exist.
#   - Always prints a config-independent NEXT: line (vault populated vs empty).

load '../test_helper/common'

setup() {
  _load_helpers
  SETTINGS_TMP="$BATS_TEST_TMPDIR/claude-wiki-pages/settings.json"
  export CLAUDE_WIKI_PAGES_SETTINGS_FILE="$SETTINGS_TMP"
  unset CLAUDE_WIKI_PAGES_VAULT
}

teardown() {
  unset CLAUDE_WIKI_PAGES_SETTINGS_FILE
  unset CLAUDE_WIKI_PAGES_VAULT
}

@test "session-start: prints SETUP when vault dir does not exist" {
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='/nonexistent/vault/does-not-exist'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "SETUP:"
  assert_output_contains "/nonexistent/vault/does-not-exist"
}

@test "session-start: prints REMINDER when vault dir exists" {
  local vault_dir="$BATS_TEST_TMPDIR/my-vault"
  mkdir -p "$vault_dir"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "REMINDER:"
  assert_output_contains "$vault_dir"
}

@test "session-start: creates settings.json on first run" {
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='/nonexistent/vault/does-not-exist'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  [ -f "$SETTINGS_TMP" ]
  grep -q '"default_vault_path"' "$SETTINGS_TMP"
}

@test "session-start: prints INDEX pointer when wiki/index.md exists" {
  local vault_dir="$BATS_TEST_TMPDIR/moc-vault"
  mkdir -p "$vault_dir/wiki"
  printf '%s\n' '---' 'title: Index' '---' >"$vault_dir/wiki/index.md"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "INDEX:"
  assert_output_contains "wiki/index.md"
}

@test "session-start: omits INDEX pointer when wiki/index.md does not exist" {
  local vault_dir="$BATS_TEST_TMPDIR/no-moc-vault"
  mkdir -p "$vault_dir/wiki"
  # wiki/ exists but index.md is absent

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  refute_output_contains "INDEX:"
}

@test "session-start: always prints NEXT line when vault exists and is populated" {
  local vault_dir="$BATS_TEST_TMPDIR/next-vault-pop"
  mkdir -p "$vault_dir/raw" "$vault_dir/wiki"
  printf 'source content\n' >"$vault_dir/raw/doc.md"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "NEXT:"
}

@test "session-start: always prints NEXT line when vault exists but raw is empty" {
  local vault_dir="$BATS_TEST_TMPDIR/next-vault-empty"
  mkdir -p "$vault_dir/wiki"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "NEXT:"
}

@test "session-start: NEXT line references /claude-wiki-pages:wiki" {
  local vault_dir="$BATS_TEST_TMPDIR/next-verb-vault"
  mkdir -p "$vault_dir/wiki"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "/claude-wiki-pages:wiki"
}

@test "session-start: NEXT line does not depend on settings.json being present" {
  local vault_dir="$BATS_TEST_TMPDIR/next-nosettings-vault"
  local absent_settings="$BATS_TEST_TMPDIR/no-such-dir/settings.json"
  mkdir -p "$vault_dir/wiki"
  # settings file path points to a non-existent directory — config-independence check

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$absent_settings'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "NEXT:"
  assert_output_contains "/claude-wiki-pages:wiki"
}

# P1.1: REMINDER line must contain the ABSOLUTE resolved vault path (begins with /).
# Protects against relative paths such as "docs/vault" leaking into the pointer.
@test "session-start: REMINDER path is absolute (begins with /)" {
  local vault_dir="$BATS_TEST_TMPDIR/abs-path-vault"
  mkdir -p "$vault_dir"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "REMINDER:"
  # Extract the path from the REMINDER line and verify it starts with /
  local reminder_line
  reminder_line=$(printf '%s\n' "${output}" | grep '^REMINDER:')
  case "$reminder_line" in
    *"/$vault_dir"*|*" /"*) : ;;  # contains an absolute path segment
    *) : ;;
  esac
  # The vault_dir itself is already absolute (BATS_TEST_TMPDIR is /tmp/…)
  # so checking that output contains vault_dir is sufficient when vault_dir is absolute
  assert_output_contains "$vault_dir/CLAUDE.md"
}

# P1.1: REMINDER must point to vault/CLAUDE.md explicitly (not just vault/).
@test "session-start: REMINDER points to vault CLAUDE.md" {
  local vault_dir="$BATS_TEST_TMPDIR/claudemd-pointer-vault"
  mkdir -p "$vault_dir"
  printf '%s\n' '---' 'schema_version: 1' '---' >"$vault_dir/CLAUDE.md"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "REMINDER:"
  assert_output_contains "${vault_dir}/CLAUDE.md"
  [ -f "${vault_dir}/CLAUDE.md" ]
}

# P1.1: When vault resolves to a RELATIVE path (e.g. docs/vault-example),
# the emitted REMINDER must still use the absolute canonical path.
@test "session-start: REMINDER is absolute even when VAULT env var is relative" {
  # Use a relative path inside the repo to simulate the docs/vault-example case.
  local rel_vault="docs/vault-example"
  local abs_vault
  abs_vault="$(cd "$REPO_ROOT/$rel_vault" 2>/dev/null && pwd -P)" || true

  # Skip if the reference vault does not exist (not a blocker on minimal CI).
  [ -d "$REPO_ROOT/$rel_vault" ] || skip "docs/vault-example not present in this checkout"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$rel_vault'
    cd '$REPO_ROOT'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "REMINDER:"
  # Must contain the absolute path, not the bare relative fragment
  assert_output_contains "$abs_vault/CLAUDE.md"
  refute_output_contains "REMINDER: Read ${rel_vault}/CLAUDE.md"
}

# P1.1: No-vault path must NOT emit a REMINDER or INDEX line (no broken pointer).
@test "session-start: no REMINDER or INDEX when vault does not exist" {
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='/nonexistent/vault/does-not-exist'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  refute_output_contains "REMINDER:"
  refute_output_contains "INDEX:"
}

# P1.1: Output is plain stdout — no JSON envelope or hook-block object.
@test "session-start: output is plain text, no JSON envelope" {
  local vault_dir="$BATS_TEST_TMPDIR/plain-text-vault"
  mkdir -p "$vault_dir"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  refute_output_contains '{"type":'
  refute_output_contains '"decision":'
}
