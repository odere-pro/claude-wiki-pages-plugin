#!/usr/bin/env bats
# Tests for scripts/snapshot.sh — the agent-facing snapshot wrapper.
#
# Behavior under test:
#   - bun-absent bash fallback: pre writes a checkpoint, post commits the phase.
#   - The post commit message carries the --label.
#   - gitCheckpoint.mode=off (env override) → no git operations at all.
#   - A clean vault post → no commit (never an empty snapshot commit).
#   - Always exits 0, even on usage errors (snapshot reports, never gates).
#   - C01: on lock-acquire timeout, skip git ops and exit 0 cleanly.
#
# `flock` is Linux-only; tests that exercise the git path provide a fake `flock`
# shim in the PATH so lock acquisition succeeds on macOS and Linux alike.

load '../test_helper/common'

setup() {
  _load_helpers
  PROJ="$BATS_TEST_TMPDIR/proj"
  VAULT="$PROJ/vault"
  mkdir -p "$VAULT/wiki"
  printf '%s\n' '---' 'schema_version: 2' '---' >"$VAULT/CLAUDE.md"

  # Fake flock that always succeeds (returns 0) so vault_lock_acquire works on
  # platforms where flock(1) is absent (macOS). The REAL lock semantics are
  # tested separately; here we test snapshot behaviour, not the locking mechanism.
  FAKEBIN="$BATS_TEST_TMPDIR/fakebin"
  mkdir -p "$FAKEBIN"
  printf '#!/bin/bash\nexec "$@" 2>/dev/null; exit 0\n' >"$FAKEBIN/flock"
  chmod +x "$FAKEBIN/flock"
}

# Force the bash fallback by hiding bun; inject fake flock so lock acquisition
# succeeds on all platforms.
run_snap() {
  run bash -c "cd '$PROJ'; export PATH='$FAKEBIN:/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin'; export CLAUDE_WIKI_PAGES_VAULT='$VAULT'; bash '$REPO_ROOT/scripts/snapshot.sh' $*"
}

@test "snapshot: pre initialises the repo and writes a checkpoint (fallback path)" {
  run_snap pre --op op1
  assert_success
  assert_output_contains "snapshot pre: checkpoint"
  run git -C "$VAULT" log --oneline
  assert_output_contains "checkpoint: claude-wiki-pages pre-heal"
  assert_output_contains "initial vault commit"
}

@test "snapshot: post commits the write phase with the label in the message" {
  run_snap pre --op op2
  printf '%s\n' '---' 'title: log' '---' >"$VAULT/wiki/log.md"
  printf 'new page\n' >"$VAULT/wiki/page.md"
  run_snap post --op op2 --label '"curator judgment fixes"'
  assert_success
  assert_output_contains "snapshot post: committed"
  run git -C "$VAULT" log -1 --pretty=%s
  assert_output_contains "snapshot: curator judgment fixes op2"
  # Paper trace: log entry with the pre-state SHA, committed in the same
  # snapshot commit (tree clean afterwards).
  run cat "$VAULT/wiki/log.md"
  assert_output_contains "snapshot | curator judgment fixes (op2)"
  assert_output_contains "pre-state:"
  [ -z "$(git -C "$VAULT" status --porcelain)" ]
}

@test "snapshot: post on a clean vault skips without an empty commit" {
  run_snap pre --op op3
  before=$(git -C "$VAULT" rev-parse HEAD)
  run_snap post --op op3
  assert_success
  assert_output_contains "nothing to commit"
  [ "$(git -C "$VAULT" rev-parse HEAD)" = "$before" ]
}

@test "snapshot: mode=off is a complete no-op (no repo, no commits)" {
  run bash -c "cd '$PROJ'; export PATH='$FAKEBIN:/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin'; export CLAUDE_WIKI_PAGES_VAULT='$VAULT' CLAUDE_WIKI_PAGES_GITCHECKPOINT_MODE=off; bash '$REPO_ROOT/scripts/snapshot.sh' pre --op op4"
  assert_success
  assert_output_contains "skipped (gitCheckpoint.mode=off)"
  [ ! -d "$VAULT/.git" ]
}

@test "snapshot: missing subcommand reports usage but still exits 0" {
  run_snap
  assert_success
  run_snap bogus
  assert_success
}

@test "snapshot: C01 — lock timeout exits cleanly, skips checkpoint commit (fail-closed)" {
  # Fake flock that always times out (returns 1) to simulate lock contention.
  printf '#!/bin/bash\nexit 1\n' >"$FAKEBIN/flock"
  chmod +x "$FAKEBIN/flock"

  run_snap pre --op op-lock-fail
  assert_success
  assert_output_contains "skipped"
  # The ensureRepo block still runs (before lock acquisition), but the checkpoint
  # commit (inside the lock) must NOT have been written.  The initial repo may
  # exist; the key assertion is that no cwp-style commit was added.
  if git -C "$VAULT" rev-parse HEAD >/dev/null 2>&1; then
    # If a repo exists (ensureRepo ran), there should be no checkpoint commit.
    COMMIT_MSG=$(git -C "$VAULT" log -1 --pretty=%s 2>/dev/null || true)
    case "$COMMIT_MSG" in
      "checkpoint: claude-wiki-pages"*)
        echo "FAIL: checkpoint commit was written despite lock timeout" >&2
        return 1
        ;;
    esac
  fi
}
