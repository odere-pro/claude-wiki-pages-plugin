#!/usr/bin/env bats
# Tests for scripts/heartbeat.sh
#
# Behavior under test:
#   - Off by default (maintenance.enabled unset) → silent no-op.
#   - Enabled + backlog → prints a single CATCHUP recommendation.
#   - Cooldown → a second run within the window stays silent.
# Never mutates the vault; only recommends.

load '../test_helper/common'

setup() {
  _load_helpers
  PROJ="$BATS_TEST_TMPDIR/proj"
  VAULT="$PROJ/vault"
  mkdir -p "$VAULT/raw" "$VAULT/wiki/_sources" "$PROJ/.claude/claude-wiki-pages"
  printf '%s\n' '---' 'title: log' '---' >"$VAULT/wiki/log.md"
  printf 'unprocessed source\n' >"$VAULT/raw/new.md" # no _sources/new.md → pending
}

run_hb() {
  run bash -c "cd '$PROJ'; export CLAUDE_WIKI_PAGES_VAULT='$VAULT' CLAUDE_WIKI_PAGES_SETTINGS_FILE='$PROJ/.claude/claude-wiki-pages/settings.json'; bash '$REPO_ROOT/scripts/heartbeat.sh'"
}

enable_maintenance() {
  printf '{"maintenance":{"enabled":true}}\n' >"$PROJ/.claude/claude-wiki-pages.json"
}

@test "Heartbeat catch-up: stays a silent no-op when maintenance is disabled by default" {
  run_hb
  assert_success
  assert_output_empty
}

@test "Heartbeat catch-up: emits a CATCHUP recommendation when enabled and a backlog exists" {
  enable_maintenance
  run_hb
  assert_success
  assert_output_contains "CATCHUP:"
  assert_output_contains "pending source"
}

@test "Heartbeat catch-up: cooldown suppresses a second run within the window" {
  enable_maintenance
  run_hb
  assert_output_contains "CATCHUP:"
  # second run within the default 60-minute window → silent
  run_hb
  assert_success
  assert_output_empty
}

@test "Heartbeat catch-up: emits a MAINTENANCE advisory when a backlog exists and unattended is false" {
  enable_maintenance
  # No maintenance.unattended in the config → defaults to false.
  run_hb
  assert_success
  assert_output_contains "MAINTENANCE:"
  assert_output_contains "pending"
  assert_output_contains "maintenance-run.sh"
}

@test "Heartbeat catch-up: the MAINTENANCE advisory is absent when unattended is true" {
  printf '{"maintenance":{"enabled":true,"unattended":true}}\n' >"$PROJ/.claude/claude-wiki-pages.json"
  run_hb
  assert_success
  # With unattended=true the advisory must not appear (the scheduled helper takes care of it).
  refute_output_contains "MAINTENANCE:"
}

@test "Heartbeat catch-up: the MAINTENANCE advisory is absent when there is no backlog" {
  enable_maintenance
  # Remove the pending source so backlog is empty.
  rm -f "$VAULT/raw/new.md"
  run_hb
  assert_success
  assert_output_empty
}

