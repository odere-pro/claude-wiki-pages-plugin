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

@test "Test runner: --help prints the usage text and exits 0" {
  run bash "$SCRIPT" --help

  assert_success
  assert_output_contains "Usage:"
  assert_output_contains "tier0"
  assert_output_contains "tier1"
  assert_output_contains "tier2"
}

@test "Test runner: --list tier0 names the Tier 0 static checks without executing them" {
  run bash "$SCRIPT" --list tier0

  assert_success
  assert_output_contains "shellcheck"
  assert_output_contains "markdownlint"
  assert_output_contains "validate-docs"
}

@test "Test runner: --list tier1 names the Bats run over tests/scripts/" {
  run bash "$SCRIPT" --list tier1

  assert_success
  assert_output_contains "bats"
  assert_output_contains "tests/scripts/"
}

@test "Test runner: --list tier2 names the smoke scripts" {
  run bash "$SCRIPT" --list tier2

  assert_success
  assert_output_contains "fresh-install"
  assert_output_contains "skill-schema"
}

@test "Test runner: --list with no tier lists Tier 0 plus Tier 1 and excludes Tier 2 smoke" {
  run bash "$SCRIPT" --list

  assert_success
  assert_output_contains "shellcheck"
  assert_output_contains "bats"
  # Default must NOT include Tier 2 smoke by default.
  refute_output_contains "fresh-install"
}

@test "Test runner: --list all lists all three tiers" {
  run bash "$SCRIPT" --list all

  assert_success
  assert_output_contains "shellcheck"
  assert_output_contains "bats"
  assert_output_contains "fresh-install"
}

@test "Test runner: an unknown tier exits 2 with an unknown-tier error" {
  run bash "$SCRIPT" --list tier99

  assert_status 2
  assert_output_contains "unknown tier"
}

@test "Test runner: tier3 self-skips with a dropped message and exits 0" {
  run bash "$SCRIPT" tier3

  assert_success
  assert_output_contains "SKIP"
  assert_output_contains "Tier 3"
  assert_output_contains "dropped"
}

@test "Test runner: --list tier3 names the tier3 target" {
  run bash "$SCRIPT" --list tier3

  assert_success
  assert_output_contains "tier3"
}

# ---------------------------------------------------------------------------
# eval selector — opt-in local-model quality-gate eval (plan 0003).
# Self-skips cleanly when no local model is configured (mirrors tier2/claude).
# Building/testing the apparatus must NOT require a live model.
# ---------------------------------------------------------------------------

@test "Test runner: the eval selector self-skips when no local model is configured and exits 0" {
  run env -u CLAUDE_WIKI_PAGES_EVAL_MODEL bash "$SCRIPT" eval

  assert_success
  assert_output_contains "SKIP"
  assert_output_contains "eval"
}

@test "Test runner: --list eval names the eval target" {
  run bash "$SCRIPT" --list eval

  assert_success
  assert_output_contains "eval"
}

@test "Test runner: the opt-in eval tier is not part of the default merge-gating run" {
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

@test "Test runner: the stale-dist gate SKIPs cleanly when dist/cli.js does not exist # spec gate-12" {
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

@test "Test runner: the stale-dist gate FAILs when dist/cli.js is older than a src .ts file # spec gate-12" {
  local tmpdir
  tmpdir="$(mktemp -d "${BATS_TEST_TMPDIR}/gate12-stale.XXXXXX")"
  mkdir -p "$tmpdir/src" "$tmpdir/dist"
  # Use explicit past/future timestamps to avoid sub-second filesystem races.
  # dist/cli.js at a fixed past time; src/cli.ts one second later.
  printf '// built\n' >"$tmpdir/dist/cli.js"
  touch -t 202001010000 "$tmpdir/dist/cli.js"
  printf 'export const x = 1;\n' >"$tmpdir/src/cli.ts"
  touch -t 202001010001 "$tmpdir/src/cli.ts"
  mkdir -p "$tmpdir/tests/gates"
  cp "$GATE12" "$tmpdir/tests/gates/gate-12-stale-dist.sh"

  run bash -c "cd '$tmpdir' && bash tests/gates/gate-12-stale-dist.sh"

  assert_status 1
  assert_output_contains "FAIL"
  assert_output_contains "stale"
}

@test "Test runner: the stale-dist gate PASSes when dist/cli.js is newer than all src .ts files # spec gate-12" {
  local tmpdir
  tmpdir="$(mktemp -d "${BATS_TEST_TMPDIR}/gate12-fresh.XXXXXX")"
  mkdir -p "$tmpdir/src" "$tmpdir/dist"
  # src/cli.ts at a fixed past time; dist/cli.js one second later.
  printf 'export const x = 1;\n' >"$tmpdir/src/cli.ts"
  touch -t 202001010000 "$tmpdir/src/cli.ts"
  printf '// built\n' >"$tmpdir/dist/cli.js"
  touch -t 202001010001 "$tmpdir/dist/cli.js"
  mkdir -p "$tmpdir/tests/gates"
  cp "$GATE12" "$tmpdir/tests/gates/gate-12-stale-dist.sh"

  run bash -c "cd '$tmpdir' && bash tests/gates/gate-12-stale-dist.sh"

  assert_success
  assert_output_contains "OK"
}

# ---------------------------------------------------------------------------
# gate-09: npm pack JSON parse — handles both compact and spaced JSON
# ---------------------------------------------------------------------------

@test "Test runner: the npm-pack gate parses spaced JSON from macOS npm without SKIPping # spec gate-09" {
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

@test "Test runner: the npm-pack gate FAILs when src/ would be published, parsing spaced JSON # spec gate-09" {
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
