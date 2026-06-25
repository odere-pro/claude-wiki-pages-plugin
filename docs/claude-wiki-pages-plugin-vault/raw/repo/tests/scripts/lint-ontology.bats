#!/usr/bin/env bats
# Tests for scripts/lint-ontology.sh — S1-check opt-in predicate domain→range checker.
#
# Behavior under test:
#   - A page with a typed wikilink whose domain or range violates the ontology-profile-v1
#     table emits a WARN finding and exits 1.
#   - A page whose typed wikilinks all conform to the table exits 0 with no WARN output.
#   - The checker reads the predicate table from vault/CLAUDE.md — no inline copy —
#     confirmed by temporarily zeroing the profile section and asserting the checker
#     falls back to "no profile" rather than a hard-coded table.
#
# All tests run against a fresh temp vault derived from tests/fixtures/minimal-vault/.
# Each test that needs a violation injects it into the copy.

load '../test_helper/common'

setup() {
  _load_helpers
  setup_fixture_vault
  # Copy vault-example/CLAUDE.md (which has ontology-profile-v1) into the fixture vault
  # so the checker has a real profile to parse.
  cp "$REPO_ROOT/skills/init/template/CLAUDE.md" "$FIXTURE_VAULT/CLAUDE.md"
}

teardown() {
  teardown_fixture_vault
}

# ---------------------------------------------------------------------------
# Helper: write a minimal concept page into the fixture vault.
# Usage: _write_concept <filename-stem> <depends_on-value>
#   depends_on-value should be a raw YAML string, e.g. '["[[Sample]]"]'
#   where [[Sample]] is a source page — domain rule violation.
# ---------------------------------------------------------------------------
_write_concept_depends_on_source() {
  local stem="$1"
  local depends_target="$2"
  cat >"$FIXTURE_VAULT/wiki/topics/${stem}.md" <<EOF
---
title: "Bad Concept"
type: concept
aliases: ["Bad Concept"]
parent: "[[Topics — Index]]"
path: "topics"
sources: ["[[Sample]]"]
related: []
contradicts: []
supersedes: []
depends_on: ["[[${depends_target}]]"]
tags: []
created: 2026-04-18
updated: 2026-04-18
update_count: 1
status: active
confidence: 0.7
---

# Bad Concept

## Definition

A fixture concept with a domain/range-violating depends_on.

## Key Principles

None.

## Examples

None.

## Related Concepts

None.
EOF
}

_write_conformant_concept() {
  local stem="$1"
  cat >"$FIXTURE_VAULT/wiki/topics/${stem}.md" <<EOF
---
title: "Good Concept"
type: concept
aliases: ["Good Concept"]
parent: "[[Topics — Index]]"
path: "topics"
sources: ["[[Sample]]"]
related: ["[[Sample Entity]]"]
contradicts: []
supersedes: []
depends_on: ["[[Sample Entity]]"]
tags: []
created: 2026-04-18
updated: 2026-04-18
update_count: 1
status: active
confidence: 0.7
---

# Good Concept

## Definition

A fixture concept with fully conformant typed wikilinks.
depends_on points at an entity (allowed by the profile).

## Key Principles

None.

## Examples

None.

## Related Concepts

None.
EOF
}

# ---------------------------------------------------------------------------
# S1-check: domain/range violation is flagged as WARN
# ---------------------------------------------------------------------------

@test "lint-ontology: WARN when depends_on points at a source (range violation)" {
  # The profile says: depends_on domain=concept|topic|project, range=concept|entity.
  # Pointing depends_on at a source page violates the range rule.
  # "Sample" is a source page in the fixture vault.
  _write_concept_depends_on_source "bad-concept" "Sample"

  run bash "$SCRIPTS_DIR/lint-ontology.sh" --target "$FIXTURE_VAULT"

  # WARN-tier exit: 1 (warnings present, no errors)
  assert_status 1
  assert_output_contains "WARN"
  assert_output_contains "depends_on"
}

# ---------------------------------------------------------------------------
# S1-check: conformant page emits no WARN and exits 0
# ---------------------------------------------------------------------------

@test "lint-ontology: clean when all typed wikilinks conform to the profile" {
  _write_conformant_concept "good-concept"

  run bash "$SCRIPTS_DIR/lint-ontology.sh" --target "$FIXTURE_VAULT"

  assert_success
  refute_output_contains "WARN"
}

# ---------------------------------------------------------------------------
# S1-check: checker reads the profile table from CLAUDE.md (no inline copy)
# Proof: if we blank out the profile section the checker reports "no profile"
# (skips silently) rather than falling back to a built-in table.
# ---------------------------------------------------------------------------

@test "lint-ontology: reads profile from CLAUDE.md — no hardcoded table" {
  # Inject a range-violating page so that a built-in table WOULD fire.
  _write_concept_depends_on_source "bad-concept" "Sample"

  # Remove the ontology-profile-v1 section from the vault CLAUDE.md.
  # Replace it with a stub that has no predicate rows.
  local claude_md="$FIXTURE_VAULT/CLAUDE.md"
  bun -e "
const fs = require('fs');
const p = '$claude_md';
let txt = fs.readFileSync(p, 'utf8');
// Strip everything from the ontology-profile-v1 heading to the next ## heading
txt = txt.replace(/## Ontology profile[\s\S]*?(?=\n## |\$)/, '## Ontology profile (stub — no rows)\n\n');
fs.writeFileSync(p, txt);
"

  run bash "$SCRIPTS_DIR/lint-ontology.sh" --target "$FIXTURE_VAULT"

  # With no profile table the checker must NOT produce a WARN (no built-in fallback).
  # It may print a "no profile" info line, but must not fire a domain/range WARN.
  refute_output_contains "depends_on"
  # Must not exit 1 due to a spurious WARN from a hardcoded table.
  # (exit 0 = clean; exit 2 = error — both are acceptable when profile is absent)
  if [ "${status:-}" -eq 1 ]; then
    printf 'lint-ontology emitted WARNs without a profile table — inline copy suspected\n' >&2
    return 1
  fi
}

# ---------------------------------------------------------------------------
# S1-check: parent predicate pointing at a non-index page is flagged
# ---------------------------------------------------------------------------

@test "lint-ontology: WARN when parent points at a non-index page" {
  # parent range must be index; pointing at a source violates the rule.
  cat >"$FIXTURE_VAULT/wiki/topics/bad-parent.md" <<'EOF'
---
title: "Bad Parent"
type: concept
aliases: ["Bad Parent"]
parent: "[[Sample]]"
path: "topics"
sources: ["[[Sample]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: []
created: 2026-04-18
updated: 2026-04-18
update_count: 1
status: active
confidence: 0.7
---

# Bad Parent

## Definition

Concept whose parent points at a source page (range violation).

## Key Principles

None.

## Examples

None.

## Related Concepts

None.
EOF

  run bash "$SCRIPTS_DIR/lint-ontology.sh" --target "$FIXTURE_VAULT"

  assert_status 1
  assert_output_contains "WARN"
  assert_output_contains "parent"
}

# ---------------------------------------------------------------------------
# S1-check: reference vault passes cleanly
# ---------------------------------------------------------------------------

@test "lint-ontology: reference vault tests/fixtures/reference-vault passes with no WARNs" {
  run bash "$SCRIPTS_DIR/lint-ontology.sh" --target "$REPO_ROOT/tests/fixtures/reference-vault"

  assert_success
  refute_output_contains "WARN"
}
