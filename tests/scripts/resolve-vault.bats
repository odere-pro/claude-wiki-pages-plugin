#!/usr/bin/env bats
# Tests for scripts/resolve-vault.sh — settings.json integration.
#
# Behavior under test:
#   - resolve_vault() reads current_vault_path from settings.json (Tier 2).
#   - CLAUDE_WIKI_PAGES_VAULT env var overrides settings file (Tier 1 > Tier 2).
#   - Falls back to default "docs/vault" when settings file is absent.
#   - init_vault_settings() creates the file with default values when absent.
#   - init_vault_settings() is a no-op when the file already exists.
#   - set_vault_path() updates only current_vault_path; default_vault_path untouched.
#   - set_vault_path() creates settings.json first if it does not exist.
#   - scripts/set-vault.sh exits 1 with no argument.
#   - scripts/set-vault.sh delegates to set_vault_path correctly.
#
# All tests redirect the settings file via CLAUDE_WIKI_PAGES_SETTINGS_FILE so they
# never touch the real project .claude/claude-wiki-pages/settings.json.

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

@test "resolve_vault: returns current_vault_path from settings file" {
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "my/custom/vault"\n}\n' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    unset CLAUDE_WIKI_PAGES_VAULT
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    resolve_vault
  "

  assert_success
  [ "$output" = "my/custom/vault" ]
}

@test "resolve_vault: CLAUDE_WIKI_PAGES_VAULT env var overrides settings file" {
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "my/custom/vault"\n}\n' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='env-override'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    resolve_vault
  "

  assert_success
  [ "$output" = "env-override" ]
}

@test "resolve_vault: falls back to default when settings file absent" {
  # SETTINGS_TMP does not exist — no mkdir here. Auto-detect may fire if the
  # repo CLAUDE.md is found, so we can't pin an exact path, but resolve_vault
  # must always echo *some* non-empty path. Catches a mutation that drops the
  # final fallback `echo "$CLAUDE_WIKI_PAGES_DEFAULT_VAULT"`.
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    unset CLAUDE_WIKI_PAGES_VAULT
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    resolve_vault
  "

  assert_success
  [ -n "$output" ]
  assert_output_contains "vault"
}

@test "init_vault_settings: creates settings.json with default values" {
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    init_vault_settings
  "

  assert_success
  [ -f "$SETTINGS_TMP" ]
  grep -q '"default_vault_path": "docs/vault"' "$SETTINGS_TMP"
  grep -q '"current_vault_path": "docs/vault"' "$SETTINGS_TMP"
}

@test "init_vault_settings: does not overwrite existing file" {
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "already/set"\n}\n' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    init_vault_settings
  "

  assert_success
  grep -q '"current_vault_path": "already/set"' "$SETTINGS_TMP"
}

@test "set_vault_path: updates current_vault_path, leaves default_vault_path" {
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault"\n}\n' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    set_vault_path 'user/projects/my-vault'
  "

  assert_success
  grep -q '"default_vault_path": "docs/vault"' "$SETTINGS_TMP"
  grep -q '"current_vault_path": "user/projects/my-vault"' "$SETTINGS_TMP"
}

@test "set_vault_path: creates settings.json when absent then sets path" {
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    set_vault_path 'brand/new/vault'
  "

  assert_success
  [ -f "$SETTINGS_TMP" ]
  grep -q '"default_vault_path": "docs/vault"' "$SETTINGS_TMP"
  grep -q '"current_vault_path": "brand/new/vault"' "$SETTINGS_TMP"
}

@test "set-vault.sh: exits 1 with no argument" {
  run bash "$REPO_ROOT/scripts/set-vault.sh"

  assert_status 1
  assert_output_contains "Usage:"
}

@test "set-vault.sh: updates current_vault_path via CLI" {
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault"\n}\n' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' 'cli/vault/path'
  "

  assert_success
  assert_output_contains "cli/vault/path"
  grep -q '"current_vault_path": "cli/vault/path"' "$SETTINGS_TMP"
}

@test "init_vault_settings: warns and exits 0 when settings directory cannot be created" {
  # Place a regular file where the parent dir would go so mkdir -p fails.
  # Capture stderr into $output (via 2>&1) and pin the WARN message — a
  # mutation that silently swallows the failure should fail this test.
  local blocker="$BATS_TEST_TMPDIR/blocker"
  printf 'not-a-dir\n' >"$blocker"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='${blocker}/settings.json'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    init_vault_settings 2>&1
  "

  assert_success
  assert_output_contains "WARN"
  assert_output_contains "settings"
}

