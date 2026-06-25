#!/usr/bin/env bats
# Tests for scripts/session-memory.sh
#
# Behavior under test (decision #5 — Stop/SessionEnd hook):
#   - No-op when session scratch file is absent or empty.
#   - Writes ONE new file under <vault>/raw/agent-sessions/<session-id>-<timestamp>.md
#     with "source_type: agent-session" in frontmatter.
#   - Idempotent: second invocation with the same session ID does NOT write a second file.
#   - Commits the new file to git (basic smoke: git log shows a new commit after the write).
#
# The script reads a session-scratch handoff path from the env var
# CLAUDE_WIKI_PAGES_SESSION_SCRATCH (or a derived default). When the file is
# absent or empty the script exits 0 (no-op). When present it contains the
# learning body text.
#
# Tests use a throwaway vault with a git repo (ensureRepo semantics: git init
# + initial commit when not already a repo).

load '../test_helper/common'

setup() {
  _load_helpers
  # Create a throwaway vault directory as a git repo.
  VAULT_DIR="$(mktemp -d "${BATS_TEST_TMPDIR:-/tmp}/session-memory-vault.XXXXXX")"
  mkdir -p "$VAULT_DIR/raw/agent-sessions"
  git -C "$VAULT_DIR" init -q
  git -C "$VAULT_DIR" config user.email "test@example.com"
  git -C "$VAULT_DIR" config user.name "Test"
  git -C "$VAULT_DIR" config commit.gpgsign false
  git -C "$VAULT_DIR" config core.hooksPath /dev/null
  # Initial commit so HEAD exists.
  touch "$VAULT_DIR/.gitkeep"
  git -C "$VAULT_DIR" add -A
  git -C "$VAULT_DIR" commit -q -m "init"
  export VAULT_DIR
}

teardown() {
  rm -rf "$VAULT_DIR"
  unset VAULT_DIR
}

@test "session-memory: no-op when scratch file is absent" {
  local session_id="sess-absent-$$"
  local scratch="/tmp/no-such-file-$$"
  [ ! -e "$scratch" ]

  run bash -c "
    export CLAUDE_WIKI_PAGES_VAULT='$VAULT_DIR'
    export CLAUDE_WIKI_PAGES_SESSION_SCRATCH='$scratch'
    export CLAUDE_WIKI_PAGES_SESSION_ID='$session_id'
    bash '$REPO_ROOT/scripts/session-memory.sh'
  "

  assert_success
  # No new files written.
  local count
  count=$(find "$VAULT_DIR/raw/agent-sessions" -type f -name "*.md" | wc -l | tr -d ' ')
  assert_eq "$count" "0"
}

@test "session-memory: no-op when scratch file is empty" {
  local session_id="sess-empty-$$"
  local scratch="$BATS_TEST_TMPDIR/scratch-empty-$$.txt"
  touch "$scratch"

  run bash -c "
    export CLAUDE_WIKI_PAGES_VAULT='$VAULT_DIR'
    export CLAUDE_WIKI_PAGES_SESSION_SCRATCH='$scratch'
    export CLAUDE_WIKI_PAGES_SESSION_ID='$session_id'
    bash '$REPO_ROOT/scripts/session-memory.sh'
  "

  assert_success
  local count
  count=$(find "$VAULT_DIR/raw/agent-sessions" -type f -name "*.md" | wc -l | tr -d ' ')
  assert_eq "$count" "0"
}

@test "session-memory: writes ONE new file with source_type: agent-session" {
  local session_id="sess-write-$$"
  local scratch="$BATS_TEST_TMPDIR/scratch-write-$$.txt"
  echo "A useful session learning to persist." >"$scratch"

  run bash -c "
    export CLAUDE_WIKI_PAGES_VAULT='$VAULT_DIR'
    export CLAUDE_WIKI_PAGES_SESSION_SCRATCH='$scratch'
    export CLAUDE_WIKI_PAGES_SESSION_ID='$session_id'
    bash '$REPO_ROOT/scripts/session-memory.sh'
  "

  assert_success
  # Exactly one file written.
  local count
  count=$(find "$VAULT_DIR/raw/agent-sessions" -type f -name "*.md" | wc -l | tr -d ' ')
  assert_eq "$count" "1"

  # The file contains the required frontmatter marker.
  local written
  written=$(find "$VAULT_DIR/raw/agent-sessions" -type f -name "*.md")
  assert_contains "$(cat "$written")" "source_type: agent-session"

  # The file contains "type: source" (raw source, not a wiki page).
  assert_contains "$(cat "$written")" "type: source"

  # The learning body is present.
  assert_contains "$(cat "$written")" "A useful session learning to persist."
}

@test "session-memory: git-commits the new file" {
  local session_id="sess-commit-$$"
  local scratch="$BATS_TEST_TMPDIR/scratch-commit-$$.txt"
  echo "Learning to commit." >"$scratch"

  local commits_before
  commits_before=$(git -C "$VAULT_DIR" rev-list --count HEAD 2>/dev/null || echo 0)

  run bash -c "
    export CLAUDE_WIKI_PAGES_VAULT='$VAULT_DIR'
    export CLAUDE_WIKI_PAGES_SESSION_SCRATCH='$scratch'
    export CLAUDE_WIKI_PAGES_SESSION_ID='$session_id'
    bash '$REPO_ROOT/scripts/session-memory.sh'
  "

  assert_success
  local commits_after
  commits_after=$(git -C "$VAULT_DIR" rev-list --count HEAD 2>/dev/null || echo 0)
  # At least one new commit.
  [ "$commits_after" -gt "$commits_before" ]
}

@test "session-memory: idempotent — second fire for same session ID writes no second file" {
  local session_id="sess-idem-$$"
  local scratch="$BATS_TEST_TMPDIR/scratch-idem-$$.txt"
  echo "Idempotency test learning." >"$scratch"

  # First invocation.
  bash -c "
    export CLAUDE_WIKI_PAGES_VAULT='$VAULT_DIR'
    export CLAUDE_WIKI_PAGES_SESSION_SCRATCH='$scratch'
    export CLAUDE_WIKI_PAGES_SESSION_ID='$session_id'
    bash '$REPO_ROOT/scripts/session-memory.sh'
  "

  local count_after_first
  count_after_first=$(find "$VAULT_DIR/raw/agent-sessions" -type f -name "*.md" | wc -l | tr -d ' ')
  assert_eq "$count_after_first" "1"

  # Second invocation with same session ID (scratch may still be present).
  run bash -c "
    export CLAUDE_WIKI_PAGES_VAULT='$VAULT_DIR'
    export CLAUDE_WIKI_PAGES_SESSION_SCRATCH='$scratch'
    export CLAUDE_WIKI_PAGES_SESSION_ID='$session_id'
    bash '$REPO_ROOT/scripts/session-memory.sh'
  "

  assert_success
  local count_after_second
  count_after_second=$(find "$VAULT_DIR/raw/agent-sessions" -type f -name "*.md" | wc -l | tr -d ' ')
  # Still only one file — no double-write.
  assert_eq "$count_after_second" "1"
}
