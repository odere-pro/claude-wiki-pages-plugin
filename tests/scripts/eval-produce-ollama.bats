#!/usr/bin/env bats
# Tests for scripts/eval-produce-ollama.sh — the MODEL-SPECIFIC produce step for
# the `ingest-extract` quality gate (docs/adr/ADR-0011-local-model-quality-gate.md).
#
# The measurement apparatus (scripts/eval-ingest-extract.sh) is model-neutral and
# scores already-emitted candidate vaults. This driver is the separate, PM-run
# produce step: it asks a local Ollama model to extract a golden-set input into a
# candidate vault that the scorer can then measure. It never scores anything
# itself and never touches the gold `expected/` content (that would contaminate
# the measurement).
#
# Behavior under test (NO live model anywhere — the fake-curl shim covers e2e):
#   - Arg validation fails closed (rc 2): no --model, unknown flag, unknown case.
#   - --dry-run-prompt emits the assembled prompt without any network call, and
#     the prompt single-sources the schema (required-fields table) plus the
#     ===FILE: output protocol.
#   - The response parser is fail-closed: path traversal, absolute paths,
#     non-wiki/ paths, duplicate paths, unterminated blocks, and zero-file
#     responses all die — never a partial candidate written silently.
#   - End-to-end with a fake `curl` on PATH: a canned /api/chat response is
#     parsed into a candidate vault (CLAUDE.md scaffold + wiki/ files) that the
#     real scorer accepts as a scoreable directory.
#
# TDD: authored BEFORE the driver existed (RED).

load '../test_helper/common'

setup() {
  _load_helpers
  DRIVER="$REPO_ROOT/scripts/eval-produce-ollama.sh"
  CASES="$REPO_ROOT/tests/eval/ingest-extract/cases"
}

# ---------------------------------------------------------------------------
# Existence + arg validation (fail-closed, rc 2)
# ---------------------------------------------------------------------------

@test "eval-produce-ollama: driver script exists and is executable" {
  [ -f "$DRIVER" ]
  [ -x "$DRIVER" ]
}

@test "eval-produce-ollama: --help exits 0 and prints usage" {
  run bash "$DRIVER" --help
  assert_success
  assert_output_contains "--model"
  assert_output_contains "--dry-run-prompt"
}

@test "eval-produce-ollama: missing --model fails closed (rc 2)" {
  run bash "$DRIVER"
  assert_status 2
  assert_output_contains "--model"
}

@test "eval-produce-ollama: unknown flag fails closed (rc 2)" {
  run bash "$DRIVER" --model m --no-such-flag
  assert_status 2
}

@test "eval-produce-ollama: unknown case fails closed (rc 2)" {
  run bash "$DRIVER" --model m --case no-such-case --dry-run-prompt
  assert_status 2
  assert_output_contains "no-such-case"
}

# ---------------------------------------------------------------------------
# Prompt assembly (--dry-run-prompt; no network)
# ---------------------------------------------------------------------------

@test "eval-produce-ollama: dry-run prompt single-sources the schema table" {
  run bash "$DRIVER" --model m --case extract-basic --dry-run-prompt
  assert_success
  # The required-fields table is extracted from docs/vault-example/CLAUDE.md at
  # runtime — the heading and a known row prove single-sourcing, not a copy.
  assert_output_contains "Required fields by type"
  assert_output_contains "entity_type"
}

@test "eval-produce-ollama: dry-run prompt carries the FILE block protocol" {
  run bash "$DRIVER" --model m --case extract-basic --dry-run-prompt
  assert_success
  assert_output_contains "===FILE:"
  assert_output_contains "===END FILE==="
}

@test "eval-produce-ollama: dry-run prompt includes the case input verbatim" {
  run bash "$DRIVER" --model m --case extract-basic --dry-run-prompt
  assert_success
  assert_output_contains "Pandoc is a free and open-source document converter"
}

@test "eval-produce-ollama: dry-run prompt never leaks gold expected/ content" {
  run bash "$DRIVER" --model m --case extract-basic --dry-run-prompt
  assert_success
  # This phrase exists ONLY in the gold vault body, never in input.md.
  refute_output_contains "golden\nreference"
  refute_output_contains "It exists in this golden"
}

# ---------------------------------------------------------------------------
# Response parser (sourced; pure function, fail-closed)
# ---------------------------------------------------------------------------

# Helper: run parse_response on a here-doc response into a tmpdir vault.
parse_into() { # $1 = out dir, stdin = response text
  (
    # shellcheck source=/dev/null
    source "$DRIVER"
    parse_response "$1"
  )
}

@test "eval-produce-ollama: parser writes files from a valid response" {
  local out="$BATS_TEST_TMPDIR/cand-ok"
  mkdir -p "$out"
  run parse_into "$out" <<'EOF'
Some model preamble chatter to ignore.
===FILE: wiki/index.md===
---
title: "Wiki Index"
---
# Wiki Index
===END FILE===
===FILE: wiki/tools/pandoc.md===
---
title: "Pandoc"
---
# Pandoc
===END FILE===
EOF
  assert_success
  [ -f "$out/wiki/index.md" ]
  [ -f "$out/wiki/tools/pandoc.md" ]
  grep -q '^title: "Pandoc"$' "$out/wiki/tools/pandoc.md"
}

@test "eval-produce-ollama: parser rejects path traversal" {
  local out="$BATS_TEST_TMPDIR/cand-trav"
  mkdir -p "$out"
  run parse_into "$out" <<'EOF'
===FILE: wiki/../../../etc/evil.md===
x
===END FILE===
EOF
  assert_status 2
  [ ! -e "$BATS_TEST_TMPDIR/etc/evil.md" ]
}

