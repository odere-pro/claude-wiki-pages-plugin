#!/usr/bin/env bats
# Tests for scripts/offline-draft.sh — the true-offline local drafting path (ADR-0018).
#
# Behavior under test (NO live model — a fake `curl` shim covers /api/tags + /api/chat):
#   - Fail-closed gates: localModel disabled, or a BLOCKED tier, refuse to draft
#     and write nothing.
#   - A valid run writes ONLY under _proposed/, stamped proposed_by + status:draft,
#     and never touches wiki/.
#   - A protocol-violating model response fails closed with no partial _proposed/.
#
# All gates read the config through the real engine (Bun), so these self-skip
# without Bun. Reachability is supplied as flags — no network in the route gate.

load '../test_helper/common'

setup() {
  _load_helpers
  DRAFT="$REPO_ROOT/scripts/offline-draft.sh"
}

# Build a project (cwd for engine config) with a vault subdir holding one raw source.
mk_project() { # $1 = localModel JSON object
  local proj="$BATS_TEST_TMPDIR/proj-$BATS_TEST_NUMBER"
  mkdir -p "$proj/.claude" "$proj/vault/raw" "$proj/vault/wiki"
  printf '%s\n' "{\"localModel\":$1}" >"$proj/.claude/claude-wiki-pages.json"
  printf '%s\n' '# Pandoc' '' 'Pandoc is a free and open-source document converter.' \
    >"$proj/vault/raw/pandoc.md"
  printf '%s' "$proj"
}

# Fake curl that lists the approved model and returns a valid FILE-protocol chat.
mk_fake_curl_ok() { # $1 = bin dir
  mkdir -p "$1"
  cat >"$1/curl" <<'EOF'
#!/bin/bash
for a in "$@"; do
  case "$a" in
    */api/tags) jq -n '{models:[{name:"qwen3-coder:30b"}]}'; exit 0 ;;
  esac
done
content=$(printf '%s\n' \
  '===FILE: wiki/index.md===' \
  '---' \
  'title: "Wiki Index"' \
  'status: active' \
  '---' \
  '# Wiki Index' \
  '===END FILE===')
jq -n --arg c "$content" '{message:{content:$c}}'
EOF
  chmod +x "$1/curl"
}

@test "Offline draft: script exists and is executable" {
  [ -f "$DRAFT" ]
  [ -x "$DRAFT" ]
}

# N18-offline: offline-draft.sh must use set -euo pipefail (not set -uo pipefail).
# Without -e, a mid-sequence failure (e.g. a failing helper call) is silently
# swallowed and the script continues in an undefined state — a security-relevant
# silent failure per scripts/CLAUDE.md "Script anatomy".
@test "Offline draft: uses set -euo pipefail (strict mode includes -e)" {
  grep -qE '^set -euo pipefail' "$DRAFT"
}

@test "Offline draft: --help exits 0 and prints usage" {
  run bash "$DRAFT" --help
  assert_success
  assert_output_contains "--target"
}

@test "Offline draft: disabled localModel refuses to draft (rc 2)" {
  command -v bun >/dev/null 2>&1 || skip "bun not installed"
  local proj
  proj=$(mk_project '{"enabled":false,"model":"qwen3-coder:30b"}')
  run bash -c "cd '$proj' && bash '$DRAFT' --target '$proj/vault'"
  assert_status 2
  assert_output_contains "localModel.enabled is false"
}

@test "Offline draft: BLOCKED tier refuses to draft (rc 1) and writes nothing" {
  command -v bun >/dev/null 2>&1 || skip "bun not installed"
  local proj
  proj=$(mk_project '{"enabled":true,"model":"qwen3-coder:30b","tier":"draft","offlinePolicy":"prefer-local"}')
  run bash -c "cd '$proj' && bash '$DRAFT' --target '$proj/vault'"
  assert_status 1
  assert_output_contains "BLOCKED"
  [ ! -d "$proj/vault/_proposed" ] || [ -z "$(find "$proj/vault/_proposed" -type f 2>/dev/null)" ]
}

