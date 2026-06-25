#!/usr/bin/env bats
# Tests for scripts/ollama-chat.sh — the DRY Ollama curl+retry helper (C07).
#
# Behavior under test (NO live model — curl is replaced with a fake binary):
#   C05: source-vs-exec path: sourcing does NOT abort callers that already set
#        strict mode; executing directly runs in strict mode.
#   C06: retry loop with backoff sleep between attempts; the inter-attempt sleep
#        is exercised with a mock curl that fails N-1 times then succeeds.
#   Source path: ollama_chat_call succeeds when curl returns a valid response.
#   Failure path: ollama_chat_call calls die() after exhausting retries.
#   Backoff: sleep is called at least once per retry (mock sleep records calls).

load '../test_helper/common'

setup() {
  _load_helpers
  SCRIPT="$REPO_ROOT/scripts/ollama-chat.sh"
  BIN="$BATS_TEST_TMPDIR/fakebin"
  mkdir -p "$BIN"
}

# ── helpers ───────────────────────────────────────────────────────────────────

# Build a fake curl that succeeds on the Nth call (1-indexed).
mk_curl_succeed_on_nth() {
  local n="$1" bindir="$2" count_file="$BATS_TEST_TMPDIR/curl_call_count"
  cat >"$bindir/curl" <<CURL_EOF
#!/bin/bash
count=\$(cat "$count_file" 2>/dev/null || echo 0)
count=\$((count + 1))
printf '%d' "\$count" >"$count_file"
if [ "\$count" -lt "$n" ]; then
  exit 1
fi
printf '%s\n' '{"message":{"content":"hello from fake ollama"}}'
exit 0
CURL_EOF
  chmod +x "$bindir/curl"
}

# Fake curl that always fails.
mk_curl_always_fail() {
  local bindir="$1"
  printf '#!/bin/bash\nexit 1\n' >"$bindir/curl"
  chmod +x "$bindir/curl"
}

# Fake sleep that records call count (to verify backoff fires).
mk_fake_sleep() {
  local bindir="$1" count_file="$BATS_TEST_TMPDIR/sleep_call_count"
  cat >"$bindir/sleep" <<SLEEP_EOF
#!/bin/bash
count=\$(cat "$count_file" 2>/dev/null || echo 0)
count=\$((count + 1))
printf '%d' "\$count" >"$count_file"
exit 0
SLEEP_EOF
  chmod +x "$bindir/sleep"
}

# Run a mini-script that sources ollama-chat.sh and calls ollama_chat_call.
# Fake bindir is prepended so fake curl/sleep take precedence over the real ones,
# while system tools (mktemp, jq, etc.) remain accessible via /usr/bin:/bin.
# $1 = extra PATH bindir (for fake curl/sleep), $2 = retries
run_chat_call() {
  local bindir="$1" retries="${2:-2}"
  run bash -c "
    export PATH='$bindir:/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin'
    die() { printf 'DIE: %s\n' \"\$1\" >&2; exit 2; }
    source '$SCRIPT'
    ollama_chat_call 'http://localhost:11434' 'test-model' 'sys' 'usr' 4096 5 '$retries' 'testlabel'
  "
}

# ── C05: source-vs-exec guard ─────────────────────────────────────────────────

@test "Ollama chat: sourcing inside a strict-mode script does not abort the caller" {  # spec C05
  # Source inside a script that already has set -euo pipefail.
  # We verify that sourcing does NOT exit the caller prematurely.
  run bash -c "
    set -euo pipefail
    source '$SCRIPT'
    echo 'source succeeded'
  "
  assert_success
  assert_output_contains "source succeeded"
}

@test "Ollama chat: sourcing exposes ollama_chat_call as a function" {  # spec C05
  run bash -c "
    die() { printf 'DIE: %s\n' \"\$1\" >&2; exit 2; }
    source '$SCRIPT'
    declare -f ollama_chat_call >/dev/null && echo 'function present'
  "
  assert_success
  assert_output_contains "function present"
}

# ── Backoff sleep (C06) ───────────────────────────────────────────────────────

@test "Ollama chat: sleep is called between retries so the backoff fires" {  # spec C06
  mk_curl_succeed_on_nth 3 "$BIN"
  mk_fake_sleep "$BIN"

  run_chat_call "$BIN" 3
  assert_success

  sleep_count=$(cat "$BATS_TEST_TMPDIR/sleep_call_count" 2>/dev/null || echo 0)
  # Two failures before the third successful attempt => two sleeps.
  [ "$sleep_count" -ge 2 ] || {
    echo "Expected at least 2 sleep calls, got ${sleep_count}" >&2
    return 1
  }
}

@test "Ollama chat: a successful call on the first attempt skips the backoff sleep" {  # spec C06
  mk_curl_succeed_on_nth 1 "$BIN"
  mk_fake_sleep "$BIN"

  run_chat_call "$BIN" 2
  assert_success

  sleep_count=$(cat "$BATS_TEST_TMPDIR/sleep_call_count" 2>/dev/null || echo 0)
  [ "$sleep_count" -eq 0 ] || {
    echo "Expected 0 sleep calls on immediate success, got ${sleep_count}" >&2
    return 1
  }
}

# ── Failure path (exhausted retries → die) ────────────────────────────────────

@test "Ollama chat: exhausting all retries calls die and exits 2" {
  mk_curl_always_fail "$BIN"
  mk_fake_sleep "$BIN"

  run_chat_call "$BIN" 1
  assert_status 2
  assert_output_contains "DIE:"
}

# ── Happy path ────────────────────────────────────────────────────────────────

@test "Ollama chat: a successful curl returns the .message.content payload" {
  mk_curl_succeed_on_nth 1 "$BIN"
  mk_fake_sleep "$BIN"

  run_chat_call "$BIN" 1
  assert_success
  assert_output_contains "hello from fake ollama"
}
