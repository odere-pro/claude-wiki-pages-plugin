#!/usr/bin/env bats
# Tests for scripts/firewall.sh
#
# Behavior under test:
#   - Allow (exit 0, no stdout) writes inside the resolved vault.
#   - Block (JSON stdout "decision":"block") writes outside the vault.
#   - Deny globs (e.g. **/.env) block even inside the vault.
#   - mode: off (project config) is a pass-through.
#
# Like the other PreToolUse hooks, blocks are signalled via stdout JSON; the hook
# exits 0 either way and Claude Code reads the JSON.

load '../test_helper/common'

setup() {
  _load_helpers
  VAULT_DIR="$BATS_TEST_TMPDIR/proj/vault"
  mkdir -p "$VAULT_DIR/wiki/topics"
}

run_fw() { # $1 = file_path ; runs the hook in hook mode with vault env set
  local json
  json=$(jq -n --arg p "$1" '{tool_name:"Write", tool_input:{file_path:$p, content:"x"}}')
  run bash -c "export CLAUDE_WIKI_PAGES_VAULT='$VAULT_DIR'; printf '%s' '$json' | bash '$REPO_ROOT/scripts/firewall.sh'"
}

@test "firewall: allows a write inside the vault" {
  run_fw "$VAULT_DIR/wiki/topics/page.md"
  assert_success
  assert_output_empty
}

@test "firewall: blocks a write outside the vault" {
  run_fw "$BATS_TEST_TMPDIR/elsewhere/secret.md"
  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "outside"
}

@test "firewall: deny glob blocks a dotfile inside the vault" {
  run_fw "$VAULT_DIR/.env"
  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "deny"
}

@test "firewall: mode off is a pass-through" {
  mkdir -p "$BATS_TEST_TMPDIR/proj/.claude"
  printf '{"firewall":{"mode":"off"}}\n' >"$BATS_TEST_TMPDIR/proj/.claude/claude-wiki-pages.json"
  local json
  json=$(jq -n --arg p "/etc/passwd" '{tool_name:"Write", tool_input:{file_path:$p, content:"x"}}')
  run bash -c "cd '$BATS_TEST_TMPDIR/proj'; export CLAUDE_WIKI_PAGES_VAULT='$VAULT_DIR'; printf '%s' '$json' | bash '$REPO_ROOT/scripts/firewall.sh'"
  assert_success
  assert_output_empty
}

# ── S3: cross-vault confinement ──────────────────────────────────────────────────

run_fw_with_other() {
  # $1 = file_path, $2 = active vault, $3+ = other vault paths (space-separated)
  local file_path="$1"
  local active_vault="$2"
  shift 2
  local other_vaults="$*"
  local json
  json=$(jq -n --arg p "$file_path" '{tool_name:"Write", tool_input:{file_path:$p, content:"x"}}')
  run bash -c "export CLAUDE_WIKI_PAGES_VAULT='$active_vault'; export CLAUDE_WIKI_PAGES_OTHER_VAULTS='$other_vaults'; printf '%s' '$json' | bash '$REPO_ROOT/scripts/firewall.sh'"
}

@test "cross-vault: write to active vault is allowed" {
  local SIBLING="$BATS_TEST_TMPDIR/sibling-vault"
  mkdir -p "$SIBLING"
  run_fw_with_other "$VAULT_DIR/wiki/page.md" "$VAULT_DIR" "$SIBLING"
  assert_success
  assert_output_empty
}

@test "cross-vault: write to sibling registered vault is blocked under enforce" {
  local SIBLING="$BATS_TEST_TMPDIR/sibling-vault"
  mkdir -p "$SIBLING"
  run_fw_with_other "$SIBLING/wiki/page.md" "$VAULT_DIR" "$SIBLING"
  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "cross-vault"
}

@test "cross-vault: deny glob inside sibling still returns deny (not cross-vault)" {
  local SIBLING="$BATS_TEST_TMPDIR/sibling-vault2"
  mkdir -p "$SIBLING"
  run_fw_with_other "$SIBLING/.env" "$VAULT_DIR" "$SIBLING"
  assert_success
  assert_output_contains '"decision":"block"'
  # deny must win — rule must contain "deny", not just "cross-vault"
  assert_output_contains "deny"
}