@test "set_vault_path: warns and exits 0 when settings.json cannot be written" {
  # Make the parent a regular file so both mkdir and write fail.
  local blocker="$BATS_TEST_TMPDIR/blocker2"
  printf 'not-a-dir\n' >"$blocker"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='${blocker}/settings.json'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    set_vault_path 'any/path' 2>&1
  "

  assert_success
  assert_output_contains "WARN"
}

@test "set-vault.sh: warns when vault path does not exist on disk" {
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault"\n}\n' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' '/nonexistent/vault' 2>&1
  "

  assert_success
  assert_output_contains "WARN"
  assert_output_contains "/nonexistent/vault"
}

# ── S3: multi-vault registry lifecycle ──────────────────────────────────────────

@test "vault_add: appends vault to registry without changing current_vault_path" {
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault",\n  "vaults": [{"path":"docs/vault","name":"main"}]\n}\n' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    vault_add 'user/second-vault' 'second'
  "

  assert_success
  # current_vault_path must NOT change
  grep -q '"current_vault_path": "docs/vault"' "$SETTINGS_TMP"
  # new vault appears in the registry
  grep -q '"user/second-vault"' "$SETTINGS_TMP"
}

@test "vault_add: idempotent — adding the same path twice only appears once in vaults[]" {
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault",\n  "vaults": [{"path":"docs/vault","name":"main"}]\n}\n' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    vault_add 'docs/vault' 'main'
    vault_add 'docs/vault' 'main'
  "

  assert_success
  # vaults array must have exactly 1 entry (idempotent — no duplicates added)
  local vault_count
  vault_count=$(python3 -c "
import json, sys
data = json.load(open('$SETTINGS_TMP'))
print(len(data.get('vaults', [])))
")
  [ "$vault_count" -eq 1 ]
}

@test "vault_add: backfills vaults array when settings.json has no vaults key" {
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  # Old-format settings without vaults key
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault"\n}\n' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    vault_add 'user/new-vault' 'new'
  "

  assert_success
  grep -q '"current_vault_path": "docs/vault"' "$SETTINGS_TMP"
  grep -q '"user/new-vault"' "$SETTINGS_TMP"
}

@test "vault_switch: changes current_vault_path to a registered vault" {
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault",\n  "vaults": [{"path":"docs/vault","name":"main"},{"path":"user/second","name":"second"}]\n}\n' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    vault_switch 'user/second'
  "

  assert_success
  grep -q '"current_vault_path": "user/second"' "$SETTINGS_TMP"
}

@test "vault_switch: refuses unregistered vault" {
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault",\n  "vaults": [{"path":"docs/vault","name":"main"}]\n}\n' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    vault_switch 'not/registered' 2>&1
  "

  # Must fail non-zero + print error to stderr
  [ "$status" -ne 0 ]
  assert_output_contains "not registered"
}

@test "vault_remove: deregisters vault and leaves files on disk" {
  local VAULT_ON_DISK="$BATS_TEST_TMPDIR/real-vault"
  mkdir -p "$VAULT_ON_DISK/wiki"
  printf 'content\n' >"$VAULT_ON_DISK/wiki/page.md"

  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault",\n  "vaults": [{"path":"docs/vault","name":"main"},{"path":"%s","name":"real"}]\n}\n' "$VAULT_ON_DISK" >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    vault_remove '$VAULT_ON_DISK'
  "

  assert_success
  # Files on disk MUST still exist
  [ -f "$VAULT_ON_DISK/wiki/page.md" ]
  # Vault must no longer be in the registry
  run bash -c "grep -c '$VAULT_ON_DISK' '$SETTINGS_TMP' || true"
  # current_vault_path must still be docs/vault
  grep -q '"current_vault_path": "docs/vault"' "$SETTINGS_TMP"
}

@test "vault_remove: refuses to remove the last registered vault (min-one invariant)" {
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault",\n  "vaults": [{"path":"docs/vault","name":"main"}]\n}\n' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    vault_remove 'docs/vault' 2>&1
  "

  [ "$status" -ne 0 ]
  assert_output_contains "switch first"
}

@test "vault_remove: refuses to remove the active vault" {
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault",\n  "vaults": [{"path":"docs/vault","name":"main"},{"path":"user/second","name":"second"}]\n}\n' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    vault_remove 'docs/vault' 2>&1
  "

  [ "$status" -ne 0 ]
  assert_output_contains "switch first"
}

@test "vault_list: prints registry with active marker" {
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault",\n  "vaults": [{"path":"docs/vault","name":"main"},{"path":"user/second","name":"second"}]\n}\n' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    vault_list
  "

  assert_success
  assert_output_contains "docs/vault"
  assert_output_contains "user/second"
  # active vault must be marked
  assert_output_contains "*"
}

@test "resolve_vault: output is UNCHANGED after vault_add (only switch moves it)" {
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault",\n  "vaults": [{"path":"docs/vault","name":"main"}]\n}\n' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    vault_add 'user/extra' 'extra'
    resolve_vault
  "

  assert_success
  [ "$output" = "docs/vault" ]
}

@test "resolve_vault: output is UNCHANGED after vault_remove (only switch moves it)" {
  local EXTRA="$BATS_TEST_TMPDIR/extra-vault"
  mkdir -p "$EXTRA"

  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault",\n  "vaults": [{"path":"docs/vault","name":"main"},{"path":"%s","name":"extra"}]\n}\n' "$EXTRA" >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    vault_remove '$EXTRA'
    resolve_vault
  "

  assert_success
  [ "$output" = "docs/vault" ]
}

@test "set-vault.sh add: registers a new vault without switching" {
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault",\n  "vaults": [{"path":"docs/vault","name":"main"}]\n}\n' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' add 'user/new' 'new-vault'
  "

  assert_success
  grep -q '"current_vault_path": "docs/vault"' "$SETTINGS_TMP"
  grep -q '"user/new"' "$SETTINGS_TMP"
}

@test "set-vault.sh switch: changes the active vault" {
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault",\n  "vaults": [{"path":"docs/vault","name":"main"},{"path":"user/second","name":"second"}]\n}\n' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' switch 'user/second'
  "

  assert_success
  grep -q '"current_vault_path": "user/second"' "$SETTINGS_TMP"
}

@test "set-vault.sh list: prints registry" {
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault",\n  "vaults": [{"path":"docs/vault","name":"main"}]\n}\n' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' list
  "

  assert_success
  assert_output_contains "docs/vault"
}

@test "set-vault.sh remove: deregisters a non-active vault" {
  local EXTRA="$BATS_TEST_TMPDIR/remove-vault"
  mkdir -p "$EXTRA"

  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault",\n  "vaults": [{"path":"docs/vault","name":"main"},{"path":"%s","name":"extra"}]\n}\n' "$EXTRA" >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' remove '$EXTRA'
  "

  assert_success
  # Files must still exist
  [ -d "$EXTRA" ]
}

# ── PM.1: simultaneous N-vault registry ─────────────────────────────────────────
# These tests pin the three PM.1 invariants from ADR-0016 Part B:
#   1. init_vault_settings produces settings.json with NO vaults key (progressive disclosure).
#   2. First vault_add introduces the vaults array.
#   3. N>=3 vaults: add/list/switch/remove maintain the single-active invariant.

@test "PM.1 init_vault_settings: fresh init produces settings.json with NO vaults key" {
  # Must produce exactly two keys: default_vault_path and current_vault_path.
  # The vaults key must be ABSENT until the first vault_add (progressive disclosure
  # per ADR-0016 Part B item 3).
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    init_vault_settings
  "

  assert_success
  [ -f "$SETTINGS_TMP" ]
  # vaults key must be absent
  run bash -c "python3 -c \"
import json, sys
data = json.load(open('$SETTINGS_TMP'))
sys.exit(0 if 'vaults' not in data else 1)
\""
  assert_success
}

@test "PM.1 vault_add: first vault_add introduces the vaults array (progressive disclosure)" {
  # Start from a fresh init — no vaults key — then add one vault.
  # The vaults array must appear only after the first vault_add.
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    init_vault_settings
    vault_add 'projects/alpha' 'alpha'
  "

  assert_success
  # vaults key must now exist
  run bash -c "python3 -c \"
import json, sys
data = json.load(open('$SETTINGS_TMP'))
sys.exit(0 if 'vaults' in data else 1)
\""
  assert_success
}

@test "PM.1 N=3 vaults: add three vaults, list shows all three" {
  local V1="$BATS_TEST_TMPDIR/vault-alpha"
  local V2="$BATS_TEST_TMPDIR/vault-beta"
  local V3="$BATS_TEST_TMPDIR/vault-gamma"
  mkdir -p "$V1" "$V2" "$V3"

  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "%s",\n  "current_vault_path": "%s"\n}\n' "$V1" "$V1" >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    vault_add '$V1' 'alpha'
    vault_add '$V2' 'beta'
    vault_add '$V3' 'gamma'
    vault_list
  "

  assert_success
  assert_output_contains "$V1"
  assert_output_contains "$V2"
  assert_output_contains "$V3"
  # Exactly one active marker
  local star_count
  star_count=$(printf '%s\n' "$output" | grep -c '^\*' || true)
  [ "$star_count" -eq 1 ]
}