@test "Offline draft: valid run writes only _proposed/ with stamps, never wiki/" {
  command -v bun >/dev/null 2>&1 || skip "bun not installed"
  local proj fake_bin
  proj=$(mk_project '{"enabled":true,"model":"qwen3-coder:30b","tier":"ingest-extract","offlinePolicy":"prefer-local"}')
  fake_bin="$BATS_TEST_TMPDIR/fake-ok-$BATS_TEST_NUMBER"
  mk_fake_curl_ok "$fake_bin"

  run bash -c "cd '$proj' && PATH=\"$fake_bin:\$PATH\" bash '$DRAFT' --target '$proj/vault'"
  assert_success
  # Draft landed in _proposed/, stamped, with the source title preserved.
  [ -f "$proj/vault/_proposed/wiki/index.md" ]
  grep -q 'proposed_by: "ollama:qwen3-coder:30b"' "$proj/vault/_proposed/wiki/index.md"
  grep -q 'status: draft' "$proj/vault/_proposed/wiki/index.md"
  # wiki/ is NEVER written by the offline path.
  [ -z "$(find "$proj/vault/wiki" -type f 2>/dev/null)" ]
}

@test "Offline draft: --endpoint with a non-loopback URL is rejected by the allow-list (rc 2)" {
  command -v bun >/dev/null 2>&1 || skip "bun not installed"
  local proj
  proj=$(mk_project '{"enabled":true,"model":"qwen3-coder:30b","tier":"ingest-extract","offlinePolicy":"prefer-local"}')
  # An external URL must be rejected before it ever reaches curl — SSRF guard.
  run bash -c "cd '$proj' && bash '$DRAFT' --target '$proj/vault' --endpoint 'http://169.254.169.254'"
  assert_status 2
  assert_output_contains "endpoint rejected by allow-list"
}

@test "Offline draft: --endpoint with a localhost URL passes allow-list validation" {
  command -v bun >/dev/null 2>&1 || skip "bun not installed"
  local proj
  proj=$(mk_project '{"enabled":true,"model":"qwen3-coder:30b","tier":"ingest-extract","offlinePolicy":"prefer-local","endpoint":"http://localhost:11434"}')
  # A loopback override must not be rejected by the allow-list gate itself.
  # (It will still fail at Gate 3 because no Ollama is running — that is expected.)
  run bash -c "cd '$proj' && bash '$DRAFT' --target '$proj/vault' --endpoint 'http://localhost:11434'"
  # Exit 2 from Ollama-unreachable is fine; the message must NOT be allow-list rejection.
  refute_output_contains "endpoint rejected by allow-list"
}

@test "Offline draft: a protocol-violating response fails closed with no partial _proposed/" {
  command -v bun >/dev/null 2>&1 || skip "bun not installed"
  local proj fake_bin
  proj=$(mk_project '{"enabled":true,"model":"qwen3-coder:30b","tier":"ingest-extract","offlinePolicy":"prefer-local"}')
  fake_bin="$BATS_TEST_TMPDIR/fake-bad-$BATS_TEST_NUMBER"
  mkdir -p "$fake_bin"
  cat >"$fake_bin/curl" <<'EOF'
#!/bin/bash
for a in "$@"; do
  case "$a" in
    */api/tags) jq -n '{models:[{name:"qwen3-coder:30b"}]}'; exit 0 ;;
  esac
done
jq -n '{message:{content:"I ignored the FILE protocol entirely."}}'
EOF
  chmod +x "$fake_bin/curl"

  run bash -c "cd '$proj' && PATH=\"$fake_bin:\$PATH\" bash '$DRAFT' --target '$proj/vault'"
  assert_status 2
  [ -z "$(find "$proj/vault/_proposed" -type f 2>/dev/null)" ]
}