@test "cross-vault: allowPaths cannot override cross-vault block" {
  local SIBLING="$BATS_TEST_TMPDIR/allow-sibling"
  mkdir -p "$SIBLING"
  # Configure allowPaths to include the sibling vault
  mkdir -p "$BATS_TEST_TMPDIR/proj2/.claude"
  printf '{"firewall":{"allowPaths":["%s"]}}\n' "$SIBLING" >"$BATS_TEST_TMPDIR/proj2/.claude/claude-wiki-pages.json"
  local json
  json=$(jq -n --arg p "$SIBLING/secret.md" '{tool_name:"Write", tool_input:{file_path:$p, content:"x"}}')
  run bash -c "cd '$BATS_TEST_TMPDIR/proj2'; export CLAUDE_WIKI_PAGES_VAULT='$VAULT_DIR'; export CLAUDE_WIKI_PAGES_OTHER_VAULTS='$SIBLING'; printf '%s' '$json' | bash '$REPO_ROOT/scripts/firewall.sh'"
  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "cross-vault"
}

@test "cross-vault: path traversal active/../sibling canonicalizes and is blocked" {
  # VAULT_DIR is $BATS_TEST_TMPDIR/proj/vault so its parent is $BATS_TEST_TMPDIR/proj.
  # Place sibling at same level: $BATS_TEST_TMPDIR/proj/sibling-vault.
  local SIBLING="$BATS_TEST_TMPDIR/proj/sibling-vault"
  mkdir -p "$SIBLING"
  # Traversal: go into active vault then back up to sibling at same level
  local traversal="$VAULT_DIR/../sibling-vault/secret.md"
  run_fw_with_other "$traversal" "$VAULT_DIR" "$SIBLING"
  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "cross-vault"
}

@test "cross-vault: outside-all paths still produce outside-vault (not cross-vault)" {
  local SIBLING="$BATS_TEST_TMPDIR/outside-sibling"
  mkdir -p "$SIBLING"
  run_fw_with_other "/etc/passwd" "$VAULT_DIR" "$SIBLING"
  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "outside"
}

@test "cross-vault: warn mode advises but does not block sibling write" {
  local SIBLING="$BATS_TEST_TMPDIR/warn-sibling"
  mkdir -p "$SIBLING"
  mkdir -p "$BATS_TEST_TMPDIR/proj3/.claude"
  printf '{"firewall":{"mode":"warn"}}\n' >"$BATS_TEST_TMPDIR/proj3/.claude/claude-wiki-pages.json"
  local json
  json=$(jq -n --arg p "$SIBLING/page.md" '{tool_name:"Write", tool_input:{file_path:$p, content:"x"}}')
  run bash -c "cd '$BATS_TEST_TMPDIR/proj3'; export CLAUDE_WIKI_PAGES_VAULT='$VAULT_DIR'; export CLAUDE_WIKI_PAGES_OTHER_VAULTS='$SIBLING'; printf '%s' '$json' | bash '$REPO_ROOT/scripts/firewall.sh'"
  assert_success
  # warn mode: no block JSON on stdout, but warning on stderr merged into output
  refute_output_contains '"decision":"block"'
}

# ── F1: symlink escape ───────────────────────────────────────────────────────────
# A symlink INSIDE the active vault that points at a sibling must not let a write
# escape: the physical destination is what matters, not the lexical path.

@test "symlink escape: dir symlink active->sibling resolves physically and is blocked (cross-vault)" {
  local SIBLING="$BATS_TEST_TMPDIR/sym-sibling-dir"
  mkdir -p "$SIBLING/wiki"
  # A/wiki/link-to-B -> SIBLING ; write through it lands physically in SIBLING.
  ln -s "$SIBLING" "$VAULT_DIR/wiki/link-to-B"
  run_fw_with_other "$VAULT_DIR/wiki/link-to-B/wiki/x.md" "$VAULT_DIR" "$SIBLING"
  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "cross-vault"
}

