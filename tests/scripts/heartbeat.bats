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

@test "heartbeat: silent no-op when maintenance is disabled (default)" {
  run_hb
  assert_success
  assert_output_empty
}

@test "heartbeat: emits CATCHUP when enabled and backlog exists" {
  enable_maintenance
  run_hb
  assert_success
  assert_output_contains "CATCHUP:"
  assert_output_contains "pending source"
}

@test "heartbeat: cooldown suppresses a second run within the window" {
  enable_maintenance
  run_hb
  assert_output_contains "CATCHUP:"
  # second run within the default 60-minute window → silent
  run_hb
  assert_success
  assert_output_empty
}

@test "heartbeat: emits SYNC notice when a wired source has changed docs" {
  command -v bun >/dev/null 2>&1 || skip "SYNC notice is engine-only (needs bun)"
  enable_maintenance

  # The project is a git repo wired as a docs source; one doc changed since
  # the recorded sync point.
  printf '# readme\n' >"$PROJ/README.md"
  git -C "$PROJ" init -q
  git -C "$PROJ" -c user.name=t -c user.email=t@t -c commit.gpgsign=false add -A
  git -C "$PROJ" -c user.name=t -c user.email=t@t -c commit.gpgsign=false commit -qm init --no-verify
  synced=$(git -C "$PROJ" rev-parse HEAD)
  printf 'more docs\n' >>"$PROJ/README.md"
  git -C "$PROJ" -c user.name=t -c user.email=t@t -c commit.gpgsign=false commit -qam change --no-verify

  cat >"$PROJ/.claude/claude-wiki-pages/settings.json" <<EOF
{
  "default_vault_path": "vault",
  "current_vault_path": "vault",
  "wired_sources": [{
    "name": "proj", "path": "$PROJ", "vault": "$VAULT",
    "include": ["README*", "*.md"], "exclude": [".git/**"],
    "lastSyncedCommit": "$synced", "lastSyncedAt": "2026-06-11T00:00:00Z"
  }]
}
EOF

  run_hb
  assert_success
  assert_output_contains 'SYNC: wired source "proj" has 1 changed doc(s)'
  assert_output_contains "/claude-wiki-pages:sync"
}
