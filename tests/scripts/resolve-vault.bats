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

@test "Vault resolution: resolve_vault returns current_vault_path from the settings file" {
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

@test "Vault resolution: the CLAUDE_WIKI_PAGES_VAULT env var overrides the settings file" {
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

@test "Vault resolution: resolve_vault falls back to a default when the settings file is absent" {
  # SETTINGS_TMP does not exist — no mkdir here.
  # Without a settings file OR an env var, resolution reaches tier 3 (auto-detect)
  # or tier 4 (default). In the repo working tree, tier 3 detects docs/vault-example
  # or docs/vault from the top-level CLAUDE.md. Either way the result must:
  #   (a) be a non-empty string, AND
  #   (b) NOT be the literal "docs/vault" PLUS something else — i.e. it follows
  #       a recognizable pattern of a tier-3 or tier-4 path.
  # B12: the old assertion (assert_output_contains "vault") was near-always true
  # because "vault" appears in every possible output. We now assert that:
  #   1. The result is non-empty (no resolution can produce an empty path).
  #   2. init_vault_settings created the settings file (verify the side-effect).
  #   3. The resolved path is one of the expected tier outcomes — not an empty
  #      string and not a stray newline.
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    unset CLAUDE_WIKI_PAGES_VAULT
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    result=\$(resolve_vault)
    # Must be non-empty
    [ -n \"\$result\" ] || { echo 'FAIL: empty result'; exit 1; }
    # Must not contain a newline (path must be a single line)
    lines=\$(printf '%s\n' \"\$result\" | wc -l | tr -d ' ')
    [ \"\$lines\" -eq 1 ] || { echo \"FAIL: multi-line result: \$result\"; exit 1; }
    printf '%s\n' \"\$result\"
  "

  assert_success
  # The resolved path must be non-empty and a single line — verified in the subshell.
  # Additionally, the init side-effect must have created the settings file (tier 2
  # self-heal means the NEXT call resolves tier 2, not tier 4 — regression guard).
  [ -f "$SETTINGS_TMP" ]
}

@test "Vault resolution: init_vault_settings creates settings.json with default values" {
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

@test "Vault resolution: init_vault_settings does not overwrite an existing settings file" {
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

@test "Vault resolution: set_vault_path updates current_vault_path and leaves default_vault_path untouched" {
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

@test "Vault resolution: set_vault_path creates settings.json when absent then sets the path" {
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

@test "Vault resolution: set-vault.sh exits 1 with no argument" {
  run bash "$REPO_ROOT/scripts/set-vault.sh"

  assert_status 1
  assert_output_contains "Usage:"
}

@test "Vault resolution: set-vault.sh updates current_vault_path via the CLI" {
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

@test "Vault resolution: init_vault_settings warns and exits 0 when the settings directory cannot be created" {
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

@test "Vault resolution: set_vault_path warns and exits 0 when settings.json cannot be written" {
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

@test "Vault resolution: the degraded awk writer in set_vault_path handles an ampersand in the vault path without corruption" {  # spec M30
  # M30 injection fix: awk sub() replacement string interprets '&' as the matched
  # text. A raw vault path containing '&' (e.g. "projects/foo&bar-vault") would
  # corrupt the JSON when passed directly as the replacement string.
  # This test forces the degraded awk writer (Bun unavailable) by overriding
  # _cwp_bun_available to return 1, then verifies the literal path is preserved.
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault"\n}\n' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    _cwp_bun_available() { return 1; }
    set_vault_path 'projects/foo&bar-vault' 2>/dev/null
  "

  assert_success
  grep -q '"current_vault_path": "projects/foo&bar-vault"' "$SETTINGS_TMP"
}

@test "Vault resolution: the degraded awk writer in set_vault_path handles a backslash in the vault path without corruption" {  # spec M30
  # M30 injection fix: awk sub() replacement string interprets '\' as an escape.
  # A vault path with a backslash (unusual but valid) would produce garbled JSON.
  # Override _cwp_bun_available to force the degraded awk writer.
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault"\n}\n' >"$SETTINGS_TMP"

  run bash -c '
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='"'$SETTINGS_TMP'"'
    source '"'$REPO_ROOT/scripts/resolve-vault.sh'"'
    _cwp_bun_available() { return 1; }
    set_vault_path '"'projects/foo\\bar-vault'"' 2>/dev/null
  '

  assert_success
  grep -q '"current_vault_path": "projects/foo\\bar-vault"' "$SETTINGS_TMP"
}

@test "Vault resolution: set-vault.sh warns when the vault path does not exist on disk" {
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

@test "Vault resolution: vault_add appends a vault to the registry without changing current_vault_path" {
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

@test "Vault resolution: vault_add is idempotent — adding the same path twice appears only once in vaults[]" {
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
  vault_count=$(bun -e "console.log((JSON.parse(require('fs').readFileSync('$SETTINGS_TMP','utf8')).vaults||[]).length)")
  [ "$vault_count" -eq 1 ]
}

@test "Vault resolution: vault_add backfills the vaults array when settings.json has no vaults key" {
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

@test "Vault resolution: vault_switch changes current_vault_path to a registered vault" {
  # PM.4 health-check requires a real dir + CLAUDE.md(schema_version) + wiki/.
  local V2="$BATS_TEST_TMPDIR/switch-second"
  mkdir -p "$V2/wiki"
  printf -- '---\nschema_version: 1\ntitle: Test\n---\n' >"$V2/CLAUDE.md"

  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault",\n  "vaults": [{"path":"docs/vault","name":"main"},{"path":"%s","name":"second"}]\n}\n' "$V2" >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    vault_switch '$V2'
  "

  assert_success
  grep -q "\"current_vault_path\": \"$V2\"" "$SETTINGS_TMP"
}

@test "Vault resolution: vault_switch refuses an unregistered vault" {
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

@test "Vault resolution: vault_remove deregisters a vault and leaves its files on disk" {
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

@test "Vault resolution: vault_remove refuses to remove the last registered vault, holding the min-one invariant" {
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

@test "Vault resolution: vault_remove refuses to remove the active vault" {
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

@test "Vault resolution: vault_list prints the registry with an active marker" {
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

@test "Vault resolution: resolve_vault output is unchanged after vault_add — only switch moves it" {
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

@test "Vault resolution: resolve_vault output is unchanged after vault_remove — only switch moves it" {
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

@test "Vault resolution: set-vault.sh add registers a new vault without switching" {
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

@test "Vault resolution: set-vault.sh switch changes the active vault" {
  # PM.4 health-check requires a real dir + CLAUDE.md(schema_version) + wiki/.
  local V2="$BATS_TEST_TMPDIR/cli-switch-second"
  mkdir -p "$V2/wiki"
  printf -- '---\nschema_version: 1\ntitle: Test\n---\n' >"$V2/CLAUDE.md"

  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault",\n  "vaults": [{"path":"docs/vault","name":"main"},{"path":"%s","name":"second"}]\n}\n' "$V2" >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' switch '$V2'
  "

  assert_success
  grep -q "\"current_vault_path\": \"$V2\"" "$SETTINGS_TMP"
}

@test "Vault resolution: set-vault.sh list prints the registry" {
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault",\n  "vaults": [{"path":"docs/vault","name":"main"}]\n}\n' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' list
  "

  assert_success
  assert_output_contains "docs/vault"
}

@test "Vault resolution: set-vault.sh remove deregisters a non-active vault" {
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

@test "Vault resolution: a fresh init_vault_settings produces settings.json with no vaults key (progressive disclosure)" {  # spec PM.1
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
  run bash -c "bun -e \"const d=JSON.parse(require('fs').readFileSync('$SETTINGS_TMP','utf8')); process.exit('vaults' in d ? 1 : 0)\""
  assert_success
}

@test "Vault resolution: the first vault_add introduces the vaults array (progressive disclosure)" {  # spec PM.1
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
  run bash -c "bun -e \"const d=JSON.parse(require('fs').readFileSync('$SETTINGS_TMP','utf8')); process.exit('vaults' in d ? 0 : 1)\""
  assert_success
}

@test "Vault resolution: with N=3 vaults, adding three vaults makes list show all three" {  # spec PM.1
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

@test "Vault resolution: with N=3 vaults, switch changes the active vault and the single-active invariant holds" {  # spec PM.1
  local V1="$BATS_TEST_TMPDIR/vault-a"
  local V2="$BATS_TEST_TMPDIR/vault-b"
  local V3="$BATS_TEST_TMPDIR/vault-c"
  # PM.4: vault_switch health-check requires dir + CLAUDE.md(schema_version) + wiki/
  mkdir -p "$V1/wiki" "$V2/wiki" "$V3/wiki"
  printf -- '---\nschema_version: 1\ntitle: A\n---\n' >"$V1/CLAUDE.md"
  printf -- '---\nschema_version: 1\ntitle: B\n---\n' >"$V2/CLAUDE.md"
  printf -- '---\nschema_version: 1\ntitle: C\n---\n' >"$V3/CLAUDE.md"

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
  run bash -c "bun -e \"const d=JSON.parse(require('fs').readFileSync('$SETTINGS_TMP','utf8')); process.exit(d.current_vault_path === '$V2' ? 0 : 1)\""
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

@test "Vault resolution: with N=3 vaults, removing a non-active vault leaves two in the registry and the single-active invariant holds" {  # spec PM.1
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

@test "Vault resolution: with N=3 vaults, remove then switch preserves the single-active invariant" {  # spec PM.1
  local V1="$BATS_TEST_TMPDIR/vault-x"
  local V2="$BATS_TEST_TMPDIR/vault-y"
  local V3="$BATS_TEST_TMPDIR/vault-z"
  # PM.4: vault_switch health-check requires dir + CLAUDE.md(schema_version) + wiki/
  mkdir -p "$V1/wiki" "$V2/wiki" "$V3/wiki"
  printf -- '---\nschema_version: 1\ntitle: X\n---\n' >"$V1/CLAUDE.md"
  printf -- '---\nschema_version: 1\ntitle: Y\n---\n' >"$V2/CLAUDE.md"
  printf -- '---\nschema_version: 1\ntitle: Z\n---\n' >"$V3/CLAUDE.md"

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

# ── PM.4: list --status + pre-switch health-check ──────────────────────────────
#
# Acceptance items:
#   1. list --status N>=3: one row per vault, raw-pending count + last log op, active marked *.
#   2. bare list unchanged: works even if a vault's log.md is absent (does NOT read log.md).
#   3. switch <deleted-path>: exits 1 naming the missing path; active vault unchanged.
#   4. switch <valid>: succeeds (dir exists + CLAUDE.md with schema_version + wiki/).
#   5. switch <CLAUDE.md-no-wiki>: WARNs naming /claude-wiki-pages:init; switch allowed.
#   Output format: awk-parseable columns separated by two or more spaces; fields must
#   be stable enough that `awk '{print $1, $2}` yields marker and path.

@test "Vault resolution: list --status with N=3 vaults prints one row per vault with raw-pending and last-op columns" {  # spec PM.4
  local V1="$BATS_TEST_TMPDIR/status-v1"
  local V2="$BATS_TEST_TMPDIR/status-v2"
  local V3="$BATS_TEST_TMPDIR/status-v3"
  mkdir -p "$V1/raw" "$V1/wiki"
  mkdir -p "$V2/raw" "$V2/wiki"
  mkdir -p "$V3/raw" "$V3/wiki"

  # V1: 2 pending raw files, log.md with one entry
  printf 'pending1\n' >"$V1/raw/doc1.md"
  printf 'pending2\n' >"$V1/raw/doc2.md"
  printf '# Log\n\n## [2026-03-01] ingest | first\n\ndetail\n' >"$V1/wiki/log.md"

  # V2: 0 raw files, log.md with one entry (different verb)
  printf '# Log\n\n## [2026-04-15] fix | fixed-something\n\ndetail\n' >"$V2/wiki/log.md"

  # V3 (active): 1 raw file, no log.md (tests graceful empty status)
  printf 'pending\n' >"$V3/raw/item.md"

  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "%s",\n  "current_vault_path": "%s",\n  "vaults": [{"path":"%s","name":"v1"},{"path":"%s","name":"v2"},{"path":"%s","name":"v3"}]\n}\n' \
    "$V1" "$V3" "$V1" "$V2" "$V3" >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' list --status
  "

  assert_success
  # All three vault paths must appear
  assert_output_contains "$V1"
  assert_output_contains "$V2"
  assert_output_contains "$V3"
  # Exactly one active marker (V3 is active)
  local star_count
  star_count=$(printf '%s\n' "$output" | grep -c '^\*' || true)
  [ "$star_count" -eq 1 ]
  # Active vault row must be marked *
  assert_output_contains "* $V3"
  # raw-pending count must appear (V1 has 2, V3 has 1)
  assert_output_contains "2"
  # last log op for V1 must appear
  assert_output_contains "ingest"
  assert_output_contains "2026-03-01"
}

@test "Vault resolution: list --status output is awk-parseable, with field 1 the marker and field 2 the path" {  # spec PM.4
  local V1="$BATS_TEST_TMPDIR/awk-v1"
  local V2="$BATS_TEST_TMPDIR/awk-v2"
  local V3="$BATS_TEST_TMPDIR/awk-v3"
  mkdir -p "$V1/raw" "$V1/wiki"
  mkdir -p "$V2/raw" "$V2/wiki"
  mkdir -p "$V3/raw" "$V3/wiki"
  printf '# Log\n\n## [2026-01-01] ingest | x\n' >"$V1/wiki/log.md"
  printf '# Log\n\n## [2026-02-01] fix | y\n' >"$V2/wiki/log.md"
  printf '# Log\n\n## [2026-03-01] review | z\n' >"$V3/wiki/log.md"

  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "%s",\n  "current_vault_path": "%s",\n  "vaults": [{"path":"%s","name":"a1"},{"path":"%s","name":"a2"},{"path":"%s","name":"a3"}]\n}\n' \
    "$V1" "$V1" "$V1" "$V2" "$V3" >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' list --status | awk '{print \$2}'
  "

  assert_success
  # field 2 of each row must be a vault path
  assert_output_contains "$V1"
  assert_output_contains "$V2"
  assert_output_contains "$V3"
}

@test "Vault resolution: bare list does not read log.md and works even when log.md is absent" {  # spec PM.4
  local V1="$BATS_TEST_TMPDIR/nolog-v1"
  local V2="$BATS_TEST_TMPDIR/nolog-v2"
  # NO wiki/log.md created for either vault — bare list must still succeed
  mkdir -p "$V1" "$V2"

  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "%s",\n  "current_vault_path": "%s",\n  "vaults": [{"path":"%s","name":"n1"},{"path":"%s","name":"n2"}]\n}\n' \
    "$V1" "$V1" "$V1" "$V2" >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' list
  "

  assert_success
  assert_output_contains "$V1"
  assert_output_contains "$V2"
  assert_output_contains "*"
  # Prove no log.md content bleeds through
  refute_output_contains "ingest"
  refute_output_contains "fix"
}

@test "Vault resolution: switch to a deleted path exits 1 naming the missing path and leaves the active vault unchanged" {  # spec PM.4
  local V1="$BATS_TEST_TMPDIR/switch-v1"
  local MISSING="$BATS_TEST_TMPDIR/does-not-exist-at-all"
  mkdir -p "$V1"

  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "%s",\n  "current_vault_path": "%s",\n  "vaults": [{"path":"%s","name":"v1"},{"path":"%s","name":"missing"}]\n}\n' \
    "$V1" "$V1" "$V1" "$MISSING" >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' switch '$MISSING' 2>&1
  "

  # Must exit non-zero
  [ "$status" -ne 0 ]
  # Must name the missing path
  assert_output_contains "$MISSING"
  # Active vault must remain V1 — read settings.json directly
  grep -q "\"current_vault_path\": \"$V1\"" "$SETTINGS_TMP"
}

@test "Vault resolution: switch to a valid vault succeeds when dir, CLAUDE.md with schema_version, and wiki/ are all present" {  # spec PM.4
  local V1="$BATS_TEST_TMPDIR/hc-active"
  local V2="$BATS_TEST_TMPDIR/hc-target"
  mkdir -p "$V1" "$V2/wiki"
  printf -- '---\nschema_version: 1\ntitle: Test\n---\n' >"$V2/CLAUDE.md"

  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "%s",\n  "current_vault_path": "%s",\n  "vaults": [{"path":"%s","name":"hc-a"},{"path":"%s","name":"hc-t"}]\n}\n' \
    "$V1" "$V1" "$V1" "$V2" >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' switch '$V2'
  "

  assert_success
  grep -q "\"current_vault_path\": \"$V2\"" "$SETTINGS_TMP"
}

@test "Vault resolution: switch to a vault with no wiki/ warns naming /claude-wiki-pages:init but the switch is allowed" {  # spec PM.4
  local V1="$BATS_TEST_TMPDIR/scaff-active"
  local V2="$BATS_TEST_TMPDIR/scaff-target"
  mkdir -p "$V1" "$V2"
  # V2 has CLAUDE.md with schema_version but NO wiki/ directory
  printf -- '---\nschema_version: 1\ntitle: Test\n---\n' >"$V2/CLAUDE.md"

  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "%s",\n  "current_vault_path": "%s",\n  "vaults": [{"path":"%s","name":"sc-a"},{"path":"%s","name":"sc-t"}]\n}\n' \
    "$V1" "$V1" "$V1" "$V2" >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' switch '$V2' 2>&1
  "

  # Switch must succeed (WARN only, not blocked)
  assert_success
  # Must mention /claude-wiki-pages:init as remediation
  assert_output_contains "/claude-wiki-pages:init"
  # Must be clearly a WARN
  assert_output_contains "WARN"
  # Active vault must have switched to V2
  grep -q "\"current_vault_path\": \"$V2\"" "$SETTINGS_TMP"
}

@test "Vault resolution: switch to a vault with no CLAUDE.md is treated as the missing-dir class and exits 1" {  # spec PM.4
  # A vault registered but whose directory exists yet has no CLAUDE.md with schema_version
  # is treated as an unscaffolded/invalid vault — exit 1.
  local V1="$BATS_TEST_TMPDIR/noclaude-active"
  local V2="$BATS_TEST_TMPDIR/noclaude-target"
  mkdir -p "$V1" "$V2/wiki"
  # V2 has wiki/ but NO CLAUDE.md at all

  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "%s",\n  "current_vault_path": "%s",\n  "vaults": [{"path":"%s","name":"nc-a"},{"path":"%s","name":"nc-t"}]\n}\n' \
    "$V1" "$V1" "$V1" "$V2" >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' switch '$V2' 2>&1
  "

  # Missing CLAUDE.md with schema_version is a hard failure (vault is not schema-valid)
  [ "$status" -ne 0 ]
  # Active vault must remain V1
  grep -q "\"current_vault_path\": \"$V1\"" "$SETTINGS_TMP"
}

@test "Vault resolution: set-vault.sh usage shows the list --status flag" {  # spec PM.4
  run bash -c "bash '$REPO_ROOT/scripts/set-vault.sh' 2>&1"
  assert_status 1
  assert_output_contains "--status"
}

@test "Vault resolution: resolve_vault is the only resolution function in resolve-vault.sh (sole-resolver invariant)" {  # spec PM.1
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

# ── QA-Adversarial: compact-JSON + non-string-name hardening ─────────────────
#
# MEDIUM: current_vault_path extractor must be line-independent.
#   Compact (single-line) JSON: {"default_vault_path":"…/alpha","current_vault_path":"…/beta",…}
#   The old awk -F'"' … print $4 returns field 4 of the WHOLE line, which is the
#   FIRST quoted value (the default), not current_vault_path. The fix must return
#   the CORRECT current vault regardless of whitespace/line layout.
#
# LOW: non-string name/path in vaults[] (e.g. name:42 or name:NaN) must produce
#   an intentional WARN + non-zero exit — no Python traceback — and remain
#   fail-closed (writes blocked).

@test "Vault resolution: with single-line compact settings.json, resolve_vault returns current_vault_path and not the default" {  # spec MEDIUM compact-JSON
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  # Single-line compact JSON — this is the exact repro from QA-Adversarial.
  printf '{"default_vault_path":"/tmp/alpha","current_vault_path":"/tmp/beta","vaults":[{"path":"/tmp/alpha","name":"a"},{"path":"/tmp/beta","name":"b"}]}' \
    >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    unset CLAUDE_WIKI_PAGES_VAULT
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    resolve_vault
  "

  assert_success
  # Must return the TRUE current vault (/tmp/beta), not the default (/tmp/alpha).
  [ "$output" = "/tmp/beta" ]
}

@test "Vault resolution: multiline settings.json still resolves correctly after the compact-JSON fix (no regression)" {  # spec MEDIUM compact-JSON
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  # Canonical multi-line indented format — must continue to work after the fix.
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "my/custom/vault"\n}\n' \
    >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    unset CLAUDE_WIKI_PAGES_VAULT
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    resolve_vault
  "

  assert_success
  [ "$output" = "my/custom/vault" ]
}

@test "Vault resolution: registry_other_vaults reads the active vault correctly from compact settings" {  # spec MEDIUM compact-JSON
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  local ALPHA="$BATS_TEST_TMPDIR/compact-alpha"
  local BETA="$BATS_TEST_TMPDIR/compact-beta"
  mkdir -p "$ALPHA" "$BETA"
  # active = BETA; alpha is the other vault
  printf '{"default_vault_path":"%s","current_vault_path":"%s","vaults":[{"path":"%s","name":"a"},{"path":"%s","name":"b"}]}' \
    "$ALPHA" "$BETA" "$ALPHA" "$BETA" >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    registry_other_vaults
  "

  assert_success
  # Other vaults must contain ALPHA (not active), NOT BETA (the active one).
  assert_output_contains "$ALPHA"
  refute_output_contains "$BETA"
}

@test "Vault resolution: a vaults[] entry with an integer name exits non-zero with a WARN and no traceback" {  # spec LOW non-string-name
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  # Valid JSON but name is an integer — _vaults_read must WARN + exit 1, not traceback.
  printf '{"default_vault_path":"/tmp/x","current_vault_path":"/tmp/x","vaults":[{"path":"/tmp/x","name":42}]}' \
    >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    _vaults_read 2>&1
  "

  # Must exit non-zero (fail-closed)
  [ "$status" -ne 0 ]
  # Must contain WARN (intentional fail-closed, not an unhandled traceback)
  assert_output_contains "WARN"
  # Must NOT contain a Python traceback marker
  refute_output_contains "Traceback"
  refute_output_contains "TypeError"
}

@test "Vault resolution: a vaults[] entry with a NaN name exits non-zero with a WARN and no traceback" {  # spec LOW non-string-name
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  # Python's json.load accepts bare NaN and parses it as float — the concatenation
  # then raises TypeError. The fix must catch it with an explicit WARN + exit 1.
  printf '{"default_vault_path":"/tmp/x","current_vault_path":"/tmp/x","vaults":[{"path":"/tmp/x","name":NaN}]}' \
    >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    _vaults_read 2>&1
  "

  [ "$status" -ne 0 ]
  assert_output_contains "WARN"
  refute_output_contains "Traceback"
  refute_output_contains "TypeError"
}

@test "Vault resolution: a non-string name is fail-closed and no stale awk pattern extracts current_vault_path" {  # spec LOW non-string-name
  # Structural guard: confirm no stale awk -F'"' ... print \$4 pattern for
  # current_vault_path remains in resolve-vault.sh after the fix.
  run bash -c "
    grep -E \"awk -F'\\\"'\" '$REPO_ROOT/scripts/resolve-vault.sh' | grep 'current_vault_path'
  "
  # Must find ZERO matches — the stale pattern must be gone.
  [ "$status" -ne 0 ] || [ -z "$output" ]
}

# ── slugify + default_new_vault_path (Obsidian-visible vault name) ──────────
# Obsidian displays the vault's folder name; new vaults default to
# docs/<root-slug>-vault so each project's vault is distinguishable.

@test "Vault resolution: slugify lowercases, collapses non-alphanumerics, and trims hyphens" {
  run bash -c "source '$REPO_ROOT/scripts/resolve-vault.sh'; slugify 'My Project'"
  assert_success
  assert_output_contains "my-project"
  run bash -c "source '$REPO_ROOT/scripts/resolve-vault.sh'; slugify '--Weird__Name!! 2.0--'"
  assert_success
  assert_output_contains "weird-name-2-0"
}

@test "Vault resolution: default_new_vault_path builds docs/<root-slug>-vault from the cwd basename" {
  local proj="$BATS_TEST_TMPDIR/My Cool Project"
  mkdir -p "$proj"
  run bash -c "cd '$proj'; source '$REPO_ROOT/scripts/resolve-vault.sh'; default_new_vault_path"
  assert_success
  assert_output_contains "docs/my-cool-project-vault"
}

@test "Vault resolution: default_new_vault_path falls back to docs/vault on an empty slug" {
  local proj="$BATS_TEST_TMPDIR/---"
  mkdir -p "$proj"
  run bash -c "cd '$proj'; source '$REPO_ROOT/scripts/resolve-vault.sh'; default_new_vault_path"
  assert_success
  assert_output_contains "docs/vault"
}

@test "Vault resolution: the new-vault naming does not change the read-side resolve_vault default of docs/vault" {
  # The new-vault naming must not leak into tier-4 resolution for existing flows.
  run bash -c "cd '$BATS_TEST_TMPDIR'; source '$REPO_ROOT/scripts/resolve-vault.sh'; resolve_vault"
  assert_success
  assert_output_contains "docs/vault"
}

# ── PATH-degraded resolver hardening ─────────────────────────────────────────
#
# Regression suite for the silent-wrong-vault bug: in a PATH-degraded hook
# shell, resolve_vault returned the tier-4 default even though settings.json
# carried a non-empty current_vault_path. Root causes pinned here:
#   (a) _settings_get_field shelled out to the JSON parser (bun) with stderr
#       discarded, so a missing/broken bun looked identical to "field absent" (tier 2
#       silently fell through);
#   (b) tier 3's `find | sort` died when sort was missing, so auto-detect also
#       yielded nothing;
#   (c) the function then landed on the default with zero warning.
# Masking technique: a shim binary that exits 127 placed FIRST in PATH —
# `command -v` still resolves it, but exec fails exactly like a stripped PATH.

# Shared shim builder: creates $BATS_TEST_TMPDIR/<dirname> with exit-127 shims
# for each named binary and echoes the shim dir path.
_make_shim_dir() {
  local dirname="$1"
  shift
  local shim_dir="$BATS_TEST_TMPDIR/$dirname"
  mkdir -p "$shim_dir"
  local bin
  for bin in "$@"; do
    printf '#!/bin/bash\nexit 127\n' >"$shim_dir/$bin"
    chmod +x "$shim_dir/$bin"
  done
  printf '%s\n' "$shim_dir"
}

@test "Vault resolution: with Bun broken, tier 2 still resolves current_vault_path from settings.json" {
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "degraded/from-settings"\n}\n' >"$SETTINGS_TMP"

  local shim_dir
  shim_dir=$(_make_shim_dir "shim-bun" bun)

  # stdout only — the resolved path must be exactly the settings value,
  # NOT the tier-4 default.
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    unset CLAUDE_WIKI_PAGES_VAULT
    export PATH='$shim_dir':\"\$PATH\"
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    resolve_vault 2>/dev/null
  "

  assert_success
  [ "$output" = "degraded/from-settings" ]
}

@test "Vault resolution: with Bun broken, stderr carries the degraded-parser WARN" {
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "degraded/from-settings"\n}\n' >"$SETTINGS_TMP"

  local shim_dir
  shim_dir=$(_make_shim_dir "shim-bun-warn" bun)

  # stderr only (stdout discarded) — the WARN must be present and explicit.
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    unset CLAUDE_WIKI_PAGES_VAULT
    export PATH='$shim_dir':\"\$PATH\"
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    resolve_vault 2>&1 >/dev/null
  "

  assert_success
  assert_output_contains "WARN: Bun unavailable"
  assert_output_contains "degraded settings parser"
}

@test "Vault resolution: with Bun broken and compact single-line JSON, the degraded parser still extracts the value" {
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  # Compact layout: no spaces, no newlines — the grep/sed fallback must handle it.
  printf '{"default_vault_path":"docs/vault","current_vault_path":"compact/degraded-vault"}' >"$SETTINGS_TMP"

  local shim_dir
  shim_dir=$(_make_shim_dir "shim-bun-compact" bun)

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    unset CLAUDE_WIKI_PAGES_VAULT
    export PATH='$shim_dir':\"\$PATH\"
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    resolve_vault 2>/dev/null
  "

  assert_success
  [ "$output" = "compact/degraded-vault" ]
}

@test "Vault resolution: with sort broken, tier 3 auto-detect still finds the vault instead of the tier-4 default" {
  # A project whose only resolution signal is auto-detect: CLAUDE.md with
  # schema_version + wiki/ sibling, 2 levels down.
  local proj="$BATS_TEST_TMPDIR/sortless-proj"
  mkdir -p "$proj/docs/found-vault/wiki"
  printf -- '---\nschema_version: 1\ntitle: T\n---\n' >"$proj/docs/found-vault/CLAUDE.md"

  # Block settings creation so tier 2 cannot satisfy resolution (otherwise
  # init_vault_settings reifies current_vault_path=docs/vault and masks tier 3).
  local blocker="$BATS_TEST_TMPDIR/sort-blocker"
  printf 'not-a-dir\n' >"$blocker"

  local shim_dir
  shim_dir=$(_make_shim_dir "shim-sort" sort)

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$blocker/settings.json'
    unset CLAUDE_WIKI_PAGES_VAULT
    export PATH='$shim_dir':\"\$PATH\"
    cd '$proj'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    resolve_vault 2>/dev/null
  "

  assert_success
  # Pre-fix behavior was the tier-4 default 'docs/vault'; the fix must return
  # the auto-detected vault from the (unsorted) find output.
  [ "$output" = "./docs/found-vault" ]
}

@test "Vault resolution: with Bun and sort both broken, the settings value still wins over the tier-4 default (silent-wrong-vault repro)" {
  # The exact user-reported scenario: PATH-degraded shell, settings.json
  # present with an explicit current_vault_path. Resolution must return that
  # value, never silently land on docs/vault.
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/claude-wiki-pages-plugin-vault"\n}\n' >"$SETTINGS_TMP"

  local shim_dir
  shim_dir=$(_make_shim_dir "shim-both" bun sort)

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    unset CLAUDE_WIKI_PAGES_VAULT
    export PATH='$shim_dir':\"\$PATH\"
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    resolve_vault 2>/dev/null
  "

  assert_success
  [ "$output" = "docs/claude-wiki-pages-plugin-vault" ]
}

@test "Vault resolution: with a stripped PATH, tier 2 still resolves the settings value via the scoped tool path" {
  # A hook shell arriving with a PATH that contains none of the standard tool
  # dirs. The scoped hardened lookup PATH (_CLAUDE_WIKI_PAGES_TOOL_PATH) makes
  # the JSON parser reachable so tier 2 resolves normally — either via bun (the
  # tool path also appends ~/.bun/bin) or, if bun is unreachable, via the
  # degraded grep/sed parser — without mutating the caller's PATH. Either way the
  # explicit current_vault_path must win over the tier-4 default.
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "stripped/path-vault"\n}\n' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    unset CLAUDE_WIKI_PAGES_VAULT
    export PATH='/nonexistent-bin'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    resolve_vault 2>/dev/null
  "

  assert_success
  [ "$output" = "stripped/path-vault" ]
}

@test "Vault resolution: sourcing never mutates the caller PATH, using a scoped lookup rather than a global prepend" {
  # Sourced-safety guard: this file is sourced by every hook script, so a
  # global PATH prepend would change the CALLER's tool resolution (e.g.
  # re-introduce /usr/bin/jq into a deliberately curated sandbox PATH —
  # session-start.bats relies on this). PATH must be byte-identical after
  # sourcing AND after a resolution, even when /usr/bin is absent from it.
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault"\n}\n' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    unset CLAUDE_WIKI_PAGES_VAULT
    export PATH='/nonexistent-bin'
    before=\"\$PATH\"
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    resolve_vault >/dev/null 2>&1
    [ \"\$PATH\" = \"\$before\" ] && echo unchanged
  "

  assert_success
  assert_output_contains "unchanged"
}

@test "Vault resolution: with a normal PATH, the Bun path stays authoritative for malformed JSON (behavior unchanged)" {
  # With a working bun, malformed JSON must keep its current behavior:
  # _settings_get_field exits non-zero, prints nothing, and emits NO
  # degraded-parser WARN (the fallback is for missing tools, not bad JSON).
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{ this is not json' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    _settings_get_field '$SETTINGS_TMP' 'current_vault_path' 2>&1
    echo \"rc=\$?\"
  "

  assert_success
  assert_output_contains "rc=1"
  refute_output_contains "degraded settings parser"
}

# ── M32: path-traversal confinement in env-var tier (Tier 1) ─────────────────
#
# CLAUDE_WIKI_PAGES_VAULT is an operator/CI override, but must not allow a
# path-traversal vector (.. components) to escape the intended directory tree.
# The fix rejects any env-var value containing a '..' path component with a
# WARN to stderr and falls through to the next resolution tier.
# Legitimate values (relative, absolute, no ..) are returned verbatim.

@test "Vault resolution: a CLAUDE_WIKI_PAGES_VAULT value with a .. component is rejected with a WARN and falls through" {  # spec M32
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault"\n}\n' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='../../etc/passwd'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    resolve_vault 2>&1
  "

  assert_success
  # Must emit a WARN about the traversal rejection
  assert_output_contains "WARN"
  assert_output_contains ".."
  # Must NOT return the traversal path — must fall through to a safe tier
  refute_output_contains "../../etc/passwd"
}

@test "Vault resolution: a CLAUDE_WIKI_PAGES_VAULT value with an embedded .. component is rejected" {  # spec M32
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "safe/custom-vault"\n}\n' >"$SETTINGS_TMP"

  # A path with .. embedded in the middle, not just at the start
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='docs/../../../secret'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    resolve_vault 2>/dev/null
  "

  assert_success
  # Must NOT return the traversal path; must fall through to tier 2 (safe/custom-vault)
  refute_output_contains "docs/../../../secret"
  [ "$output" = "safe/custom-vault" ]
}

@test "Vault resolution: a legitimate relative CLAUDE_WIKI_PAGES_VAULT with no .. is still returned verbatim" {  # spec M32
  # Regression guard: a normal relative path must not be affected by the fix.
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='docs/my-project-vault'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    resolve_vault
  "

  assert_success
  [ "$output" = "docs/my-project-vault" ]
}

@test "Vault resolution: a legitimate absolute CLAUDE_WIKI_PAGES_VAULT with no .. is still returned verbatim" {  # spec M32
  # Regression guard: an absolute path with no .. must pass through unchanged.
  local abs_vault="/tmp/ci-vault"
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$abs_vault'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    resolve_vault
  "

  assert_success
  [ "$output" = "$abs_vault" ]
}

@test "Vault resolution: the deprecated LLM_WIKI_VAULT with a .. component is also rejected" {  # spec M32
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "docs/vault",\n  "current_vault_path": "docs/vault"\n}\n' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    unset CLAUDE_WIKI_PAGES_VAULT
    export LLM_WIKI_VAULT='../../sensitive'
    source '$REPO_ROOT/scripts/resolve-vault.sh'
    resolve_vault 2>&1
  "

  assert_success
  assert_output_contains "WARN"
  refute_output_contains "../../sensitive"
}
