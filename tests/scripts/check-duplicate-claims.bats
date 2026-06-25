#!/usr/bin/env bats
# Tests for scripts/check-duplicate-claims.sh (P2.4 — ADR-0014 Part B)
#
# Behavior under test:
#
#   (a) NORMALIZED-IDENTICAL QUOTE — a proposed page whose source_quotes.quote
#       normalizes to the same canonical form as an existing wiki/ page quote
#       → WARNs, names both pages, and suggests [[existing-page]] wikilink.
#
#   (b) DISTINCT QUOTE — a proposed page with a genuinely different quote
#       → does NOT warn.
#
#   (c) PARAPHRASE (NO-RAG BOUNDARY) — a reworded version of an existing quote
#       does NOT match. This test positively asserts exact/normalized only;
#       no fuzzy, no edit-distance, no semantic comparison ever.
#
#   (d) ABSENT / EMPTY source_quotes — clean no-op; no warning, no error.
#
#   (e) EXIT CODE — always 0 (WARN, never block); advisory only.
#
# ADR-0014 Part B canonical form (applied in this exact order):
#   1. Strip surrounding YAML scalar quoting (double/single quotes, brackets)
#   2. ASCII lowercase  (tr '[:upper:]' '[:lower:]')
#   3. Collapse whitespace runs (space/tab/newline) to a single space
#   4. Trim leading/trailing whitespace
#   5. Remove fixed ASCII punctuation: . , ; : ! ? " ' ` ( ) [ ] - (en/em dash)
#
# The script exits 0 in ALL cases (warn-only; does not raise VIOLATIONS).

load '../test_helper/common'

setup() {
  _load_helpers
  setup_fixture_vault

  # Create _proposed/ staging directory under the fixture vault.
  mkdir -p "$FIXTURE_VAULT/_proposed/wiki/topics"
}

teardown() {
  teardown_fixture_vault
}

# ---------------------------------------------------------------------------
# Helper: write a wiki page with source_quotes into the fixture vault.
# Usage: write_wiki_page <relative-path-under-wiki/> <quote-text>
# ---------------------------------------------------------------------------
write_wiki_page_with_quote() {
  local rel_path="$1"
  local quote_text="$2"
  local abs_path="$FIXTURE_VAULT/wiki/$rel_path"
  mkdir -p "$(dirname "$abs_path")"
  cat >"$abs_path" <<YAML
---
title: "Existing Page"
type: concept
aliases: ["Existing Page"]
parent: "[[Topics — Index]]"
path: "topics"
sources: ["[[Sample]]"]
created: 2026-04-18
updated: 2026-04-18
status: active
confidence: 0.9
source_quotes:
  - source: "[[Sample]]"
    quote: "${quote_text}"
---

# Existing Page

Body text.
YAML
}

# ---------------------------------------------------------------------------
# Helper: write a proposed page with source_quotes into _proposed/.
# Usage: write_proposed_page <relative-path-under-_proposed/wiki/> <quote-text>
# ---------------------------------------------------------------------------
write_proposed_page_with_quote() {
  local rel_path="$1"
  local quote_text="$2"
  local abs_path="$FIXTURE_VAULT/_proposed/wiki/$rel_path"
  mkdir -p "$(dirname "$abs_path")"
  cat >"$abs_path" <<YAML
---
title: "Proposed Page"
type: concept
aliases: ["Proposed Page"]
parent: "[[Topics — Index]]"
path: "topics"
sources: ["[[Sample]]"]
created: 2026-04-18
updated: 2026-04-18
status: draft
proposed_by: "claude"
confidence: 0.9
source_quotes:
  - source: "[[Sample]]"
    quote: "${quote_text}"
---

# Proposed Page

Body text.
YAML
}

# ---------------------------------------------------------------------------
# Helper: write a proposed page with NO source_quotes field.
# ---------------------------------------------------------------------------
write_proposed_page_no_quotes() {
  local rel_path="$1"
  local abs_path="$FIXTURE_VAULT/_proposed/wiki/$rel_path"
  mkdir -p "$(dirname "$abs_path")"
  cat >"$abs_path" <<'YAML'
---
title: "Proposed No Quotes"
type: concept
aliases: ["Proposed No Quotes"]
parent: "[[Topics — Index]]"
path: "topics"
sources: ["[[Sample]]"]
created: 2026-04-18
updated: 2026-04-18
status: draft
proposed_by: "claude"
confidence: 0.9
---

# Proposed No Quotes

No source_quotes field at all.
YAML
}

# ---------------------------------------------------------------------------
# Helper: write a proposed page with an empty source_quotes list.
# ---------------------------------------------------------------------------
write_proposed_page_empty_quotes() {
  local rel_path="$1"
  local abs_path="$FIXTURE_VAULT/_proposed/wiki/$rel_path"
  mkdir -p "$(dirname "$abs_path")"
  cat >"$abs_path" <<'YAML'
---
title: "Proposed Empty Quotes"
type: concept
aliases: ["Proposed Empty Quotes"]
parent: "[[Topics — Index]]"
path: "topics"
sources: ["[[Sample]]"]
created: 2026-04-18
updated: 2026-04-18
status: draft
proposed_by: "claude"
confidence: 0.9
source_quotes: []
---

# Proposed Empty Quotes

Empty source_quotes list.
YAML
}

