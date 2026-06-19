#!/usr/bin/env bats
# Tests for the p0-adr-glossary migration unit (ADR-0034 + glossary rows).
#
# This is a doc-only unit: the Architect records the two ratified decisions —
# (a) Bun becomes a REQUIRED, fail-closed dependency for security-relevant
# engine calls, and (b) the engine gains a WARN-tier `lint` verb complementary
# to error-tier `verify` — as ADR-0034, and lands the new coinages in the
# glossary FIRST (glossary-first, gate-04). These tests pin that contract so a
# regression (a deleted ADR row, a dropped glossary term, an unresolvable index
# link) turns red.
#
# Behavior under test:
#   - ADR-0034 file exists with the canonical header fields (Status/Date/
#     Decision/Alternatives/Consequences).
#   - The ADR is wired into the ADR index in docs/adr/README.md.
#   - The new coinages (engine lint verb, fail-closed engine bridge, engine
#     verify the error-tier twin) have docs/GLOSSARY.md rows.
#   - validate-docs.sh stays green on the real repo (glossary-first holds: no
#     new term entered prose without a row).

load '../test_helper/common'

setup() {
  _load_helpers
  ADR_FILE="$REPO_ROOT/docs/adr/ADR-0034-bun-required-and-lint-verb.md"
  ADR_INDEX="$REPO_ROOT/docs/adr/README.md"
  GLOSSARY="$REPO_ROOT/docs/GLOSSARY.md"
}

# -----------------------------------------------------------------------------
# ADR file presence + structure
# -----------------------------------------------------------------------------

@test "adr: ADR-0034 file exists" {
  [ -f "$ADR_FILE" ] || {
    echo "missing ADR file: $ADR_FILE" >&2
    return 1
  }
}

@test "adr: ADR-0034 carries the canonical header fields" {
  run cat "$ADR_FILE"
  assert_success
  assert_output_contains "**Status:**"
  assert_output_contains "**Date:**"
  assert_output_contains "## Decision"
  assert_output_contains "## Alternatives considered"
  assert_output_contains "## Consequences"
}

@test "adr: ADR-0034 records both ratified decisions (Bun required + lint verb)" {
  run cat "$ADR_FILE"
  assert_success
  # Decision (a): fail-closed Bun for security gates.
  assert_output_contains "fail-closed"
  assert_output_contains "Bun"
  # Decision (b): the WARN-tier lint verb complementary to error-tier verify.
  assert_output_contains "lint"
  assert_output_contains "verify"
}

# -----------------------------------------------------------------------------
# ADR index wiring (every ADR has an index row with a resolving link)
# -----------------------------------------------------------------------------

@test "adr: ADR-0034 is wired into the ADR index" {
  run grep -F "ADR-0034-bun-required-and-lint-verb.md" "$ADR_INDEX"
  assert_success
}

# -----------------------------------------------------------------------------
# Glossary-first: the new coinages have rows before they enter prose/code
# -----------------------------------------------------------------------------

@test "glossary: engine lint verb has a row" {
  run grep -F "lint (engine verb)" "$GLOSSARY"
  assert_success
}

@test "glossary: engine verify verb has a row" {
  run grep -F "verify (engine verb)" "$GLOSSARY"
  assert_success
}

@test "glossary: the fail-closed engine bridge has a row" {
  run grep -F "fail-closed engine bridge" "$GLOSSARY"
  assert_success
}

# -----------------------------------------------------------------------------
# Glossary-first gate stays green on the real repo
# -----------------------------------------------------------------------------

@test "glossary-first: validate-docs.sh stays clean on the real repo" {
  run bash "$SCRIPTS_DIR/validate-docs.sh" "$REPO_ROOT"
  assert_success
}
