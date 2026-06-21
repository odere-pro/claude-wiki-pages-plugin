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

# ── N18-snapshot: set -e strict-mode must be present ────────────────────────
# The bash fallback must have set -euo pipefail (with -e) so that any
# load-bearing command that fails WITHOUT an explicit || guard aborts the
# script rather than silently continuing with invalid state.
@test "snapshot: N18 — script source declares set -euo pipefail (strict mode with -e)" {
  # Static structural check: grep for the strict-mode line.
  run grep -q 'set -euo pipefail' "$REPO_ROOT/scripts/snapshot.sh"
  assert_success
}

# ── M33: ensureRepo must use scoped pathspec (no bare -A) ───────────────────
# A bare `git add -A` in the fallback ensureRepo block could stage files from
# an INHERITED parent-project repo that the vault happens to live inside,
# swallowing the user's unrelated dirty files. The fix: replace -A with
# an explicit scoped pathspec `-- .` (vault-directory-only staging).
@test "snapshot: M33 — fallback ensureRepo does not use bare -A pathspec (explicit -- . only)" {
  # Strip comment lines, then count 'add -A' occurrences.  Expect exactly 0.
  # `grep -c` prints the count; we add `|| true` so exit-1 (zero matches)
  # does not abort the subshell; `$output` holds the count string.
  run bash -c "grep -v '^[[:space:]]*#' '$REPO_ROOT/scripts/snapshot.sh' | { grep -c 'add -A' || true; }"
  assert_eq "$output" "0"
}

# ── H09: ensureRepo must be inside the pre lock (no unlocked git-add race) ──
# When the lock times out for `pre`, NO git operation must run — including
# the ensureRepo block that was previously executed BEFORE lock acquisition.
# The vault should remain in its pre-init state (no .git dir, no commit).
@test "snapshot: H09 — lock timeout skips ensureRepo and checkpoint (no unlocked git ops)" {
  # Fake flock that always times out (returns 1).
  printf '#!/bin/bash\nexit 1\n' >"$FAKEBIN/flock"
  chmod +x "$FAKEBIN/flock"

  # Start with a vault that has NO .git directory to make it observable.
  rm -rf "$VAULT/.git"

  run_snap pre --op op-ensure-lock-fail
  assert_success
  assert_output_contains "skipped"

  # CRITICAL assertion: because the lock timed out and ensureRepo must be
  # INSIDE the lock for the pre path, no git repo should have been initialised
  # and no checkpoint commit should exist.
  if [ -d "$VAULT/.git" ]; then
    # A .git dir was created — ensureRepo ran outside the lock: fail.
    echo "FAIL: .git was initialised despite lock timeout (ensureRepo ran outside the lock)" >&2
    return 1
  fi
}

@test "snapshot: C01 — lock timeout exits cleanly, skips all git ops including ensureRepo (fail-closed)" {
  # Fake flock that always times out (returns 1) to simulate lock contention.
  printf '#!/bin/bash\nexit 1\n' >"$FAKEBIN/flock"
  chmod +x "$FAKEBIN/flock"

  # H09 fix: ensureRepo is now INSIDE the pre lock.  On lock timeout, NO git
  # operation runs at all — neither init nor the checkpoint commit.
  rm -rf "$VAULT/.git"

  run_snap pre --op op-lock-fail
  assert_success
  assert_output_contains "skipped"

  # With ensureRepo inside the lock, a lock timeout must leave the vault
  # completely uninitialised (no .git dir, no commit at all).
  if [ -d "$VAULT/.git" ]; then
    echo "FAIL: .git was initialised despite lock timeout (ensureRepo must be inside the lock)" >&2
    return 1
  fi
}