# ===========================================================================
# (a) NORMALIZED-IDENTICAL QUOTE → WARN naming both pages + suggest wikilink
# ===========================================================================

@test "Duplicate-claim detection: a normalized-identical quote warns and names both pages" {  # spec a
  local quote="The system uses a layered architecture."
  write_wiki_page_with_quote "topics/existing-concept.md" "$quote"
  write_proposed_page_with_quote "topics/new-concept.md" "$quote"

  run bash "$REPO_ROOT/scripts/check-duplicate-claims.sh" \
    --target "$FIXTURE_VAULT" \
    --proposed "$FIXTURE_VAULT/_proposed/wiki/topics/new-concept.md"

  assert_success
  assert_output_contains "WARN"
  assert_output_contains "existing-concept"
  assert_output_contains "new-concept"
}

@test "Duplicate-claim detection: an inline list-item quote shape (- quote:) is also detected" {  # spec a
  # Block-mapping shape in the wiki page; inline list-item shape in the proposal.
  # Both are valid YAML for source_quotes — the extractor must catch both.
  local quote="The system uses a layered architecture."
  write_wiki_page_with_quote "topics/existing-concept.md" "$quote"

  local abs_path="$FIXTURE_VAULT/_proposed/wiki/topics/inline-concept.md"
  mkdir -p "$(dirname "$abs_path")"
  cat >"$abs_path" <<YAML
---
title: "Inline Concept"
type: concept
aliases: ["Inline Concept"]
parent: "[[Topics — Index]]"
path: "topics"
sources: ["[[Sample]]"]
created: 2026-04-18
updated: 2026-04-18
status: draft
proposed_by: "claude"
confidence: 0.9
source_quotes:
  - quote: "${quote}"
    source: "[[Sample]]"
---

# Inline Concept

Body text.
YAML

  run bash "$REPO_ROOT/scripts/check-duplicate-claims.sh" \
    --target "$FIXTURE_VAULT" \
    --proposed "$abs_path"

  assert_success
  assert_output_contains "WARN"
  assert_output_contains "existing-concept"
  assert_output_contains "inline-concept"
}

@test "Duplicate-claim detection: a normalized-identical quote suggests a wikilink to the existing page" {  # spec a
  local quote="The system uses a layered architecture."
  write_wiki_page_with_quote "topics/existing-concept.md" "$quote"
  write_proposed_page_with_quote "topics/new-concept.md" "$quote"

  run bash "$REPO_ROOT/scripts/check-duplicate-claims.sh" \
    --target "$FIXTURE_VAULT" \
    --proposed "$FIXTURE_VAULT/_proposed/wiki/topics/new-concept.md"

  assert_success
  assert_output_contains "[["
  assert_output_contains "existing-concept"
}

@test "Duplicate-claim detection: a case-only difference normalizes to the same form and triggers a warn" {  # spec a
  # "The System Uses A Layered Architecture." and
  # "the system uses a layered architecture." normalize to the same form.
  write_wiki_page_with_quote "topics/existing-concept.md" \
    "The System Uses A Layered Architecture."
  write_proposed_page_with_quote "topics/new-concept.md" \
    "the system uses a layered architecture."

  run bash "$REPO_ROOT/scripts/check-duplicate-claims.sh" \
    --target "$FIXTURE_VAULT" \
    --proposed "$FIXTURE_VAULT/_proposed/wiki/topics/new-concept.md"

  assert_success
  assert_output_contains "WARN"
  assert_output_contains "existing-concept"
}

@test "Duplicate-claim detection: a punctuation-only difference normalizes to the same form and triggers a warn" {  # spec a
  # "Layered, architecture; systems." and "Layered architecture systems"
  # normalize identically after stripping punctuation.
  write_wiki_page_with_quote "topics/existing-concept.md" \
    "Layered, architecture; systems."
  write_proposed_page_with_quote "topics/new-concept.md" \
    "Layered architecture systems"

  run bash "$REPO_ROOT/scripts/check-duplicate-claims.sh" \
    --target "$FIXTURE_VAULT" \
    --proposed "$FIXTURE_VAULT/_proposed/wiki/topics/new-concept.md"

  assert_success
  assert_output_contains "WARN"
}

@test "Duplicate-claim detection: extra whitespace collapses to a single space and triggers a warn" {  # spec a
  # Whitespace runs collapse to a single space.
  write_wiki_page_with_quote "topics/existing-concept.md" \
    "The    system   uses   layers."
  write_proposed_page_with_quote "topics/new-concept.md" \
    "The system uses layers."

  run bash "$REPO_ROOT/scripts/check-duplicate-claims.sh" \
    --target "$FIXTURE_VAULT" \
    --proposed "$FIXTURE_VAULT/_proposed/wiki/topics/new-concept.md"

  assert_success
  assert_output_contains "WARN"
}

# ===========================================================================
# (b) GENUINELY DISTINCT QUOTE → NO WARN
# ===========================================================================

