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
  # Mask any real `obsidian` CLI so the advisory link-parity probe never
  # reaches a live Obsidian during tests (fast-failing stub = silent skip).
  MASK_BIN="$BATS_TEST_TMPDIR/mask-bin"
  mkdir -p "$MASK_BIN"
  printf '#!/bin/bash\nexit 1\n' >"$MASK_BIN/obsidian"
  chmod +x "$MASK_BIN/obsidian"
  export PATH="$MASK_BIN:$PATH"
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

# ── jq pre-flight (review 2026-06-11, fix 4) ────────────────────────────────
# jq is a hard dependency of every JSON-parsing hook: without it the PreToolUse
# guards (firewall, frontmatter, raw-protect) silently pass writes through
# unchecked. Doctor must flag it like the git hard dependency (exit 1).

@test "doctor: exit 1 when jq binary is absent" {
  mkdir -p "$VAULT/raw" "$VAULT/wiki"
  printf '`schema_version: 1`\n' >"$VAULT/CLAUDE.md"

  # Hermetic sandbox PATH: everything doctor.sh needs except jq.
  local SANDBOX_BIN="$BATS_TEST_TMPDIR/sandbox-bin-nojq"
  mkdir -p "$SANDBOX_BIN"
  local tool real
  for tool in dirname basename find wc tr mkdir cat cp grep sed sort head git awk touch rm; do
    real="$(command -v "$tool")" || continue
    case "$real" in
      /*) ln -s "$real" "$SANDBOX_BIN/$tool" ;;
      *) skip "cannot resolve absolute path for required tool: $tool ($real)" ;;
    esac
  done
  if PATH="$SANDBOX_BIN" command -v jq >/dev/null 2>&1; then
    fail "jq leaked into sandbox PATH — check not exercised"
  fi

  run env -i PATH="$SANDBOX_BIN" HOME="$HOME" \
    CLAUDE_PLUGIN_ROOT="$REPO_ROOT" \
    CLAUDE_WIKI_PAGES_SETTINGS_FILE="$BATS_TEST_TMPDIR/settings.json" \
    CLAUDE_WIKI_PAGES_VAULT="$VAULT" \
    /bin/bash "$REPO_ROOT/$DOCTOR"

  [ "$status" -eq 1 ]
  [[ "$output" == *"FAIL[1]"* ]]
  [[ "$output" == *"jq"* ]]
}

@test "doctor: reports OK for jq when jq is present" {
  command -v jq >/dev/null 2>&1 || skip "jq not installed on this machine"
  mkdir -p "$VAULT/raw" "$VAULT/wiki"
  printf '`schema_version: 1`\n' >"$VAULT/CLAUDE.md"
  export CLAUDE_WIKI_PAGES_VAULT="$VAULT"

  run bash "$REPO_ROOT/$DOCTOR"

  [ "$status" -eq 0 ]
  [[ "$output" == *"jq:"* ]]
}

# ── Obsidian link parity (advisory; parity with TS doctor D11) ──────────────
# A NOTE with the unresolved-link count when a running Obsidian reports
# dangling links; silent on zero, CLI absence, or CLI failure. The exit-code
# contract (0–5) is never touched by this probe.

install_obsidian_stub() {
  # $1 = body the stub prints (the unresolvedLinks JSON); empty = exit 1.
  STUB_BIN="$BATS_TEST_TMPDIR/obsidian-stub-bin"
  mkdir -p "$STUB_BIN"
  if [ -n "$1" ]; then
    printf '#!/bin/bash\nprintf %%s %s\n' "'$1'" >"$STUB_BIN/obsidian"
  else
    printf '#!/bin/bash\nexit 1\n' >"$STUB_BIN/obsidian"
  fi
  chmod +x "$STUB_BIN/obsidian"
  export PATH="$STUB_BIN:$PATH"
}

@test "doctor: NOTE with the unresolved-link count when obsidian reports them" {
  command -v jq >/dev/null 2>&1 || skip "jq not installed on this machine"
  mkdir -p "$VAULT/raw" "$VAULT/wiki"
  printf '`schema_version: 1`\n' >"$VAULT/CLAUDE.md"
  export CLAUDE_WIKI_PAGES_VAULT="$VAULT"
  install_obsidian_stub '{"wiki/a.md":{"Missing Page":1,"Ghost":2},"wiki/b.md":{"Missing Page":1}}'

  run bash "$REPO_ROOT/$DOCTOR"

  assert_success # advisory: exit code unchanged
  assert_output_contains "3 unresolved link(s)"
  assert_output_contains "/claude-wiki-pages:lint"
}

@test "doctor: silent when obsidian reports zero unresolved links" {
  command -v jq >/dev/null 2>&1 || skip "jq not installed on this machine"
  mkdir -p "$VAULT/raw" "$VAULT/wiki"
  printf '`schema_version: 1`\n' >"$VAULT/CLAUDE.md"
  export CLAUDE_WIKI_PAGES_VAULT="$VAULT"
  install_obsidian_stub '{"wiki/a.md":{}}'

  run bash "$REPO_ROOT/$DOCTOR"

  assert_success
  refute_output_contains "unresolved link"
}

@test "doctor: silent when the obsidian CLI fails (vault not open)" {
  mkdir -p "$VAULT/raw" "$VAULT/wiki"
  printf '`schema_version: 1`\n' >"$VAULT/CLAUDE.md"
  export CLAUDE_WIKI_PAGES_VAULT="$VAULT"
  install_obsidian_stub "" # stub exits 1

  run bash "$REPO_ROOT/$DOCTOR"

  assert_success
  assert_output_contains "healthy"
  refute_output_contains "unresolved link"
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
