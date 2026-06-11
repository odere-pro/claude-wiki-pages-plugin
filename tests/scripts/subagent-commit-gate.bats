#!/usr/bin/env bats
# Tests for scripts/subagent-commit-gate.sh — the SubagentStop commit backstop.
#
# Behavior under test:
#   - Only acts on the four write-path agents; silent no-op otherwise.
#   - Dirty vault after a matching agent → exactly one scoped backstop commit.
#   - Clean vault → no commit.
#   - gitCheckpoint.mode=off (env override) → complete no-op.
#   - Vault not in any work tree → repo is created (coverage guarantee).
#   - Inherited parent repo: unrelated project files are NOT swallowed.
#   - Always exits 0.

load '../test_helper/common'

setup() {
  _load_helpers
  PROJ="$BATS_TEST_TMPDIR/proj"
  VAULT="$PROJ/vault"
  mkdir -p "$VAULT/wiki"
  printf '%s\n' '---' 'schema_version: 2' '---' >"$VAULT/CLAUDE.md"
}

git_vault() {
  git -C "$VAULT" "$@"
}

init_vault_repo() {
  git_vault init -q
  git_vault -c user.name=t -c user.email=t@t -c commit.gpgsign=false add -A
  git_vault -c user.name=t -c user.email=t@t -c commit.gpgsign=false commit -qm init --no-verify
}

run_gate() {
  local agent="$1"
  run bash -c "cd '$PROJ'; export CLAUDE_WIKI_PAGES_VAULT='$VAULT' CLAUDE_PROJECT_DIR='$PROJ'; printf '%s' '{\"agent_name\":\"$agent\"}' | bash '$REPO_ROOT/scripts/subagent-commit-gate.sh'"
}

@test "commit-gate: silent no-op for a non-write-path agent" {
  init_vault_repo
  printf 'dirty\n' >"$VAULT/wiki/dirty.md"
  run_gate "claude-wiki-pages-analyst-agent"
  assert_success
  assert_output_empty
  # still dirty — nothing was committed
  [ -n "$(git_vault status --porcelain)" ]
}

@test "commit-gate: dirty vault after ingest-agent → exactly one backstop commit" {
  init_vault_repo
  printf '%s\n' '---' 'title: log' '---' >"$VAULT/wiki/log.md"
  git_vault -c user.name=t -c user.email=t@t -c commit.gpgsign=false add -A
  git_vault -c user.name=t -c user.email=t@t -c commit.gpgsign=false commit -qm log --no-verify
  before=$(git_vault rev-list --count HEAD)
  printf 'left dirty\n' >"$VAULT/wiki/leftover.md"
  run_gate "claude-wiki-pages-ingest-agent"
  assert_success
  assert_output_contains "COMMIT BACKSTOP"
  after=$(git_vault rev-list --count HEAD)
  [ "$after" -eq $((before + 1)) ]
  run git_vault log -1 --pretty=%s
  assert_output_contains "post-write backstop"
  [ -z "$(git_vault status --porcelain)" ]
  # Paper trace: backstop entry with pre-state SHA landed in wiki/log.md and
  # is committed inside the backstop commit.
  run cat "$VAULT/wiki/log.md"
  assert_output_contains "claude-wiki-pages-ingest-agent backstop"
  assert_output_contains "pre-state:"
}

@test "commit-gate: clean vault → no commit, no output" {
  init_vault_repo
  before=$(git_vault rev-parse HEAD)
  run_gate "claude-wiki-pages-curator-agent"
  assert_success
  assert_output_empty
  [ "$(git_vault rev-parse HEAD)" = "$before" ]
}

@test "commit-gate: mode=off is a complete no-op even with a dirty vault" {
  init_vault_repo
  printf 'dirty\n' >"$VAULT/wiki/dirty.md"
  before=$(git_vault rev-parse HEAD)
  run bash -c "cd '$PROJ'; export CLAUDE_WIKI_PAGES_VAULT='$VAULT' CLAUDE_PROJECT_DIR='$PROJ' CLAUDE_WIKI_PAGES_GITCHECKPOINT_MODE=off; printf '%s' '{\"agent_name\":\"claude-wiki-pages-polish-agent\"}' | bash '$REPO_ROOT/scripts/subagent-commit-gate.sh'"
  assert_success
  assert_output_empty
  [ "$(git_vault rev-parse HEAD)" = "$before" ]
}

@test "commit-gate: vault not in any work tree → repo created and writes committed" {
  # No init: the backstop must create coverage rather than skip.
  printf 'orphan write\n' >"$VAULT/wiki/orphan.md"
  run_gate "claude-wiki-pages-maintenance-agent"
  assert_success
  assert_output_contains "COMMIT BACKSTOP"
  [ -d "$VAULT/.git" ]
  [ -z "$(git_vault status --porcelain)" ]
}

@test "commit-gate: inherited parent repo — user files outside the vault survive" {
  # Parent project repo with the vault nested inside; no vault-own repo.
  git -C "$PROJ" init -q
  git -C "$PROJ" -c user.name=t -c user.email=t@t -c commit.gpgsign=false add -A
  git -C "$PROJ" -c user.name=t -c user.email=t@t -c commit.gpgsign=false commit -qm init --no-verify
  printf 'user wip\n' >"$PROJ/user-wip.ts"
  printf 'agent write\n' >"$VAULT/wiki/agent-write.md"

  run_gate "claude-wiki-pages-ingest-agent"
  assert_success
  assert_output_contains "COMMIT BACKSTOP"

  run git -C "$PROJ" show --name-only --pretty=format:
  assert_output_contains "vault/wiki/agent-write.md"
  refute_output_contains "user-wip.ts"
  run git -C "$PROJ" status --porcelain
  assert_output_contains "?? user-wip.ts"
}