@test "Duplicate-claim detection: a genuinely distinct quote produces no warning" {  # spec b
  write_wiki_page_with_quote "topics/existing-concept.md" \
    "The system uses a layered architecture."
  write_proposed_page_with_quote "topics/new-concept.md" \
    "Data flows through five independent modules."

  run bash "$REPO_ROOT/scripts/check-duplicate-claims.sh" \
    --target "$FIXTURE_VAULT" \
    --proposed "$FIXTURE_VAULT/_proposed/wiki/topics/new-concept.md"

  assert_success
  refute_output_contains "WARN"
}

@test "Duplicate-claim detection: a vault with no quoted wiki pages produces no warning" {  # spec b
  # The fixture vault has wiki pages but none with source_quotes.
  write_proposed_page_with_quote "topics/new-concept.md" \
    "Some brand new claim."

  run bash "$REPO_ROOT/scripts/check-duplicate-claims.sh" \
    --target "$FIXTURE_VAULT" \
    --proposed "$FIXTURE_VAULT/_proposed/wiki/topics/new-concept.md"

  assert_success
  refute_output_contains "WARN"
}

# ===========================================================================
# (c) PARAPHRASE (NO-RAG BOUNDARY) → does NOT warn
#     This test positively asserts that exact/normalized match ONLY is used.
#     A reworded equivalent must NOT trigger a warning.
# ===========================================================================

@test "Duplicate-claim detection: a reworded paraphrase does NOT warn, holding the NO-RAG boundary" {  # spec c
  # Existing: "The system employs a multi-tier design."
  # Proposed: "It uses a layered architecture approach."
  # Same meaning, completely different words → must NOT match.
  write_wiki_page_with_quote "topics/existing-concept.md" \
    "The system employs a multi-tier design."
  write_proposed_page_with_quote "topics/new-concept.md" \
    "It uses a layered architecture approach."

  run bash "$REPO_ROOT/scripts/check-duplicate-claims.sh" \
    --target "$FIXTURE_VAULT" \
    --proposed "$FIXTURE_VAULT/_proposed/wiki/topics/new-concept.md"

  assert_success
  refute_output_contains "WARN"
}

@test "Duplicate-claim detection: a near-synonym paraphrase does NOT warn" {  # spec c
  # "Components communicate via message passing" vs
  # "Modules exchange data through messages" — semantically similar, not identical.
  write_wiki_page_with_quote "topics/existing-concept.md" \
    "Components communicate via message passing."
  write_proposed_page_with_quote "topics/new-concept.md" \
    "Modules exchange data through messages."

  run bash "$REPO_ROOT/scripts/check-duplicate-claims.sh" \
    --target "$FIXTURE_VAULT" \
    --proposed "$FIXTURE_VAULT/_proposed/wiki/topics/new-concept.md"

  assert_success
  refute_output_contains "WARN"
}

# ===========================================================================
# (d) ABSENT / EMPTY source_quotes → clean no-op
# ===========================================================================

@test "Duplicate-claim detection: an absent source_quotes field is a clean no-op" {  # spec d
  write_wiki_page_with_quote "topics/existing-concept.md" \
    "The system uses a layered architecture."
  write_proposed_page_no_quotes "topics/new-concept.md"

  run bash "$REPO_ROOT/scripts/check-duplicate-claims.sh" \
    --target "$FIXTURE_VAULT" \
    --proposed "$FIXTURE_VAULT/_proposed/wiki/topics/new-concept.md"

  assert_success
  refute_output_contains "WARN"
  refute_output_contains "error"
}

@test "Duplicate-claim detection: an empty source_quotes list is a clean no-op" {  # spec d
  write_wiki_page_with_quote "topics/existing-concept.md" \
    "The system uses a layered architecture."
  write_proposed_page_empty_quotes "topics/new-concept.md"

  run bash "$REPO_ROOT/scripts/check-duplicate-claims.sh" \
    --target "$FIXTURE_VAULT" \
    --proposed "$FIXTURE_VAULT/_proposed/wiki/topics/new-concept.md"

  assert_success
  refute_output_contains "WARN"
  refute_output_contains "error"
}

# ===========================================================================
# (e) EXIT CODE — always 0 (warn-only, does not block)
# ===========================================================================

@test "Duplicate-claim detection: the exit code is 0 even when duplicate quotes are found (advisory only)" {  # spec e
  local quote="The system uses a layered architecture."
  write_wiki_page_with_quote "topics/existing-concept.md" "$quote"
  write_proposed_page_with_quote "topics/new-concept.md" "$quote"

  run bash "$REPO_ROOT/scripts/check-duplicate-claims.sh" \
    --target "$FIXTURE_VAULT" \
    --proposed "$FIXTURE_VAULT/_proposed/wiki/topics/new-concept.md"

  assert_success
}

@test "Duplicate-claim detection: the exit code is 0 when no proposed file is given (no error)" {  # spec e
  # When --proposed is omitted or the path does not exist, exits 0 gracefully.
  run bash "$REPO_ROOT/scripts/check-duplicate-claims.sh" \
    --target "$FIXTURE_VAULT"

  assert_success
}
