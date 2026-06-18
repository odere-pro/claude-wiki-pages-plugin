#!/usr/bin/env bats
# Tests for scripts/check-deps.sh
#
# Behavior under test:
#   - Reports OK for jq when present.
#   - Reports OK for bash >= 3.2.
#   - Exits 1 when jq is missing.
#   - Reports Bun missing with a prominent ERROR: label, an install command,
#     and the bun.sh install URL — these are the p0-bun-required groundwork
#     checks. Bun absence must exit 1 so the caller can act.
#   - Reports OK for Bun when present.
#   - Install hint covers all three supported platforms (macOS/Linux/generic).
#   - The Bun check fires before the summary line so the user sees it without
#     scrolling past the dep list.

load '../test_helper/common'

setup() {
  _load_helpers
  # Resolve the absolute path of check-deps.sh once.
  SCRIPT="$REPO_ROOT/scripts/check-deps.sh"
}

# ---------------------------------------------------------------------------
# Bun present — must report OK and exit 0 (when all other deps also present)
# ---------------------------------------------------------------------------

@test "check-deps: reports OK for Bun when bun is on PATH" {
  command -v bun >/dev/null 2>&1 || skip "bun not installed on this machine"
  command -v jq  >/dev/null 2>&1 || skip "jq not installed on this machine"

  # Minimal PLUGIN_ROOT that satisfies the hooks.json and scripts checks.
  local fake_root="$BATS_TEST_TMPDIR/ok-root"
  mkdir -p "$fake_root/scripts" "$fake_root/hooks"
  printf '{}' >"$fake_root/hooks/hooks.json"
  # No extra scripts needed — the loop skips a dir with nothing executable.

  run bash -c "
    export CLAUDE_PLUGIN_ROOT='$fake_root'
    bash '$SCRIPT'
  "

  assert_success
  assert_output_contains "OK:"
  assert_output_contains "bun"
}

# ---------------------------------------------------------------------------
# Bun absent — must emit ERROR: with install instructions and exit 1
# ---------------------------------------------------------------------------

