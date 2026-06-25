#!/usr/bin/env bats
# Tests for tests/adversarial/replay-corpus.sh — Tier 4 prompt-injection
# corpus replay driver.
#
# Behavior under test:
#   - Passes on the shipped corpus (every case's verdict matches its
#     block-*/allow-* filename prefix).
#   - Fails (exit 1) when a corpus expectation is flipped — the driver must
#     detect a hook-chain verdict that contradicts the case name.
#   - Fails closed on a malformed corpus payload (invalid JSON is a corpus
#     bug, never a silent skip).
#
# The driver is deterministic: it replays tool-call JSON against the real
# PreToolUse hook chain (firewall → frontmatter → wikilinks → raw-protect →
# attachments) in hooks.json order. No LLM, no network.

load '../test_helper/common'

DRIVER="tests/adversarial/replay-corpus.sh"

setup() {
  _load_helpers
}

@test "Adversarial replay: the driver passes on the shipped corpus, every verdict matching its filename prefix" {
  run bash "$REPO_ROOT/$DRIVER"

  assert_success
  assert_output_contains "PASS"
  refute_output_contains "MISMATCH"
}

@test "Adversarial replay: the shipped corpus exercises both block and allow classes" {
  run bash "$REPO_ROOT/$DRIVER"

  assert_success
  # At least one blocked-injection case and one allowed-boundary case must run,
  # otherwise the replay proves nothing about either side of the contract.
  assert_output_contains "block-"
  assert_output_contains "allow-"
}

@test "Adversarial replay: the driver exits 1 when a corpus expectation is flipped" {
  local corpus="$BATS_TEST_TMPDIR/flipped-corpus"
  mkdir -p "$corpus"
  # Named allow-* but targets a write outside the vault — the firewall will
  # block it, contradicting the filename prefix. The driver must exit 1.
  cat >"$corpus/allow-actually-blocked.json" <<'EOF'
{
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/tmp/definitely-outside-any-vault/.ssh/authorized_keys",
    "content": "ssh-ed25519 AAAA injected"
  }
}
EOF

  run bash "$REPO_ROOT/$DRIVER" --corpus "$corpus"

  assert_status 1
  assert_output_contains "MISMATCH"
}

@test "Adversarial replay: the driver fails closed on malformed corpus JSON" {
  local corpus="$BATS_TEST_TMPDIR/broken-corpus"
  mkdir -p "$corpus"
  printf 'this is not json{{{\n' >"$corpus/block-broken.json"

  run bash "$REPO_ROOT/$DRIVER" --corpus "$corpus"

  assert_status 1
}
