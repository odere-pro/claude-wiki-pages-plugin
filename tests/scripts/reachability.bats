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

  run env PATH="$fake_bin:$PATH" bash "$PROBE" --policy off --endpoint http://127.0.0.1:11434
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

  run env PATH="$fake_bin:$PATH" bash "$PROBE" --policy prefer-local --endpoint http://127.0.0.1:11434
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

  run env PATH="$fake_bin:$PATH" bash "$PROBE" --policy prefer-local --endpoint http://127.0.0.1:11434
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

  run env PATH="$fake_bin:$PATH" bash "$PROBE" --policy prefer-local --endpoint http://127.0.0.1:11434
  assert_success
  assert_output_contains '"ollama": "down"'
  assert_output_contains '"claudeApi": "unreachable"'
}

# ---------------------------------------------------------------------------
# Circuit Breaker tests (CB_ env vars to control threshold/cooldown/state file)
# ---------------------------------------------------------------------------

@test "reachability: circuit breaker starts closed, output includes circuitBreaker field" {
  local fake_bin="$BATS_TEST_TMPDIR/fake-cb-initial"
  local cb_file="$BATS_TEST_TMPDIR/cb-state.json"
  mkdir -p "$fake_bin"
  cat >"$fake_bin/curl" <<'EOF'
#!/bin/bash
exit 0
EOF
  chmod +x "$fake_bin/curl"

  run env PATH="$fake_bin:$PATH" \
    CLAUDE_WIKI_PAGES_CB_STATE="$cb_file" \
    bash "$PROBE" --policy prefer-local --endpoint http://127.0.0.1:11434
  assert_success
  assert_output_contains '"circuitBreaker"'
  assert_output_contains '"ollama": "up"'
}

@test "reachability: circuit breaker opens after consecutive failures and then fails fast" {
  local fake_bin="$BATS_TEST_TMPDIR/fake-cb-open"
  local cb_file="$BATS_TEST_TMPDIR/cb-state-open.json"
  local call_count_file="$BATS_TEST_TMPDIR/curl-calls"
  mkdir -p "$fake_bin"
  # curl always fails for Ollama
  cat >"$fake_bin/curl" <<EOF
#!/bin/bash
for a in "\$@"; do
  case "\$a" in
    */api/tags)
      echo "ollama-curl-called" >> "$call_count_file"
      exit 7
      ;;
    https://api.anthropic.com/*) exit 0 ;;
  esac
done
exit 0
EOF
  chmod +x "$fake_bin/curl"

  # Threshold = 3. Run 3 times to trip the breaker (each invocation uses a fresh
  # shell so CB state is loaded from the file between runs).
  local i
  for i in 1 2 3; do
    env PATH="$fake_bin:$PATH" \
      CLAUDE_WIKI_PAGES_CB_STATE="$cb_file" \
      CLAUDE_WIKI_PAGES_CB_THRESHOLD=3 \
      CLAUDE_WIKI_PAGES_CB_COOLDOWN=9999 \
      bash "$PROBE" --policy prefer-local --endpoint http://127.0.0.1:11434 >/dev/null
  done

  # Breaker should now be open — a 4th run must return "down" without calling
  # the Ollama endpoint (call_count_file should still have exactly 3 lines).
  run env PATH="$fake_bin:$PATH" \
    CLAUDE_WIKI_PAGES_CB_STATE="$cb_file" \
    CLAUDE_WIKI_PAGES_CB_THRESHOLD=3 \
    CLAUDE_WIKI_PAGES_CB_COOLDOWN=9999 \
    bash "$PROBE" --policy prefer-local --endpoint http://127.0.0.1:11434
  assert_success
  assert_output_contains '"ollama": "down"'
  assert_output_contains '"circuitBreaker": "open"'
  # Exactly 3 Ollama curl calls total — the 4th run was a fail-fast no-op.
  local calls
  calls=$(wc -l <"$call_count_file" 2>/dev/null || echo 0)
  [ "$calls" -eq 3 ]
}

@test "reachability: circuit breaker half-opens after cooldown and probes once" {
  local fake_bin="$BATS_TEST_TMPDIR/fake-cb-halfopen"
  local cb_file="$BATS_TEST_TMPDIR/cb-state-halfopen.json"
  local call_count_file="$BATS_TEST_TMPDIR/curl-calls-halfopen"
  mkdir -p "$fake_bin"
  cat >"$fake_bin/curl" <<EOF
#!/bin/bash
for a in "\$@"; do
  case "\$a" in
    */api/tags)
      echo "ollama-called" >> "$call_count_file"
      exit 0
      ;;
    https://api.anthropic.com/*) exit 0 ;;
  esac
done
exit 0
EOF
  chmod +x "$fake_bin/curl"

  # Pre-seed an open state with openedAt far in the past (epoch 1) so cooldown
  # has already elapsed.  CB_COOLDOWN_SEC=1 keeps the math trivial.
  printf '{"state":"open","failures":3,"openedAt":1}\n' >"$cb_file"

  run env PATH="$fake_bin:$PATH" \
    CLAUDE_WIKI_PAGES_CB_STATE="$cb_file" \
    CLAUDE_WIKI_PAGES_CB_THRESHOLD=3 \
    CLAUDE_WIKI_PAGES_CB_COOLDOWN=1 \
    bash "$PROBE" --policy prefer-local --endpoint http://127.0.0.1:11434
  assert_success
  # The trial probe succeeded → Ollama back up, breaker closed.
  assert_output_contains '"ollama": "up"'
  assert_output_contains '"circuitBreaker": "closed"'
  # Exactly one Ollama curl call — the half-open trial.
  local calls
  calls=$(wc -l <"$call_count_file" 2>/dev/null || echo 0)
  [ "$calls" -eq 1 ]
}

@test "reachability: circuit breaker re-opens when half-open trial fails" {
  local fake_bin="$BATS_TEST_TMPDIR/fake-cb-reopen"
  local cb_file="$BATS_TEST_TMPDIR/cb-state-reopen.json"
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

  # Pre-seed an open state whose cooldown has elapsed → half-open on next call.
  printf '{"state":"open","failures":3,"openedAt":1}\n' >"$cb_file"

  run env PATH="$fake_bin:$PATH" \
    CLAUDE_WIKI_PAGES_CB_STATE="$cb_file" \
    CLAUDE_WIKI_PAGES_CB_THRESHOLD=3 \
    CLAUDE_WIKI_PAGES_CB_COOLDOWN=1 \
    bash "$PROBE" --policy prefer-local --endpoint http://127.0.0.1:11434
  assert_success
  # Trial probe failed → breaker back to open, Ollama down.
  assert_output_contains '"ollama": "down"'
  assert_output_contains '"circuitBreaker": "open"'
}