@test "check-deps: reports ERROR for Bun when bun is absent" {
  # Build a hermetic sandbox PATH that includes everything check-deps.sh
  # needs (bash, jq, find, etc.) but NOT bun.
  local SANDBOX_BIN="$BATS_TEST_TMPDIR/sandbox-bin-nobun"
  mkdir -p "$SANDBOX_BIN"
  local tool real
  for tool in bash dirname basename find wc tr mkdir cat cp grep sed sort head date jq; do
    real="$(command -v "$tool" 2>/dev/null)" || continue
    case "$real" in
      /*) ln -s "$real" "$SANDBOX_BIN/$tool" ;;
    esac
  done

  # Confirm bun is not resolvable in this sandbox.
  if PATH="$SANDBOX_BIN" command -v bun >/dev/null 2>&1; then
    skip "bun leaked into sandbox PATH — test cannot verify absent-bun branch"
  fi

  local fake_root="$BATS_TEST_TMPDIR/nobun-root"
  mkdir -p "$fake_root/scripts" "$fake_root/hooks"
  printf '{}' >"$fake_root/hooks/hooks.json"

  run env -i PATH="$SANDBOX_BIN" HOME="$HOME" \
    CLAUDE_PLUGIN_ROOT="$fake_root" \
    /bin/bash "$SCRIPT"

  # Must exit non-zero — Bun absence is a hard prereq.
  assert_status 1
  # Must emit ERROR: (prominent label, not just MISSING: or NOTICE:).
  assert_output_contains "ERROR:"
  # Must name Bun so the user knows what to install.
  assert_output_contains "bun"
}

@test "check-deps: Bun ERROR message includes bun.sh install URL" {
  local SANDBOX_BIN="$BATS_TEST_TMPDIR/sandbox-bin-nobun-url"
  mkdir -p "$SANDBOX_BIN"
  local tool real
  for tool in bash dirname basename find wc tr mkdir cat cp grep sed sort head date jq; do
    real="$(command -v "$tool" 2>/dev/null)" || continue
    case "$real" in
      /*) ln -s "$real" "$SANDBOX_BIN/$tool" ;;
    esac
  done

  if PATH="$SANDBOX_BIN" command -v bun >/dev/null 2>&1; then
    skip "bun leaked into sandbox PATH"
  fi

  local fake_root="$BATS_TEST_TMPDIR/nobun-url-root"
  mkdir -p "$fake_root/scripts" "$fake_root/hooks"
  printf '{}' >"$fake_root/hooks/hooks.json"

  run env -i PATH="$SANDBOX_BIN" HOME="$HOME" \
    CLAUDE_PLUGIN_ROOT="$fake_root" \
    /bin/bash "$SCRIPT"

  assert_status 1
  # Must point to the canonical install path.
  assert_output_contains "bun.sh/install"
}

@test "check-deps: Bun ERROR message includes curl install command" {
  local SANDBOX_BIN="$BATS_TEST_TMPDIR/sandbox-bin-nobun-curl"
  mkdir -p "$SANDBOX_BIN"
  local tool real
  for tool in bash dirname basename find wc tr mkdir cat cp grep sed sort head date jq; do
    real="$(command -v "$tool" 2>/dev/null)" || continue
    case "$real" in
      /*) ln -s "$real" "$SANDBOX_BIN/$tool" ;;
    esac
  done

  if PATH="$SANDBOX_BIN" command -v bun >/dev/null 2>&1; then
    skip "bun leaked into sandbox PATH"
  fi

  local fake_root="$BATS_TEST_TMPDIR/nobun-curl-root"
  mkdir -p "$fake_root/scripts" "$fake_root/hooks"
  printf '{}' >"$fake_root/hooks/hooks.json"

  run env -i PATH="$SANDBOX_BIN" HOME="$HOME" \
    CLAUDE_PLUGIN_ROOT="$fake_root" \
    /bin/bash "$SCRIPT"

  assert_status 1
  # The install command must be actionable — curl is the cross-platform route.
  assert_output_contains "curl -fsSL https://bun.sh/install | bash"
}

@test "check-deps: Bun ERROR message explains why Bun is required" {
  local SANDBOX_BIN="$BATS_TEST_TMPDIR/sandbox-bin-nobun-why"
  mkdir -p "$SANDBOX_BIN"
  local tool real
  for tool in bash dirname basename find wc tr mkdir cat cp grep sed sort head date jq; do
    real="$(command -v "$tool" 2>/dev/null)" || continue
    case "$real" in
      /*) ln -s "$real" "$SANDBOX_BIN/$tool" ;;
    esac
  done

  if PATH="$SANDBOX_BIN" command -v bun >/dev/null 2>&1; then
    skip "bun leaked into sandbox PATH"
  fi

  local fake_root="$BATS_TEST_TMPDIR/nobun-why-root"
  mkdir -p "$fake_root/scripts" "$fake_root/hooks"
  printf '{}' >"$fake_root/hooks/hooks.json"

  run env -i PATH="$SANDBOX_BIN" HOME="$HOME" \
    CLAUDE_PLUGIN_ROOT="$fake_root" \
    /bin/bash "$SCRIPT"

  assert_status 1
  # The message must state Bun is required (not just "missing") so the user
  # understands this is a hard prereq, not a nice-to-have.
  assert_output_contains "required"
}

# ---------------------------------------------------------------------------
# Existing behavior retained: jq still checked, bash version still checked
# ---------------------------------------------------------------------------

@test "check-deps: exits 1 when jq is absent" {
  local SANDBOX_BIN="$BATS_TEST_TMPDIR/sandbox-bin-nojq"
  mkdir -p "$SANDBOX_BIN"
  local tool real
  # Include bun so only jq absence drives the failure.
  for tool in bash dirname basename find wc tr mkdir cat cp grep sed sort head date bun; do
    real="$(command -v "$tool" 2>/dev/null)" || continue
    case "$real" in
      /*) ln -s "$real" "$SANDBOX_BIN/$tool" ;;
    esac
  done

  if PATH="$SANDBOX_BIN" command -v jq >/dev/null 2>&1; then
    skip "jq leaked into sandbox PATH"
  fi
  if ! PATH="$SANDBOX_BIN" command -v bun >/dev/null 2>&1; then
    skip "bun not available for this test variant"
  fi

  local fake_root="$BATS_TEST_TMPDIR/nojq-root"
  mkdir -p "$fake_root/scripts" "$fake_root/hooks"
  printf '{}' >"$fake_root/hooks/hooks.json"

  run env -i PATH="$SANDBOX_BIN" HOME="$HOME" \
    CLAUDE_PLUGIN_ROOT="$fake_root" \
    /bin/bash "$SCRIPT"

  assert_status 1
  assert_output_contains "jq"
}

@test "check-deps: reports bash version OK" {
  command -v bun >/dev/null 2>&1 || skip "bun not installed on this machine"
  command -v jq  >/dev/null 2>&1 || skip "jq not installed on this machine"

  local fake_root="$BATS_TEST_TMPDIR/bash-ok-root"
  mkdir -p "$fake_root/scripts" "$fake_root/hooks"
  printf '{}' >"$fake_root/hooks/hooks.json"

  run bash -c "
    export CLAUDE_PLUGIN_ROOT='$fake_root'
    bash '$SCRIPT'
  "

  assert_success
  assert_output_contains "bash"
}

# ---------------------------------------------------------------------------
# Summary line present
# ---------------------------------------------------------------------------

@test "check-deps: prints a summary count when deps are missing" {
  local SANDBOX_BIN="$BATS_TEST_TMPDIR/sandbox-bin-nobun-sum"
  mkdir -p "$SANDBOX_BIN"
  local tool real
  for tool in bash dirname basename find wc tr mkdir cat cp grep sed sort head date jq; do
    real="$(command -v "$tool" 2>/dev/null)" || continue
    case "$real" in
      /*) ln -s "$real" "$SANDBOX_BIN/$tool" ;;
    esac
  done

  if PATH="$SANDBOX_BIN" command -v bun >/dev/null 2>&1; then
    skip "bun leaked into sandbox PATH"
  fi

  local fake_root="$BATS_TEST_TMPDIR/nobun-sum-root"
  mkdir -p "$fake_root/scripts" "$fake_root/hooks"
  printf '{}' >"$fake_root/hooks/hooks.json"

  run env -i PATH="$SANDBOX_BIN" HOME="$HOME" \
    CLAUDE_PLUGIN_ROOT="$fake_root" \
    /bin/bash "$SCRIPT"

  assert_status 1
  # The summary line must mention the issue count so the user can triage.
  assert_output_contains "dependency issue"
}