@test "eval-produce-ollama: parser rejects absolute paths" {
  local out="$BATS_TEST_TMPDIR/cand-abs"
  mkdir -p "$out"
  run parse_into "$out" <<'EOF'
===FILE: /tmp/evil.md===
x
===END FILE===
EOF
  assert_status 2
}

@test "eval-produce-ollama: parser rejects paths outside wiki/" {
  local out="$BATS_TEST_TMPDIR/cand-outside"
  mkdir -p "$out"
  run parse_into "$out" <<'EOF'
===FILE: raw/evil.md===
x
===END FILE===
EOF
  assert_status 2
}

@test "eval-produce-ollama: parser rejects duplicate paths" {
  local out="$BATS_TEST_TMPDIR/cand-dup"
  mkdir -p "$out"
  run parse_into "$out" <<'EOF'
===FILE: wiki/index.md===
a
===END FILE===
===FILE: wiki/index.md===
b
===END FILE===
EOF
  assert_status 2
}

@test "eval-produce-ollama: parser rejects an unterminated block" {
  local out="$BATS_TEST_TMPDIR/cand-unterm"
  mkdir -p "$out"
  run parse_into "$out" <<'EOF'
===FILE: wiki/index.md===
never closed
EOF
  assert_status 2
}

@test "eval-produce-ollama: parser rejects a zero-file response" {
  local out="$BATS_TEST_TMPDIR/cand-empty"
  mkdir -p "$out"
  run parse_into "$out" <<'EOF'
The model rambled and produced no file blocks at all.
EOF
  assert_status 2
}

# ---------------------------------------------------------------------------
# End-to-end with a fake curl (no live model, no network)
# ---------------------------------------------------------------------------

@test "eval-produce-ollama: e2e with fake curl writes a scorer-acceptable candidate" {
  local fake_bin="$BATS_TEST_TMPDIR/fake-bin"
  local out="$BATS_TEST_TMPDIR/candidates"
  mkdir -p "$fake_bin" "$out"

  # Fake curl: /api/tags lists the model; /api/chat returns a canned response
  # whose content uses the FILE protocol. jq -n guarantees valid JSON encoding.
  cat >"$fake_bin/curl" <<EOF
#!/bin/bash
for a in "\$@"; do
  case "\$a" in
    */api/tags) jq -n '{models:[{name:"fake-model"}]}'; exit 0 ;;
  esac
done
content=\$(printf '%s\n' \
  '===FILE: wiki/index.md===' \
  '---' \
  'title: "Wiki Index"' \
  '---' \
  '# Wiki Index' \
  '===END FILE===')
jq -n --arg c "\$content" '{message:{content:\$c}}'
EOF
  chmod +x "$fake_bin/curl"

  run env PATH="$fake_bin:$PATH" bash "$DRIVER" \
    --model fake-model --case extract-basic --out "$out"

  assert_success
  # Candidate vault scaffold + parsed files exist…
  [ -f "$out/fake-model/extract-basic/CLAUDE.md" ]
  [ -f "$out/fake-model/extract-basic/wiki/index.md" ]
  grep -q "schema_version: 2" "$out/fake-model/extract-basic/CLAUDE.md"
  # …the raw response is persisted for audit, OUTSIDE the scored vault dir…
  [ -f "$out/fake-model/extract-basic.response.json" ]
  # …and the real scorer accepts the directory as scoreable (verdict may be
  # FAIL (rc 1) — a one-file candidate misses the bar — but never rc 2).
  run bash "$REPO_ROOT/scripts/eval-ingest-extract.sh" \
    --score "$out/fake-model/extract-basic" \
    --gold "$CASES/extract-basic/expected"
  [ "$status" -ne 2 ]
}

@test "eval-produce-ollama: e2e fails closed when the model emits no FILE blocks" {
  # Regression: parse_response dies inside the printf|parse pipeline SUBSHELL;
  # without an explicit status check the driver continued and announced
  # "candidate ready" for an empty candidate (observed live with gemma4:26b).
  local fake_bin="$BATS_TEST_TMPDIR/fake-bin-noblocks"
  local out="$BATS_TEST_TMPDIR/cand-noblocks"
  mkdir -p "$fake_bin" "$out"
  cat >"$fake_bin/curl" <<'EOF'
#!/bin/bash
for a in "$@"; do
  case "$a" in
    */api/tags) jq -n '{models:[{name:"fake-model"}]}'; exit 0 ;;
  esac
done
jq -n '{message:{content:"I am a chatty model that ignored the FILE protocol entirely."}}'
EOF
  chmod +x "$fake_bin/curl"

  run env PATH="$fake_bin:$PATH" bash "$DRIVER" \
    --model fake-model --case extract-basic --out "$out"

  assert_status 2
  refute_output_contains "candidate ready"
}

@test "eval-produce-ollama: preflight fails closed when the model is not pulled" {
  local fake_bin="$BATS_TEST_TMPDIR/fake-bin-nomodel"
  mkdir -p "$fake_bin"
  cat >"$fake_bin/curl" <<'EOF'
#!/bin/bash
jq -n '{models:[{name:"some-other-model"}]}'
EOF
  chmod +x "$fake_bin/curl"

  run env PATH="$fake_bin:$PATH" bash "$DRIVER" \
    --model not-pulled --case extract-basic --out "$BATS_TEST_TMPDIR/o"
  assert_status 2
  assert_output_contains "not-pulled"
}
