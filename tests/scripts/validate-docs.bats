#!/usr/bin/env bats
# Tests for scripts/validate-docs.sh
#
# Behavior under test:
#   - Pass on a clean tree (the current repo, which must stay green).
#   - Fail when retired vocabulary (`second-brain`, `second brain`,
#     `vault-synthesize`, `vault-index`) leaks outside BAN_EXEMPT.
#   - Allow retired vocabulary inside BAN_EXEMPT (VOCABULARY.md, CHANGELOG.md).
#   - Fail on SEO-register leaks ("knowledge management") outside SEO_EXEMPT.
#   - Allow SEO-register leaks inside the exempt set (e.g. README.md).
#   - Fail on /llm-wiki-stack:<name> references that do not resolve to a
#     skill directory or agent .md file.
#
# validate-docs.sh uses `git ls-files` to enumerate files, so every test that
# needs a file visible to the scan creates an isolated git repo with that
# file committed (see setup_isolated_repo / commit_file_in_isolated_repo in
# tests/test_helper/common.bash).

load '../test_helper/common'

setup() {
  _load_helpers
}

# -----------------------------------------------------------------------------
# Happy path against the real repo
# -----------------------------------------------------------------------------

@test "validate-docs: passes on clean tree" {
  # Run against the real repo root. If this fails, the repo itself has a
  # vocabulary violation and the tests should surface that before CI does.
  run bash "$SCRIPTS_DIR/validate-docs.sh" "$REPO_ROOT"

  assert_success
  assert_output_contains "All vocabulary checks passed"
}

# -----------------------------------------------------------------------------
# Banned strings (retired vocabulary)
# -----------------------------------------------------------------------------

@test "validate-docs: flags retired 'second-brain' outside exempt set" {
  setup_isolated_repo
  rm -f "$ISOLATED_REPO/docs/architecture.md"
  commit_file_in_isolated_repo "docs/architecture.md" \
    "# Architecture\n\nThe second-brain-ingest skill processes sources.\n"

  run bash "$SCRIPTS_DIR/validate-docs.sh" "$ISOLATED_REPO"
  local rc=$status
  local out="$output"

  teardown_isolated_repo

  assert_eq "$rc" 1
  assert_contains "$out" "banned string"
  assert_contains "$out" "architecture.md"
}

@test "validate-docs: flags retired 'vault-synthesize' outside exempt set" {
  setup_isolated_repo
  rm -f "$ISOLATED_REPO/docs/architecture.md"
  commit_file_in_isolated_repo "docs/architecture.md" \
    "# Architecture\n\nThe vault-synthesize command writes syntheses.\n"

  run bash "$SCRIPTS_DIR/validate-docs.sh" "$ISOLATED_REPO"
  local rc=$status
  local out="$output"

  teardown_isolated_repo

  assert_eq "$rc" 1
  assert_contains "$out" "banned string"
}

@test "validate-docs: allows retired vocabulary in CHANGELOG.md" {
  setup_isolated_repo
  # CHANGELOG.md IS in BAN_EXEMPT — historical record is preserved.
  rm -f "$ISOLATED_REPO/CHANGELOG.md"
  commit_file_in_isolated_repo "CHANGELOG.md" \
    "# Changelog\n\n## 0.1.0\n- Initial skills: second-brain, vault-synthesize, vault-index.\n"

  run bash "$SCRIPTS_DIR/validate-docs.sh" "$ISOLATED_REPO"
  local rc=$status
  local out="$output"

  teardown_isolated_repo

  assert_eq "$rc" 0
  assert_contains "$out" "no banned strings"
}

# -----------------------------------------------------------------------------
# SEO-register leaks
# -----------------------------------------------------------------------------

@test "validate-docs: flags SEO leak outside allowlist" {
  setup_isolated_repo
  # docs/architecture.md is NOT in SEO_EXEMPT, so "knowledge management" leaks.
  rm -f "$ISOLATED_REPO/docs/architecture.md"
  commit_file_in_isolated_repo "docs/architecture.md" \
    "# Architecture\n\nA knowledge management approach is useful here.\n"

  run bash "$SCRIPTS_DIR/validate-docs.sh" "$ISOLATED_REPO"
  local rc=$status
  local out="$output"

  teardown_isolated_repo

  assert_eq "$rc" 1
  assert_contains "$out" "SEO-register term"
  assert_contains "$out" "architecture.md"
}

@test "validate-docs: allows SEO term in README (in allowlist)" {
  setup_isolated_repo
  # README.md IS in SEO_EXEMPT.
  rm -f "$ISOLATED_REPO/README.md"
  commit_file_in_isolated_repo "README.md" \
    "# llm-wiki-stack\n\nA knowledge management stack for Claude Code.\n"

  run bash "$SCRIPTS_DIR/validate-docs.sh" "$ISOLATED_REPO"
  local rc=$status
  local out="$output"

  teardown_isolated_repo

  assert_eq "$rc" 0
  assert_contains "$out" "no SEO-register leaks"
}

# -----------------------------------------------------------------------------
# Slash-command resolution
# -----------------------------------------------------------------------------

@test "validate-docs: flags unresolved slash command" {
  setup_isolated_repo
  commit_file_in_isolated_repo "docs/broken-ref.md" \
    "# Broken\n\nSee /llm-wiki-stack:nonexistent-skill for details.\n"

  run bash "$SCRIPTS_DIR/validate-docs.sh" "$ISOLATED_REPO"
  local rc=$status
  local out="$output"

  teardown_isolated_repo

  assert_eq "$rc" 1
  assert_contains "$out" "/llm-wiki-stack:nonexistent-skill"
  assert_contains "$out" "does not resolve"
}

@test "validate-docs: allows existing slash command reference" {
  setup_isolated_repo
  # /llm-wiki-stack:llm-wiki resolves to skills/llm-wiki/ (after rename).
  commit_file_in_isolated_repo "docs/valid-ref.md" \
    "# Valid\n\nRun /llm-wiki-stack:llm-wiki to start.\n"

  run bash "$SCRIPTS_DIR/validate-docs.sh" "$ISOLATED_REPO"
  local rc=$status
  local out="$output"

  teardown_isolated_repo

  assert_eq "$rc" 0
  assert_contains "$out" "all slash-command references resolve"
}