@test "symlink escape: leaf symlink active->sibling file resolves physically and is blocked (cross-vault)" {
  local SIBLING="$BATS_TEST_TMPDIR/sym-sibling-leaf"
  mkdir -p "$SIBLING/wiki"
  # A/wiki/x.md -> SIBLING/wiki/x.md (target need not exist yet).
  ln -s "$SIBLING/wiki/x.md" "$VAULT_DIR/wiki/x.md"
  run_fw_with_other "$VAULT_DIR/wiki/x.md" "$VAULT_DIR" "$SIBLING"
  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "cross-vault"
}

@test "symlink escape: dir symlink to an outside (unregistered) location is outside-vault" {
  local SIBLING="$BATS_TEST_TMPDIR/sym-sibling-reg"
  local OUTSIDE="$BATS_TEST_TMPDIR/sym-outside"
  mkdir -p "$SIBLING" "$OUTSIDE"
  ln -s "$OUTSIDE" "$VAULT_DIR/wiki/link-to-outside"
  run_fw_with_other "$VAULT_DIR/wiki/link-to-outside/x.md" "$VAULT_DIR" "$SIBLING"
  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "outside"
}

@test "symlink escape: deny glob still fires on the physical location through a symlink" {
  local SIBLING="$BATS_TEST_TMPDIR/sym-sibling-deny"
  mkdir -p "$SIBLING"
  ln -s "$SIBLING" "$VAULT_DIR/wiki/link-to-B-deny"
  run_fw_with_other "$VAULT_DIR/wiki/link-to-B-deny/.env" "$VAULT_DIR" "$SIBLING"
  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "deny"
}

@test "symlink escape: a real (non-symlinked) write inside the active vault is still allowed" {
  local SIBLING="$BATS_TEST_TMPDIR/sym-sibling-ok"
  mkdir -p "$SIBLING"
  run_fw_with_other "$VAULT_DIR/wiki/real.md" "$VAULT_DIR" "$SIBLING"
  assert_success
  assert_output_empty
}

# ── O1: cross-vault derived from the registry (no env var) ───────────────────────
# The shipped PreToolUse hook receives no CLAUDE_WIKI_PAGES_OTHER_VAULTS; the
# cross-vault set must come from the registry (vaults[] minus current_vault_path).

@test "registry-derived: firewall.sh blocks a sibling-vault write with NO env var set" {
  local ACTIVE="$BATS_TEST_TMPDIR/reg/active"
  local SIBLING="$BATS_TEST_TMPDIR/reg/sibling"
  mkdir -p "$ACTIVE/wiki" "$SIBLING/wiki"
  local SETTINGS="$BATS_TEST_TMPDIR/reg/.claude/claude-wiki-pages/settings.json"
  mkdir -p "$(dirname "$SETTINGS")"
  printf '{\n  "default_vault_path": "%s",\n  "current_vault_path": "%s",\n  "vaults": [{"path":"%s","name":"active"},{"path":"%s","name":"sibling"}]\n}\n' \
    "$ACTIVE" "$ACTIVE" "$ACTIVE" "$SIBLING" >"$SETTINGS"

  local json
  json=$(jq -n --arg p "$SIBLING/wiki/x.md" '{tool_name:"Write", tool_input:{file_path:$p, content:"x"}}')
  # NO CLAUDE_WIKI_PAGES_OTHER_VAULTS; settings file provides the registry.
  # Pin the active vault via CLAUDE_WIKI_PAGES_VAULT (still must match registry active).
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS'
    export CLAUDE_WIKI_PAGES_VAULT='$ACTIVE'
    unset CLAUDE_WIKI_PAGES_OTHER_VAULTS
    printf '%s' '$json' | bash '$REPO_ROOT/scripts/firewall.sh'
  "
  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "cross-vault"
}

