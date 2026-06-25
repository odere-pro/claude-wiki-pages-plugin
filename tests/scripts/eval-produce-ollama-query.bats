#!/usr/bin/env bats
# Tests for scripts/eval-produce-ollama-query.sh — the MODEL-SPECIFIC produce step
# for the `query` quality gate (docs/adr/ADR-0019-query-tier-and-answer-verification.md).
#
# Behavior under test (NO live model anywhere — fake-curl shim covers e2e):
#   M10: the shared ollama-chat.sh helper is sourced and the defensive guard fires
#        when ollama_chat_call is absent (DRY contract with eval-produce-ollama.sh
#        and offline-draft.sh — all three delegate to a single curl+backoff impl).
#   Arg validation fails closed (rc 2): no --model, unknown flag, unknown case.
#   --dry-run-prompt emits the assembled prompt (system + user) without any network
#     call and never reads gold.json into the prompt.
#   End-to-end with a fake curl: a canned /api/chat response is written to
#     <out>/<slug>/<case>.answer.txt and the driver exits 0.
#
# TDD: authored BEFORE the defensive-guard line was added (RED → GREEN).

load '../test_helper/common'

setup() {
  _load_helpers
  DRIVER="$REPO_ROOT/scripts/eval-produce-ollama-query.sh"
  CASES="$REPO_ROOT/tests/eval/query/cases"
}

# ---------------------------------------------------------------------------
# Existence + arg validation (fail-closed, rc 2)
# ---------------------------------------------------------------------------

@test "Eval Ollama query: driver script exists and is executable" {
  [ -f "$DRIVER" ]
  [ -x "$DRIVER" ]
}

@test "Eval Ollama query: missing --model fails closed with rc 2" {
  run bash "$DRIVER"
  assert_status 2
  assert_output_contains "--model"
}

@test "Eval Ollama query: unknown flag fails closed with rc 2" {
  run bash "$DRIVER" --model m --no-such-flag
  assert_status 2
}

@test "Eval Ollama query: unknown case fails closed with rc 2" {
  run bash "$DRIVER" --model m --case no-such-case --dry-run-prompt
  assert_status 2
  assert_output_contains "no-such-case"
}

@test "Eval Ollama query: --help exits 0 and prints usage" {
  run bash "$DRIVER" --help
  assert_success
  assert_output_contains "--model"
  assert_output_contains "--dry-run-prompt"
}

# ---------------------------------------------------------------------------
# M10: shared ollama-chat.sh helper is sourced and the defensive guard fires
# ---------------------------------------------------------------------------

@test "Eval Ollama query: sourcing the driver exposes ollama_chat_call from the shared DRY helper" { # spec M10
  # Verify the M10 DRY extraction: sourcing the driver must expose ollama_chat_call
  # because eval-produce-ollama-query.sh sources ollama-chat.sh at load time.
  run bash -c "
    die() { printf 'DIE: %s\n' \"\$1\" >&2; exit 2; }
    source '$DRIVER'
    declare -f ollama_chat_call >/dev/null && echo 'function present'
  "
  assert_success
  assert_output_contains "function present"
}

@test "Eval Ollama query: defensive guard exits 2 when ollama-chat.sh is structurally broken" { # spec M10
  # The guard fires when ollama-chat.sh sources without error but does NOT define
  # ollama_chat_call (models a stub or a broken helper). We copy the driver into a
  # fake scripts/ tree so dirname resolves to the fake tree, not the real repo root.
  local fake_scripts="$BATS_TEST_TMPDIR/fake-scripts"
  local fake_driver="$fake_scripts/eval-produce-ollama-query.sh"
  mkdir -p "$fake_scripts"
  cp "$DRIVER" "$fake_driver"
  # Stub ollama-chat.sh that sources without error but never defines ollama_chat_call.
  printf '#!/bin/bash\n# stub: intentionally omits ollama_chat_call\n' \
    >"$fake_scripts/ollama-chat.sh"

  # The source + guard lines run at script load time (before main/--help).
  # Any invocation must trip the guard and exit 2 with a clear message.
  run bash "$fake_driver" --model m --dry-run-prompt
  assert_status 2
  assert_output_contains "ollama_chat_call not defined"
}

# ---------------------------------------------------------------------------
# Prompt assembly (--dry-run-prompt; no network)
# ---------------------------------------------------------------------------

@test "Eval Ollama query: dry-run prompt emits both the system and user sections" {
  run bash "$DRIVER" --model m --case query-basic --dry-run-prompt
  assert_success
  # System prompt landmark
  assert_output_contains "===ANSWER==="
  # User prompt landmark — the question file drives this
  assert_output_contains "QUESTION:"
  assert_output_contains "WIKI PAGES"
}

@test "Eval Ollama query: dry-run prompt never reads gold.json into the prompt" {
  # gold.json exists in the case dir; its content must never appear in the prompt
  # (reading it would contaminate the measurement — §NO-RAG / ADR-0019).
  run bash "$DRIVER" --model m --case query-basic --dry-run-prompt
  assert_success
  # "gold" is a sentinel that should not appear in a clean prompt.
  refute_output_contains '"gold"'
}

# ---------------------------------------------------------------------------
# End-to-end with a fake curl (no live model, no network)
# ---------------------------------------------------------------------------

@test "Eval Ollama query: end-to-end with a fake curl writes the answer file" {
  local fake_bin="$BATS_TEST_TMPDIR/fake-bin"
  local out="$BATS_TEST_TMPDIR/answers"
  mkdir -p "$fake_bin" "$out"

  # Fake curl: /api/tags lists the model; /api/chat returns a canned answer.
  cat >"$fake_bin/curl" <<'EOF'
#!/bin/bash
for a in "$@"; do
  case "$a" in
    */api/tags) jq -n '{models:[{name:"fake-model"}]}'; exit 0 ;;
  esac
done
jq -n '{message:{content:"===ANSWER===\nJohn MacFarlane wrote Pandoc. It is written in Haskell.\n===COVERAGE: full===\n===CITATIONS===\n===END==="}}'
EOF
  chmod +x "$fake_bin/curl"

  run env PATH="$fake_bin:$PATH" bash "$DRIVER" \
    --model fake-model --case query-basic --out "$out"

  assert_success
  # Answer file written at the canonical location: <out>/<slug>/<case>.answer.txt
  [ -f "$out/fake-model/query-basic.answer.txt" ]
  assert_output_contains "answer ready"
}

