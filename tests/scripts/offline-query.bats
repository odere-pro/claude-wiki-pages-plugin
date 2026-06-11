#!/usr/bin/env bats
# Tests for scripts/offline-query.sh — true-offline cited query answering with
# runtime answer verification (ADR-0019).
#
# Behavior under test (NO live model — a fake `curl` shim covers /api/tags +
# /api/chat; the deterministic search runs for real via Bun):
#   - Fail-closed gates: disabled localModel, wrong tier, unapproved model all
#     refuse with a message.
#   - A verified answer is printed with its citations.
#   - RUNTIME DENY: an answer citing a nonexistent page, or quoting text that is
#     not verbatim in the cited page, is DENIED with a WARNING (exit 1) — the
#     ADR-0019 per-answer quality rule.
#   - The script never writes the vault (read-only path).

load '../test_helper/common'

setup() {
  _load_helpers
  OQ="$REPO_ROOT/scripts/offline-query.sh"
  CORPUS="$REPO_ROOT/tests/eval/query/cases/query-basic/vault"
}

mk_project() { # $1 = localModel JSON object → echoes project dir (vault copied in)
  local proj="$BATS_TEST_TMPDIR/proj-$BATS_TEST_NUMBER"
  mkdir -p "$proj/.claude"
  cp -R "$CORPUS" "$proj/vault"
  printf '%s\n' "{\"localModel\":$1}" >"$proj/.claude/claude-wiki-pages.json"
  printf '%s' "$proj"
}

# Fake curl whose /api/chat returns the canned answer in $FAKE_ANSWER_FILE.
mk_fake_curl() { # $1 = bin dir, $2 = answer payload file
  mkdir -p "$1"
  cat >"$1/curl" <<EOF
#!/bin/bash
for a in "\$@"; do
  case "\$a" in
    */api/tags) jq -n '{models:[{name:"qwen3-coder:30b"}]}'; exit 0 ;;
  esac
done
jq -n --rawfile c "$2" '{message:{content:\$c}}'
EOF
  chmod +x "$1/curl"
}

@test "offline-query: script exists and is executable" {
  [ -f "$OQ" ]
  [ -x "$OQ" ]
}

@test "offline-query: missing --question fails closed (rc 2)" {
  run bash "$OQ"
  assert_status 2
  assert_output_contains "--question"
}

@test "offline-query: disabled localModel refuses (rc 2)" {
  command -v bun >/dev/null 2>&1 || skip "bun not installed"
  local proj
  proj=$(mk_project '{"enabled":false,"model":"qwen3-coder:30b","tier":"query"}')
  run bash -c "cd '$proj' && bash '$OQ' --question 'who?' --target '$proj/vault'"
  assert_status 2
  assert_output_contains "localModel.enabled is false"
}

@test "offline-query: wrong tier refuses (rc 1)" {
  command -v bun >/dev/null 2>&1 || skip "bun not installed"
  local proj
  proj=$(mk_project '{"enabled":true,"model":"qwen3-coder:30b","tier":"ingest-extract","offlinePolicy":"prefer-local"}')
  run bash -c "cd '$proj' && bash '$OQ' --question 'who?' --target '$proj/vault'"
  assert_status 1
  assert_output_contains "not \"query\""
}

@test "offline-query: verified answer is printed with citations (exit 0)" {
  command -v bun >/dev/null 2>&1 || skip "bun not installed"
  local proj fake_bin answer
  proj=$(mk_project '{"enabled":true,"model":"qwen3-coder:30b","tier":"query","offlinePolicy":"prefer-local"}')
  answer="$BATS_TEST_TMPDIR/answer-ok-$BATS_TEST_NUMBER.txt"
  cat >"$answer" <<'EOF'
===ANSWER===
Pandoc was written by John MacFarlane in Haskell.
===COVERAGE: full===
===CITATIONS===
[[Pandoc]] | "Pandoc is a free and open-source document converter written in Haskell by John MacFarlane."
===END===
EOF
  fake_bin="$BATS_TEST_TMPDIR/fake-ok-$BATS_TEST_NUMBER"
  mk_fake_curl "$fake_bin" "$answer"

  run bash -c "cd '$proj' && PATH=\"$fake_bin:\$PATH\" bash '$OQ' --question 'Who wrote Pandoc?' --target '$proj/vault'"
  assert_success
  assert_output_contains "verified"
  assert_output_contains "[[Pandoc]]"
}

