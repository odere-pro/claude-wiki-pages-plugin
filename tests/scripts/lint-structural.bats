#!/usr/bin/env bats
# Tests for scripts/lint-structural.sh — S2-structural opt-in template-skeleton
# conformance checker and no-raw-HTML checker.
#
# Behavior under test:
#   - A page missing a required heading from its type's _templates/<type>.md
#     skeleton is flagged with a WARN.
#   - A page containing raw HTML (<div>, <span>, <table>) is flagged with a WARN.
#   - A fully conformant page with no raw HTML exits 0 with no WARNs.
#   - The reference vault docs/vault-example/ passes cleanly.
#
# All tests run against a fresh temp vault derived from tests/fixtures/minimal-vault/.

load '../test_helper/common'

setup() {
  _load_helpers
  setup_fixture_vault
  # Copy the _templates directory from vault-example so the checker can read skeletons.
  cp -R "$REPO_ROOT/docs/vault-example/_templates" "$FIXTURE_VAULT/_templates"
  # Also copy the authoritative CLAUDE.md for profile reads (needed if checker references it).
  cp "$REPO_ROOT/docs/vault-example/CLAUDE.md" "$FIXTURE_VAULT/CLAUDE.md"
}

teardown() {
  teardown_fixture_vault
}

# ---------------------------------------------------------------------------
# S2-structural: missing required heading is flagged
# ---------------------------------------------------------------------------

@test "lint-structural: WARN when concept page missing required heading" {
  # The concept template requires: ## Definition, ## Key Principles, ## Examples, ## Related Concepts
  # Write a concept page that omits "## Key Principles".
  cat >"$FIXTURE_VAULT/wiki/topics/bad-concept.md" <<'EOF'
---
title: "Missing Heading Concept"
type: concept
aliases: ["Missing Heading Concept"]
parent: "[[Topics — Index]]"
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

# Missing Heading Concept

## Definition

This concept is missing the Key Principles section.

## Examples

No examples.

## Related Concepts

None.
EOF

  run bash "$SCRIPTS_DIR/lint-structural.sh" --target "$FIXTURE_VAULT"

  assert_status 1
  assert_output_contains "WARN"
  assert_output_contains "Key Principles"
}

# ---------------------------------------------------------------------------
# S2-structural: raw HTML <div> is flagged
# ---------------------------------------------------------------------------

@test "lint-structural: WARN when page contains raw HTML div" {
  cat >"$FIXTURE_VAULT/wiki/topics/html-entity.md" <<'EOF'
---
title: "HTML Entity"
type: entity
entity_type: tool
aliases: ["HTML Entity"]
parent: "[[Topics — Index]]"
path: "topics"
sources: ["[[Sample]]"]
related: []
tags: []
created: 2026-04-18
updated: 2026-04-18
update_count: 1
status: active
confidence: 0.9
---

# HTML Entity

## Overview

This entity contains raw HTML.

<div class="warning">This is a raw HTML div that violates presentation independence.</div>

## Key Facts

None.

## Related

None.
EOF

  run bash "$SCRIPTS_DIR/lint-structural.sh" --target "$FIXTURE_VAULT"

  assert_status 1
  assert_output_contains "WARN"
  assert_output_contains "raw-html"
}

# ---------------------------------------------------------------------------
# S2-structural: raw HTML <table> is flagged
# ---------------------------------------------------------------------------

@test "lint-structural: WARN when page contains raw HTML table" {
  cat >"$FIXTURE_VAULT/wiki/topics/table-entity.md" <<'EOF'
---
title: "Table Entity"
type: entity
entity_type: tool
aliases: ["Table Entity"]
parent: "[[Topics — Index]]"
path: "topics"
sources: ["[[Sample]]"]
related: []
tags: []
created: 2026-04-18
updated: 2026-04-18
update_count: 1
status: active
confidence: 0.9
---

# Table Entity

## Overview

This entity uses an HTML table.

<table><tr><td>cell</td></tr></table>

## Key Facts

None.

## Related

None.
EOF

  run bash "$SCRIPTS_DIR/lint-structural.sh" --target "$FIXTURE_VAULT"

  assert_status 1
  assert_output_contains "WARN"
  assert_output_contains "raw-html"
}

# ---------------------------------------------------------------------------
# S2-structural: raw HTML <span> is flagged
# ---------------------------------------------------------------------------

@test "lint-structural: WARN when page contains raw HTML span" {
  cat >"$FIXTURE_VAULT/wiki/topics/span-entity.md" <<'EOF'
---
title: "Span Entity"
type: entity
entity_type: tool
aliases: ["Span Entity"]
parent: "[[Topics — Index]]"
path: "topics"
sources: ["[[Sample]]"]
related: []
tags: []
created: 2026-04-18
updated: 2026-04-18
update_count: 1
status: active
confidence: 0.9
---

# Span Entity

## Overview

This entity uses a <span style="color:red">raw HTML span</span>.

## Key Facts

None.

## Related

None.
EOF

  run bash "$SCRIPTS_DIR/lint-structural.sh" --target "$FIXTURE_VAULT"

  assert_status 1
  assert_output_contains "WARN"
  assert_output_contains "raw-html"
}

# ---------------------------------------------------------------------------
# S2-structural: conformant page exits 0 with no WARN
# ---------------------------------------------------------------------------

@test "lint-structural: clean when entity page has all required headings and no HTML" {
  # entity template requires: ## Overview, ## Key Facts, ## Related
  # The existing sample-entity.md in the fixture already has Overview/Related but
  # let's write a fresh conformant page to be explicit.
  cat >"$FIXTURE_VAULT/wiki/topics/good-entity.md" <<'EOF'
---
title: "Good Entity"
type: entity
entity_type: tool
aliases: ["Good Entity"]
parent: "[[Topics — Index]]"
path: "topics"
sources: ["[[Sample]]"]
related: []
tags: []
created: 2026-04-18
updated: 2026-04-18
update_count: 1
status: active
confidence: 0.9
---

# Good Entity

## Overview

A fully conformant entity page with all template headings present.

## Key Facts

- Uses plain markdown, no raw HTML.

## Related

None.
EOF

  run bash "$SCRIPTS_DIR/lint-structural.sh" --target "$FIXTURE_VAULT"

  assert_success
  refute_output_contains "WARN"
}

# ---------------------------------------------------------------------------
# S2-structural: reference vault docs/vault-example/ passes cleanly
# ---------------------------------------------------------------------------

@test "lint-structural: reference vault docs/vault-example passes with no WARNs" {
  run bash "$SCRIPTS_DIR/lint-structural.sh" --target "$REPO_ROOT/docs/vault-example"

  assert_success
  refute_output_contains "WARN"
}