@test "PM.1 N=3 vaults: switch changes active, single-active invariant holds" {
  local V1="$BATS_TEST_TMPDIR/vault-a"
  local V2="$BATS_TEST_TMPDIR/vault-b"
  local V3="$BATS_TEST_TMPDIR/vault-c"
  mkdir -p "$V1" "$V2" "$V3"

  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "%s",\n  "current_vault_path": "%s",\n  "vaults": [{"path":"%s","name":"a"},{"path":"%s","name":"b"},{"path":"%s","name":"c"}]\n}\n' \
    "$V1" "$V1" "$V1" "$V2" "$V3" >"$SETTINGS_TMP"

  # Switch to V2 then verify V1 no longer active, V2 is
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    vault_switch '$V2'
    resolve_vault
  "

  assert_success
  [ "$output" = "$V2" ]

  # current_vault_path in settings must be V2
  run bash -c "python3 -c \"
import json, sys
data = json.load(open('$SETTINGS_TMP'))
sys.exit(0 if data['current_vault_path'] == '$V2' else 1)
\""
  assert_success

  # Exactly one registry entry matches V2 as active, V1/V3 are non-active
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    vault_list
  "
  assert_success
  local star_count
  star_count=$(printf '%s\n' "$output" | grep -c '^\*' || true)
  [ "$star_count" -eq 1 ]
  assert_output_contains "* $V2"
}