@test "offline-query: nonexistent cited page is DENIED with a warning (exit 1)" {
  command -v bun >/dev/null 2>&1 || skip "bun not installed"
  local proj fake_bin answer
  proj=$(mk_project '{"enabled":true,"model":"qwen3-coder:30b","tier":"query","offlinePolicy":"prefer-local"}')
  answer="$BATS_TEST_TMPDIR/answer-fabpage-$BATS_TEST_NUMBER.txt"
  cat >"$answer" <<'EOF'
===ANSWER===
See the gizmo page for details.
===COVERAGE: full===
===CITATIONS===
[[Gizmo]] | "Pandoc is a free and open-source document converter written in Haskell by John MacFarlane."
===END===
EOF
  fake_bin="$BATS_TEST_TMPDIR/fake-fabpage-$BATS_TEST_NUMBER"
  mk_fake_curl "$fake_bin" "$answer"

  run bash -c "cd '$proj' && PATH=\"$fake_bin:\$PATH\" bash '$OQ' --question 'Who wrote Pandoc?' --target '$proj/vault'"
  assert_status 1
  assert_output_contains "WARNING"
  assert_output_contains "DENIED"
}

@test "offline-query: non-verbatim quote is DENIED with a warning (exit 1)" {
  command -v bun >/dev/null 2>&1 || skip "bun not installed"
  local proj fake_bin answer
  proj=$(mk_project '{"enabled":true,"model":"qwen3-coder:30b","tier":"query","offlinePolicy":"prefer-local"}')
  answer="$BATS_TEST_TMPDIR/answer-fabquote-$BATS_TEST_NUMBER.txt"
  cat >"$answer" <<'EOF'
===ANSWER===
Pandoc is written in Rust.
===COVERAGE: full===
===CITATIONS===
[[Pandoc]] | "Pandoc is a blazing-fast document converter written in Rust."
===END===
EOF
  fake_bin="$BATS_TEST_TMPDIR/fake-fabquote-$BATS_TEST_NUMBER"
  mk_fake_curl "$fake_bin" "$answer"

  run bash -c "cd '$proj' && PATH=\"$fake_bin:\$PATH\" bash '$OQ' --question 'What language is Pandoc written in?' --target '$proj/vault'"
  assert_status 1
  assert_output_contains "WARNING"
  assert_output_contains "not verbatim"
}

@test "offline-query: protocol-violating response is DENIED (exit 1)" {
  command -v bun >/dev/null 2>&1 || skip "bun not installed"
  local proj fake_bin answer
  proj=$(mk_project '{"enabled":true,"model":"qwen3-coder:30b","tier":"query","offlinePolicy":"prefer-local"}')
  answer="$BATS_TEST_TMPDIR/answer-noproto-$BATS_TEST_NUMBER.txt"
  printf 'I am a chatty model ignoring the protocol.\n' >"$answer"
  fake_bin="$BATS_TEST_TMPDIR/fake-noproto-$BATS_TEST_NUMBER"
  mk_fake_curl "$fake_bin" "$answer"

  run bash -c "cd '$proj' && PATH=\"$fake_bin:\$PATH\" bash '$OQ' --question 'Who wrote Pandoc?' --target '$proj/vault'"
  assert_status 1
  assert_output_contains "DENIED"
}

@test "offline-query: never writes the vault (read-only)" {
  command -v bun >/dev/null 2>&1 || skip "bun not installed"
  local proj fake_bin answer before after
  proj=$(mk_project '{"enabled":true,"model":"qwen3-coder:30b","tier":"query","offlinePolicy":"prefer-local"}')
  answer="$BATS_TEST_TMPDIR/answer-ro-$BATS_TEST_NUMBER.txt"
  cat >"$answer" <<'EOF'
===ANSWER===
Pandoc was written by John MacFarlane in Haskell.
===COVERAGE: full===
===CITATIONS===
[[Pandoc]] | "Pandoc is a free and open-source document converter written in Haskell by John MacFarlane."
===END===
EOF
  fake_bin="$BATS_TEST_TMPDIR/fake-ro-$BATS_TEST_NUMBER"
  mk_fake_curl "$fake_bin" "$answer"

  before=$(find "$proj/vault" -type f | sort | xargs shasum | shasum)
  run bash -c "cd '$proj' && PATH=\"$fake_bin:\$PATH\" bash '$OQ' --question 'Who wrote Pandoc?' --target '$proj/vault'"
  assert_success
  after=$(find "$proj/vault" -type f | sort | xargs shasum | shasum)
  assert_eq "$after" "$before"
}
