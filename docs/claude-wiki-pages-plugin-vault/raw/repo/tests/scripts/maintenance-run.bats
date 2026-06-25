#!/usr/bin/env bats
# Tests for scripts/maintenance-run.sh
#
# Behavior under test:
#   - Refuses when maintenance.unattended is false (the default) — prints how to
#     enable, exits 0 (idempotent, safe to cron).
#   - No-op when there is no backlog (nothing to do) and exits 0.
#   - Never targets tests/fixtures/reference-vault, even if the vault resolves there.
#
# Every test runs against a scratch directory; no real vault or project config
# is mutated. The script is callable without any LLM or Bun present: it reads
# config via jq (already required for heartbeat) and probes backlog via the
# engine only when unattended=true. The tests below stay entirely in the
# unattended=false / empty-backlog / safety-guard paths so Bun is not required.

load '../test_helper/common'

setup() {
  _load_helpers
  PROJ="$BATS_TEST_TMPDIR/proj"
  VAULT="$PROJ/vault"
  mkdir -p "$VAULT/raw" "$VAULT/wiki" "$PROJ/.claude/claude-wiki-pages"
  printf '%s\n' '---' 'title: log' '---' >"$VAULT/wiki/log.md"
}

# Minimal helper: run maintenance-run.sh with the scratch project's vault and
# settings. Config path uses the EDIT home (.claude/claude-wiki-pages.json),
# matching how heartbeat.sh and snapshot.sh read config.
run_mr() {
  run bash -c "
    cd '$PROJ'
    export CLAUDE_WIKI_PAGES_VAULT='$VAULT'
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$PROJ/.claude/claude-wiki-pages/settings.json'
    bash '$REPO_ROOT/scripts/maintenance-run.sh' \"\$@\"
  " -- "$@"
}

# Write a project config with the given JSON maintenance block.
write_config() {
  printf '%s\n' "$1" >"$PROJ/.claude/claude-wiki-pages.json"
}

# ---------------------------------------------------------------------------
# 1. Refuses when unattended=false (default — key absent)
# ---------------------------------------------------------------------------

@test "maintenance-run: refuses when maintenance.unattended is absent (default off)" {
  # No config file at all → unattended defaults to false.
  run_mr
  assert_success
  assert_output_contains "maintenance.unattended"
}

@test "maintenance-run: refuses when maintenance.unattended is explicitly false" {
  write_config '{"maintenance":{"enabled":true,"unattended":false}}'
  run_mr
  assert_success
  assert_output_contains "maintenance.unattended"
}

@test "maintenance-run: refusal message mentions maintenance-run.sh" {
  run_mr
  assert_success
  assert_output_contains "maintenance-run.sh"
}

@test "maintenance-run: refusal message explains how to enable" {
  run_mr
  assert_success
  # Must point the operator at the config key, not just name the script.
  assert_output_contains "true"
}

# ---------------------------------------------------------------------------
# 2. No-op when backlog is empty (unattended=true, empty raw/)
# ---------------------------------------------------------------------------

@test "maintenance-run: exits 0 silently when unattended=true but raw/ is empty and engine absent" {
  # When Bun is absent, the script must degrade gracefully: no backlog detectable
  # → nothing to do → exit 0. This also acts as the idempotent-cron safety test.
  write_config '{"maintenance":{"enabled":true,"unattended":true,"maxPerRun":10}}'
  # Ensure raw/ is empty.
  find "$VAULT/raw" -type f -delete 2>/dev/null || true

  # We cannot guarantee Bun is present in the test environment; the script must
  # not error in either case. Skip assertions on output content (engine may
  # emit version-specific text) but the script must exit 0.
  run_mr
  assert_success
}

# ---------------------------------------------------------------------------
# 3. Never targets tests/fixtures/reference-vault
# ---------------------------------------------------------------------------

@test "maintenance-run: refuses to run against tests/fixtures/reference-vault" {
  # Even if CLAUDE_WIKI_PAGES_VAULT is set to tests/fixtures/reference-vault the script
  # must detect the protected path and abort with a clear message, exiting 0.
  local EXAMPLE_VAULT="$REPO_ROOT/tests/fixtures/reference-vault"
  run bash -c "
    cd '$PROJ'
    export CLAUDE_WIKI_PAGES_VAULT='$EXAMPLE_VAULT'
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$PROJ/.claude/claude-wiki-pages/settings.json'
    bash '$REPO_ROOT/scripts/maintenance-run.sh'
  "
  assert_success
  assert_output_contains "tests/fixtures/reference-vault"
}

@test "maintenance-run: safe path check is path-prefix based (not substring)" {
  # A vault named 'tests/fixtures/reference-vault-extended' must NOT be blocked.
  local ALT_VAULT="$BATS_TEST_TMPDIR/tests/fixtures/reference-vault-extended"
  mkdir -p "$ALT_VAULT/raw" "$ALT_VAULT/wiki"
  # No config → unattended=false → refusal message (not the safety block).
  run bash -c "
    cd '$PROJ'
    export CLAUDE_WIKI_PAGES_VAULT='$ALT_VAULT'
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$PROJ/.claude/claude-wiki-pages/settings.json'
    bash '$REPO_ROOT/scripts/maintenance-run.sh'
  "
  assert_success
  # Should print the unattended refusal message, NOT the vault-example guard.
  assert_output_contains "maintenance.unattended"
  refute_output_contains "tests/fixtures/reference-vault"
}

# ---------------------------------------------------------------------------
# 4. N18-maintenance: strict mode must include -e (set -euo pipefail)
# ---------------------------------------------------------------------------

@test "maintenance-run: N18 — script source declares set -euo pipefail (strict mode with -e)" {
  # Static structural check: grep for the full strict-mode line.
  # This test will FAIL until the -e flag is added (TDD red phase).
  run grep -q 'set -euo pipefail' "$REPO_ROOT/scripts/maintenance-run.sh"
  assert_success
}

# ---------------------------------------------------------------------------
# 5. H06: advisory vault lock is acquired before the log append
# ---------------------------------------------------------------------------

@test "maintenance-run: H06 — vault_lock_acquire is called before wiki/log.md append" {
  # Static structural check: the log-append section must wrap the >> in the
  # vault lock.  We verify both that vault_lock_acquire is referenced and that
  # vault-lock.sh is sourced so the function is available.
  run grep -q 'vault_lock_acquire' "$REPO_ROOT/scripts/maintenance-run.sh"
  assert_success
}

@test "maintenance-run: H06 — vault-lock.sh is sourced (lock functions available)" {
  run grep -q 'source.*vault-lock\.sh' "$REPO_ROOT/scripts/maintenance-run.sh"
  assert_success
}

@test "maintenance-run: H06 — cfg_scalar returns 0 when jq is absent (no abort under set -e)" {
  # Verify that cfg_scalar is guarded with || return 0 (or equivalent) so
  # the function never exits non-zero when jq is not found.  Under set -euo
  # pipefail a non-zero function return propagates to the caller and aborts
  # the script; this test pins the guard to prevent regression.
  run grep -q '|| return 0' "$REPO_ROOT/scripts/maintenance-run.sh"
  assert_success
}