@test "Heartbeat catch-up: completes within the deadline and falls back to degraded mode when the engine hangs" {  # spec M27
  # This test pins M27: _engine_with_timeout must enforce the deadline so a
  # hung Bun process cannot block SessionStart indefinitely. We replace
  # engine.sh with a stub that sleeps longer than the configured timeout, then
  # assert the heartbeat (a) exits in time and (b) falls through to degraded
  # mode (CATCHUP line from the bash probe) rather than hanging.
  enable_maintenance

  # Build a fake engine.sh that sleeps for 5 seconds — longer than the 1 s
  # timeout we configure below.
  local FAKE_SCRIPTS
  FAKE_SCRIPTS="$BATS_TEST_TMPDIR/fake-scripts"
  mkdir -p "$FAKE_SCRIPTS"
  cp "$REPO_ROOT/scripts/heartbeat.sh" "$FAKE_SCRIPTS/heartbeat.sh"
  cp "$REPO_ROOT/scripts/resolve-vault.sh" "$FAKE_SCRIPTS/resolve-vault.sh"
  # B06: resolve-vault.sh sources these focused libs from its own dir; the fake
  # dir must carry them too or the source fails (No such file) and aborts.
  cp "$REPO_ROOT/scripts/lib-vault-registry.sh" "$FAKE_SCRIPTS/lib-vault-registry.sh"
  cp "$REPO_ROOT/scripts/lib-wired-source.sh" "$FAKE_SCRIPTS/lib-wired-source.sh"
  # Stub engine.sh: sleep for 5 s then exit — simulates a hung Bun process.
  printf '#!/bin/bash\nsleep 5\n' >"$FAKE_SCRIPTS/engine.sh"
  chmod +x "$FAKE_SCRIPTS/engine.sh"

  local START END ELAPSED
  START=$(date +%s 2>/dev/null || echo 0)

  # Run with a 1-second timeout; the stub engine sleeps 5 s so it must be
  # killed by _engine_with_timeout, which drives fallback to the bash probe.
  # cd into PROJ so the relative PROJECT_CFG (.claude/claude-wiki-pages.json)
  # written by enable_maintenance is found — without it heartbeat exits at the
  # opt-in guard and never reaches the timeout path this test is pinning.
  run bash -c "
    cd '$PROJ'
    export CLAUDE_WIKI_PAGES_VAULT='$VAULT'
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$PROJ/.claude/claude-wiki-pages/settings.json'
    export CLAUDE_WIKI_PAGES_HEARTBEAT_TIMEOUT=1
    bash '$FAKE_SCRIPTS/heartbeat.sh'
  "
  END=$(date +%s 2>/dev/null || echo 0)

  assert_success
  # Must finish well before the stub's 5 s sleep.  Allow 4 s for process
  # startup overhead (conservative on slow CI).
  ELAPSED=$((END - START))
  if [ "$ELAPSED" -ge 5 ]; then
    printf 'timeout test: heartbeat took %ds — engine stub was not killed in time\n' "$ELAPSED" >&2
    return 1
  fi
  # Degraded mode must have fired: the bash probe finds new.md unprocessed.
  assert_output_contains "CATCHUP:"
}

@test "Heartbeat catch-up: emits a SYNC notice when a wired source has changed docs" {
  command -v bun >/dev/null 2>&1 || skip "SYNC notice is engine-only (needs bun)"
  enable_maintenance

  # Build a fully isolated scratch repo so we do not inherit global git config
  # (gpgsign, tag.gpgsign, hooks) from the developer's or CI environment.
  # Uses a separate tmpdir so it is independent of $PROJ and $VAULT.
  local SCRATCH
  SCRATCH="$(mktemp -d "${BATS_TEST_TMPDIR}/hb-sync-repo.XXXXXX")"

  # The project is a git repo wired as a docs source; one doc changed since
  # the recorded sync point.
  printf '# readme\n' >"$SCRATCH/README.md"
  (
    cd "$SCRATCH" || exit 1
    git init -q
    git config user.email "test@example.com"
    git config user.name "Test"
    git config commit.gpgsign false
    git config tag.gpgsign false
    git config core.hooksPath /dev/null
    git add -A
    git commit -q -m "init"
  )
  synced=$(git -C "$SCRATCH" rev-parse HEAD)
  printf 'more docs\n' >>"$SCRATCH/README.md"
  (
    cd "$SCRATCH" || exit 1
    git commit -qam "change"
  )

  cat >"$PROJ/.claude/claude-wiki-pages/settings.json" <<EOF
{
  "default_vault_path": "vault",
  "current_vault_path": "vault",
  "wired_sources": [{
    "name": "proj", "path": "$SCRATCH", "vault": "$VAULT",
    "include": ["README*", "*.md"], "exclude": [".git/**"],
    "lastSyncedCommit": "$synced", "lastSyncedAt": "2026-06-11T00:00:00Z"
  }]
}
EOF

  run_hb
  assert_success
  assert_output_contains 'SYNC: wired source "proj" has 1 changed doc(s)'
  assert_output_contains "/claude-wiki-pages:sync"
  rm -rf "$SCRATCH"
}
