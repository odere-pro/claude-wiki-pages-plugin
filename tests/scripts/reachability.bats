#!/usr/bin/env bats
# Tests for scripts/reachability.sh — the Layer 4 reachability probe (ADR-0018).
#
# Behavior under test (NO live network anywhere — a fake `curl` shim covers it):
#   - --policy off performs ZERO network calls and reports "unprobed".
#   - --policy prefer-local probes Ollama (/api/tags) and Anthropic (HEAD); each
#     reachability state maps to up/down and reachable/unreachable.
#   - It fails closed: a curl that errors everywhere reports down/unreachable.
#   - --policy / --endpoint flags override config so the probe never needs Bun.
#
# TDD: authored alongside the probe.

load '../test_helper/common'

setup() {
  _load_helpers
  PROBE="$REPO_ROOT/scripts/reachability.sh"
}

@test "reachability: script exists and is executable" {
  [ -f "$PROBE" ]
  [ -x "$PROBE" ]
}

@test "reachability: --help exits 0 and prints usage" {
  run bash "$PROBE" --help
  assert_success
  assert_output_contains "--policy"
}

@test "reachability: unknown flag fails closed (rc 2)" {
  run bash "$PROBE" --no-such-flag
  assert_status 2
}

@test "reachability: policy off makes NO network call and reports unprobed" {
  local fake_bin="$BATS_TEST_TMPDIR/fake-off"
  local marker="$BATS_TEST_TMPDIR/curl-was-called"
  mkdir -p "$fake_bin"
  cat >"$fake_bin/curl" <<EOF
#!/bin/bash
touch "$marker"
exit 0
EOF
  chmod +x "$fake_bin/curl"

  run env PATH="$fake_bin:$PATH" bash "$PROBE" --policy off --endpoint http://x:11434
  assert_success
  assert_output_contains '"ollama": "unprobed"'
  assert_output_contains '"claudeApi": "unprobed"'
  assert_output_contains '"policy": "off"'
  [ ! -e "$marker" ] # the probe never shelled out to curl
}

@test "reachability: prefer-local with both reachable reports up + reachable" {
  local fake_bin="$BATS_TEST_TMPDIR/fake-both-up"
  mkdir -p "$fake_bin"
  cat >"$fake_bin/curl" <<'EOF'
#!/bin/bash
for a in "$@"; do
  case "$a" in
    */api/tags) exit 0 ;;
    https://api.anthropic.com/*) exit 0 ;;
  esac
done
exit 0
EOF
  chmod +x "$fake_bin/curl"

  run env PATH="$fake_bin:$PATH" bash "$PROBE" --policy prefer-local --endpoint http://x:11434
  assert_success
  assert_output_contains '"ollama": "up"'
  assert_output_contains '"claudeApi": "reachable"'
}

@test "reachability: prefer-local with Ollama down reports down" {
  local fake_bin="$BATS_TEST_TMPDIR/fake-ollama-down"
  mkdir -p "$fake_bin"
  cat >"$fake_bin/curl" <<'EOF'
#!/bin/bash
for a in "$@"; do
  case "$a" in
    */api/tags) exit 7 ;;
    https://api.anthropic.com/*) exit 0 ;;
  esac
done
exit 0
EOF
  chmod +x "$fake_bin/curl"

  run env PATH="$fake_bin:$PATH" bash "$PROBE" --policy prefer-local --endpoint http://x:11434
  assert_success
  assert_output_contains '"ollama": "down"'
  assert_output_contains '"claudeApi": "reachable"'
}

@test "reachability: prefer-local fails closed when curl errors everywhere" {
  local fake_bin="$BATS_TEST_TMPDIR/fake-all-down"
  mkdir -p "$fake_bin"
  cat >"$fake_bin/curl" <<'EOF'
#!/bin/bash
exit 7
EOF
  chmod +x "$fake_bin/curl"

  run env PATH="$fake_bin:$PATH" bash "$PROBE" --policy prefer-local --endpoint http://x:11434
  assert_success
  assert_output_contains '"ollama": "down"'
  assert_output_contains '"claudeApi": "unreachable"'
}