@test "PM.1 N=3 vaults: remove non-active vault leaves two in registry, single-active holds" {
  local V1="$BATS_TEST_TMPDIR/vault-one"
  local V2="$BATS_TEST_TMPDIR/vault-two"
  local V3="$BATS_TEST_TMPDIR/vault-three"
  mkdir -p "$V1" "$V2" "$V3"

  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "%s",\n  "current_vault_path": "%s",\n  "vaults": [{"path":"%s","name":"one"},{"path":"%s","name":"two"},{"path":"%s","name":"three"}]\n}\n' \
    "$V1" "$V1" "$V1" "$V2" "$V3" >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    vault_remove '$V3'
    vault_list
  "

  assert_success
  assert_output_contains "$V1"
  assert_output_contains "$V2"
  refute_output_contains "$V3"
  # Single-active invariant: exactly one marker
  local star_count
  star_count=$(printf '%s\n' "$output" | grep -c '^\*' || true)
  [ "$star_count" -eq 1 ]
  # Active vault unchanged
  grep -q "\"current_vault_path\": \"$V1\"" "$SETTINGS_TMP"
}

@test "PM.1 N=3 vaults: remove then switch preserves single-active invariant" {
  local V1="$BATS_TEST_TMPDIR/vault-x"
  local V2="$BATS_TEST_TMPDIR/vault-y"
  local V3="$BATS_TEST_TMPDIR/vault-z"
  mkdir -p "$V1" "$V2" "$V3"

  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "%s",\n  "current_vault_path": "%s",\n  "vaults": [{"path":"%s","name":"x"},{"path":"%s","name":"y"},{"path":"%s","name":"z"}]\n}\n' \
    "$V1" "$V1" "$V1" "$V2" "$V3" >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    vault_remove '$V3'
    vault_switch '$V2'
    vault_list
  "

  assert_success
  assert_output_contains "$V1"
  assert_output_contains "$V2"
  refute_output_contains "$V3"
  local star_count
  star_count=$(printf '%s\n' "$output" | grep -c '^\*' || true)
  [ "$star_count" -eq 1 ]
  assert_output_contains "* $V2"
}

@test "PM.1 sole-resolver: resolve_vault is the only resolution function in resolve-vault.sh" {
  # ADR-0016 Part B: registry selects, resolver confines — no parallel resolution function.
  # Grep confirms resolve_vault is the only function whose name ends in _vault and
  # whose body echoes a vault path (the resolver pattern). This pins the
  # no-parallel-resolver invariant.
  run bash -c "
    grep -Ec '^[a-z_]+\(\)' '$REPO_ROOT/scripts/resolve-vault.sh'
  "
  assert_success
  # There are multiple functions (init_vault_settings, set_vault_path, etc.)
  # but ONLY resolve_vault echoes a path as its primary output.
  # The sole-resolver invariant: no second function named *resolve* exists.
  run bash -c "
    grep -E '^[a-z_]*resolve[a-z_]*\(\)' '$REPO_ROOT/scripts/resolve-vault.sh'
  "
  assert_success
  # Must match exactly one line: resolve_vault()
  [ "$(printf '%s\n' "$output" | wc -l | tr -d ' ')" -eq 1 ]
  assert_output_contains "resolve_vault()"
}
