#!/usr/bin/env bats
# Tests for tests/run-tests.sh, tests/gates/gate-12-stale-dist.sh,
# and tests/gates/gate-09-npm-pack.sh.
#
# Behaviors under test:
#   - --help prints usage and exits 0.
#   - --list prints the commands that would run for each tier without executing them.
#   - default (no tier) lists both Tier 0 and Tier 1.
#   - Unknown tier exits 2 with a clear error.
#   - tier3 self-skips (permanently dropped).
#   - gate-12 FAILs when dist/cli.js is stale, SKIPs when absent, PASSes when fresh.
#   - gate-09 parses npm pack JSON correctly (spaced and compact forms).

load '../test_helper/common'

SCRIPT="$REPO_ROOT/tests/run-tests.sh"
GATE12="$REPO_ROOT/tests/gates/gate-12-stale-dist.sh"
GATE09="$REPO_ROOT/tests/gates/gate-09-npm-pack.sh"

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

@test "run-tests: tier3 self-skips with dropped message and exits 0" {
  run bash "$SCRIPT" tier3

  assert_success
  assert_output_contains "SKIP"
  assert_output_contains "Tier 3"
  assert_output_contains "dropped"
}

@test "run-tests: --list tier3 names the tier3 target" {
  run bash "$SCRIPT" --list tier3

  assert_success
  assert_output_contains "tier3"
}

# ---------------------------------------------------------------------------
# eval selector — opt-in local-model quality-gate eval (plan 0003).
# Self-skips cleanly when no local model is configured (mirrors tier2/claude).
# Building/testing the apparatus must NOT require a live model.
# ---------------------------------------------------------------------------

@test "run-tests: eval selector self-skips with no model configured and exits 0" {
  run env -u CLAUDE_WIKI_PAGES_EVAL_MODEL bash "$SCRIPT" eval

  assert_success
  assert_output_contains "SKIP"
  assert_output_contains "eval"
}

@test "run-tests: --list eval names the eval target" {
  run bash "$SCRIPT" --list eval

  assert_success
  assert_output_contains "eval"
}

@test "run-tests: eval is NOT part of the default run" {
  run bash "$SCRIPT" --list

  assert_success
  # The opt-in eval tier must not run as part of the default merge-gating run.
  # (The driver script still appears in the tier0 shellcheck glob — that is the
  # static lint of the file, not the eval tier executing. The distinctive marker
  # of the eval tier is its --self-test invocation / "[list] eval:" label.)
  refute_output_contains "[list] eval:"
  refute_output_contains "eval-ingest-extract.sh --self-test"
}

# ---------------------------------------------------------------------------
# gate-12: stale-dist check
# ---------------------------------------------------------------------------

@test "gate-12: SKIPs cleanly when dist/cli.js does not exist" {
  local tmpdir
  tmpdir="$(mktemp -d "${BATS_TEST_TMPDIR}/gate12-absent.XXXXXX")"
  # Create a minimal src/ with one .ts file; no dist/
  mkdir -p "$tmpdir/src"
  printf 'export const x = 1;\n' >"$tmpdir/src/cli.ts"
  mkdir -p "$tmpdir/tests/gates"
  cp "$GATE12" "$tmpdir/tests/gates/gate-12-stale-dist.sh"

  run bash -c "cd '$tmpdir' && bash tests/gates/gate-12-stale-dist.sh"

  assert_success
  assert_output_contains "SKIP"
}

@test "gate-12: FAILs when dist/cli.js is older than a src .ts file" {
  local tmpdir
  tmpdir="$(mktemp -d "${BATS_TEST_TMPDIR}/gate12-stale.XXXXXX")"
  mkdir -p "$tmpdir/src" "$tmpdir/dist"
  # Create dist/cli.js first (older)
  printf '// built\n' >"$tmpdir/dist/cli.js"
  # Wait a moment and create a newer src file
  sleep 0.05
  printf 'export const x = 1;\n' >"$tmpdir/src/cli.ts"
  mkdir -p "$tmpdir/tests/gates"
  cp "$GATE12" "$tmpdir/tests/gates/gate-12-stale-dist.sh"

  run bash -c "cd '$tmpdir' && bash tests/gates/gate-12-stale-dist.sh"

  assert_status 1
  assert_output_contains "FAIL"
  assert_output_contains "stale"
}

@test "gate-12: PASSes when dist/cli.js is newer than all src .ts files" {
  local tmpdir
  tmpdir="$(mktemp -d "${BATS_TEST_TMPDIR}/gate12-fresh.XXXXXX")"
  mkdir -p "$tmpdir/src" "$tmpdir/dist"
  # Create the src file first (older)
  printf 'export const x = 1;\n' >"$tmpdir/src/cli.ts"
  # Wait a moment and create a newer dist/cli.js
  sleep 0.05
  printf '// built\n' >"$tmpdir/dist/cli.js"
  mkdir -p "$tmpdir/tests/gates"
  cp "$GATE12" "$tmpdir/tests/gates/gate-12-stale-dist.sh"

  run bash -c "cd '$tmpdir' && bash tests/gates/gate-12-stale-dist.sh"

  assert_success
  assert_output_contains "OK"
}

# ---------------------------------------------------------------------------
# gate-09: npm pack JSON parse — handles both compact and spaced JSON
# ---------------------------------------------------------------------------

@test "gate-09: parses spaced JSON (macOS npm) without SKIPping" {
  # Simulate npm pack --dry-run --json with space-after-colon formatting (macOS).
  local tmpdir
  tmpdir="$(mktemp -d "${BATS_TEST_TMPDIR}/gate09-spaced.XXXXXX")"
  mkdir -p "$tmpdir/bin" "$tmpdir/tests/gates"

  # Write a fake npm that emits pretty-printed (spaced) JSON.
  cat >"$tmpdir/bin/npm" <<'NPM_EOF'
#!/bin/sh
printf '%s\n' '[{"files":[{"path": "dist/cli.js"},{"path": "schemas/config.json"},{"path": "LICENSE"}]}]'
NPM_EOF
  chmod +x "$tmpdir/bin/npm"
  cp "$GATE09" "$tmpdir/tests/gates/gate-09-npm-pack.sh"

  run bash -c "cd '$tmpdir' && PATH='$tmpdir/bin:$PATH' bash tests/gates/gate-09-npm-pack.sh"

  assert_success
  refute_output_contains "SKIP"
  assert_output_contains "OK"
}

@test "gate-09: FAILs when src/ would be published (spaced JSON)" {
  local tmpdir
  tmpdir="$(mktemp -d "${BATS_TEST_TMPDIR}/gate09-fail.XXXXXX")"
  mkdir -p "$tmpdir/bin" "$tmpdir/tests/gates"

  cat >"$tmpdir/bin/npm" <<'NPM_EOF'
#!/bin/sh
printf '%s\n' '[{"files":[{"path": "src/cli.ts"},{"path": "dist/cli.js"}]}]'
NPM_EOF
  chmod +x "$tmpdir/bin/npm"
  cp "$GATE09" "$tmpdir/tests/gates/gate-09-npm-pack.sh"

  run bash -c "cd '$tmpdir' && PATH='$tmpdir/bin:$PATH' bash tests/gates/gate-09-npm-pack.sh"

  assert_status 1
  assert_output_contains "FAIL"
}