@test "Eval Ollama query: preflight fails closed when the model is not pulled" {
  local fake_bin="$BATS_TEST_TMPDIR/fake-bin-nomodel"
  mkdir -p "$fake_bin"
  cat >"$fake_bin/curl" <<'EOF'
#!/bin/bash
jq -n '{models:[{name:"some-other-model"}]}'
EOF
  chmod +x "$fake_bin/curl"

  run env PATH="$fake_bin:$PATH" bash "$DRIVER" \
    --model not-pulled --case query-basic --out "$BATS_TEST_TMPDIR/o"
  assert_status 2
  assert_output_contains "not-pulled"
}

@test "Eval Ollama query: --retries retries the chat call with exponential backoff" {
  # Fake curl: /api/tags succeeds; the FIRST /api/chat call fails (rc 1),
  # the second succeeds. With --retries 1 the driver must recover.
  local fake_bin="$BATS_TEST_TMPDIR/fake-bin-retry"
  local out="$BATS_TEST_TMPDIR/cand-retry"
  local marker="$BATS_TEST_TMPDIR/first-done"
  mkdir -p "$fake_bin" "$out"
  cat >"$fake_bin/curl" <<EOF
#!/bin/bash
for a in "\$@"; do
  case "\$a" in
    */api/tags) jq -n '{models:[{name:"fake-model"}]}'; exit 0 ;;
  esac
done
if [ ! -e "$marker" ]; then
  touch "$marker"
  exit 1
fi
jq -n '{message:{content:"===ANSWER===\nHaskell.\n===COVERAGE: partial===\n===CITATIONS===\n===END==="}}'
EOF
  chmod +x "$fake_bin/curl"

  run env PATH="$fake_bin:$PATH" bash "$DRIVER" \
    --model fake-model --case query-basic --out "$out" --timeout 100 --retries 1

  assert_success
  [ -f "$out/fake-model/query-basic.answer.txt" ]
  # The retry attempt must announce the doubled timeout (exponential backoff).
  assert_output_contains "retry"
  assert_output_contains "200"
}

@test "Eval Ollama query: --retries exhausted still fails closed with rc 2" {
  local fake_bin="$BATS_TEST_TMPDIR/fake-bin-always-fail"
  mkdir -p "$fake_bin"
  cat >"$fake_bin/curl" <<'EOF'
#!/bin/bash
for a in "$@"; do
  case "$a" in
    */api/tags) jq -n '{models:[{name:"fake-model"}]}'; exit 0 ;;
  esac
done
exit 1
EOF
  chmod +x "$fake_bin/curl"

  run env PATH="$fake_bin:$PATH" bash "$DRIVER" \
    --model fake-model --case query-basic --out "$BATS_TEST_TMPDIR/o" \
    --timeout 10 --retries 1
  assert_status 2
}
