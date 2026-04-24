#!/usr/bin/env bats
# Tests for tests/run-tests.sh
#
# Behaviors under test:
#   - --help prints usage and exits 0.
#   - --list prints the commands that would run for each tier without executing them.
#   - default (no tier) lists both Tier 0 and Tier 1.
#   - Unknown tier exits 2 with a clear error.

load '../test_helper/common'

SCRIPT="$REPO_ROOT/tests/run-tests.sh"

@test "run-tests: --help prints usage and exits 0" {
  run bash "$SCRIPT" --help

  assert_success
  assert_output_contains "Usage:"
  assert_output_contains "tier0"
  assert_output_contains "tier1"
  assert_output_contains "tier2"
}

@test "run-tests: --list tier0 names Tier 0 checks" {
  run bash "$SCRIPT" --list tier0

  assert_success
  assert_output_contains "shellcheck"
  assert_output_contains "markdownlint"
  assert_output_contains "validate-docs"
}

@test "run-tests: --list tier1 names Bats run" {
  run bash "$SCRIPT" --list tier1

  assert_success
  assert_output_contains "bats"
  assert_output_contains "tests/scripts/"
}

@test "run-tests: --list tier2 names smoke scripts" {
  run bash "$SCRIPT" --list tier2

  assert_success
  assert_output_contains "fresh-install"
  assert_output_contains "skill-schema"
}

@test "run-tests: --list with no tier lists Tier 0 + Tier 1" {
  run bash "$SCRIPT" --list

  assert_success
  assert_output_contains "shellcheck"
  assert_output_contains "bats"
  # Default must NOT include Tier 2 smoke by default.
  refute_output_contains "fresh-install"
}

@test "run-tests: --list all lists all three tiers" {
  run bash "$SCRIPT" --list all

  assert_success
  assert_output_contains "shellcheck"
  assert_output_contains "bats"
  assert_output_contains "fresh-install"
}

@test "run-tests: unknown tier exits 2" {
  run bash "$SCRIPT" --list tier99

  assert_status 2
  assert_output_contains "unknown tier"
}