@test "registry-derived: firewall.sh allows the active vault write with NO env var set" {
  local ACTIVE="$BATS_TEST_TMPDIR/reg2/active"
  local SIBLING="$BATS_TEST_TMPDIR/reg2/sibling"
  mkdir -p "$ACTIVE/wiki" "$SIBLING/wiki"
  local SETTINGS="$BATS_TEST_TMPDIR/reg2/.claude/claude-wiki-pages/settings.json"
  mkdir -p "$(dirname "$SETTINGS")"
  printf '{\n  "default_vault_path": "%s",\n  "current_vault_path": "%s",\n  "vaults": [{"path":"%s","name":"active"},{"path":"%s","name":"sibling"}]\n}\n' \
    "$ACTIVE" "$ACTIVE" "$ACTIVE" "$SIBLING" >"$SETTINGS"

  local json
  json=$(jq -n --arg p "$ACTIVE/wiki/page.md" '{tool_name:"Write", tool_input:{file_path:$p, content:"x"}}')
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS'
    export CLAUDE_WIKI_PAGES_VAULT='$ACTIVE'
    unset CLAUDE_WIKI_PAGES_OTHER_VAULTS
    printf '%s' '$json' | bash '$REPO_ROOT/scripts/firewall.sh'
  "
  assert_success
  assert_output_empty
}

# ── Phase 3: Bun-absent fail-closed (firewall-twin-retire) ───────────────────────
# The hook is a thin stdin→engine wrapper. When Bun is absent it is a SECURITY
# gate and must BLOCK any write (non-empty file_path) with an install-Bun reason —
# never fail-open. Simulate Bun-absence by shadowing PATH so `command -v bun` fails.

@test "fail-closed: Bun absent blocks a vault write with an install-Bun reason" {
  local BINSTUB="$BATS_TEST_TMPDIR/nobun-bin"
  mkdir -p "$BINSTUB"
  # Provide the tools the wrapper needs (jq, cat, etc.) but NOT bun.
  for t in jq cat dirname basename sed tr printf bash grep; do
    if command -v "$t" >/dev/null 2>&1; then ln -sf "$(command -v "$t")" "$BINSTUB/$t"; fi
  done
  local json
  json=$(jq -n --arg p "$VAULT_DIR/wiki/topics/page.md" '{tool_name:"Write", tool_input:{file_path:$p, content:"x"}}')
  run bash -c "export PATH='$BINSTUB'; export CLAUDE_WIKI_PAGES_VAULT='$VAULT_DIR'; printf '%s' '$json' | bash '$REPO_ROOT/scripts/firewall.sh'"
  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "Bun is required"
}

@test "fail-closed: Bun absent with no file_path passes through (no block)" {
  local BINSTUB="$BATS_TEST_TMPDIR/nobun-bin2"
  mkdir -p "$BINSTUB"
  for t in jq cat dirname basename sed tr printf bash grep; do
    if command -v "$t" >/dev/null 2>&1; then ln -sf "$(command -v "$t")" "$BINSTUB/$t"; fi
  done
  local json='{"tool_name":"Write","tool_input":{}}'
  run bash -c "export PATH='$BINSTUB'; export CLAUDE_WIKI_PAGES_VAULT='$VAULT_DIR'; printf '%s' '$json' | bash '$REPO_ROOT/scripts/firewall.sh'"
  assert_success
  refute_output_contains '"decision":"block"'
}

@test "registry-derived: firewall.sh hook does NOT mutate settings.json (read-only)" {
  local ACTIVE="$BATS_TEST_TMPDIR/reg3/active"
  local SIBLING="$BATS_TEST_TMPDIR/reg3/sibling"
  mkdir -p "$ACTIVE/wiki" "$SIBLING/wiki"
  local SETTINGS="$BATS_TEST_TMPDIR/reg3/.claude/claude-wiki-pages/settings.json"
  mkdir -p "$(dirname "$SETTINGS")"
  printf '{\n  "default_vault_path": "%s",\n  "current_vault_path": "%s",\n  "vaults": [{"path":"%s","name":"active"},{"path":"%s","name":"sibling"}]\n}\n' \
    "$ACTIVE" "$ACTIVE" "$ACTIVE" "$SIBLING" >"$SETTINGS"
  local before
  before=$(cat "$SETTINGS")

  local json
  json=$(jq -n --arg p "$SIBLING/wiki/x.md" '{tool_name:"Write", tool_input:{file_path:$p, content:"x"}}')
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS'
    export CLAUDE_WIKI_PAGES_VAULT='$ACTIVE'
    unset CLAUDE_WIKI_PAGES_OTHER_VAULTS
    printf '%s' '$json' | bash '$REPO_ROOT/scripts/firewall.sh'
  "
  assert_success
  local after
  after=$(cat "$SETTINGS")
  assert_eq "$after" "$before"
}
