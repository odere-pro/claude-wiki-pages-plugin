#!/bin/bash
# vault-lock.sh — advisory exclusive lock for snapshot/commit/log-append paths.
#
# SOURCEABLE (not executable): `source "$(dirname "$0")/vault-lock.sh"` then
# use `vault_lock_acquire <vault>` / `vault_lock_release <vault>` around
# any sequence that does:
#
#   isClean → stash/add → commit
#   isClean → appendLog → commit
#
# The lock is advisory (flock-based). Because git itself does not use flock
# for its index lock, this cannot guarantee mutual exclusion against raw git
# calls, but it eliminates races between *this plugin's* snapshot/commit
# invocations, which is the scope of the correlation #1 cluster (H06–H11).
#
# Lock file: <vault>/.git/claude-wiki-pages.lock  (inside .git/ — scoped to
# the vault's repo and invisible to git status / add).  When <vault>/.git/
# does not exist yet (pre-ensureRepo), falls back to <vault>/.cwp.lock.
#
# Timeout: VAULT_LOCK_TIMEOUT_SEC (default 30 s). After the timeout the
# acquire prints a warning and returns 1 (caller must handle gracefully —
# never block the write phase completely).
#
# Usage from a script:
#
#   source "$(dirname "$0")/vault-lock.sh"
#   if vault_lock_acquire "$VAULT"; then
#     # critical section
#     vault_lock_release "$VAULT"
#   else
#     echo "WARN: could not acquire vault lock — proceeding without lock" >&2
#   fi
#
# Note: This file must NOT contain `set -euo pipefail` at the top level —
# it is sourced by scripts that already have strict mode set, and a
# top-level set would shadow their pipefail. Guard each function instead.

# Resolve the lock file path for a given vault directory.
_vault_lock_file() {
  local vault="$1" git_dir
  git_dir="${vault}/.git"
  if [ -d "$git_dir" ]; then
    printf '%s/claude-wiki-pages.lock' "$git_dir"
  else
    printf '%s/.cwp.lock' "$vault"
  fi
}

# Acquire an exclusive advisory flock for <vault>.
# Returns 0 on success, 1 on timeout or error.
vault_lock_acquire() {
  local vault="$1" lockfile timeout_sec
  lockfile=$(_vault_lock_file "$vault")
  timeout_sec="${VAULT_LOCK_TIMEOUT_SEC:-30}"

  # Open the lock file descriptor on fd 200 (arbitrary high number; unlikely
  # to collide with stdin/out/err or other open fds in the caller).
  exec 200>"$lockfile" 2>/dev/null || {
    echo "WARN: vault-lock: could not open lock file: $lockfile" >&2
    return 1
  }

  if ! flock -w "$timeout_sec" 200 2>/dev/null; then
    echo "WARN: vault-lock: timed out waiting for vault lock (${timeout_sec}s): $lockfile" >&2
    exec 200>&- 2>/dev/null || true
    return 1
  fi
  return 0
}

# Release the flock held by vault_lock_acquire.
vault_lock_release() {
  flock -u 200 2>/dev/null || true
  exec 200>&- 2>/dev/null || true
}
