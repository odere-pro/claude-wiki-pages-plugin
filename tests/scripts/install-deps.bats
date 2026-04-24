#!/usr/bin/env bats
# Tests for tests/install-deps.sh
#
# Behaviors under test:
#   - --help prints usage and exits 0.
#   - --dry-run prints intended install commands and exits 0 without installing.
#   - --check reports status without installing; exit 0 iff everything present.
#   - Unknown flags exit 2 with usage on stderr.
#   - Unsupported OS (non-Darwin, non-Linux) exits 1 with a clear error.

load '../test_helper/common'

SCRIPT="$REPO_ROOT/tests/install-deps.sh"

@test "install-deps: --help prints usage and exits 0" {
  run bash "$SCRIPT" --help

  assert_success
  assert_output_contains "Usage:"
  assert_output_contains "--dry-run"
  assert_output_contains "--check"
}

@test "install-deps: --dry-run prints [dry-run] commands and exits 0" {
  # Isolate PATH to a near-empty dir so every tool is reported as missing,
  # guaranteeing at least one `[dry-run]` install line. Without isolation the
  # test would pass on any dev machine with jq already installed, even if the
  # per-tool dry-run printing were removed.
  local isolated_bin="$BATS_TEST_TMPDIR/isolated-bin"
  mkdir -p "$isolated_bin"
  # `bash` needs to be callable to run the script. `uname` must report a
  # supported OS so we don't hit the "unsupported OS" exit.
  ln -sf /bin/bash "$isolated_bin/bash"
  cat >"$isolated_bin/uname" <<'EOF'
#!/bin/sh
echo Darwin
EOF
  chmod +x "$isolated_bin/uname"

  run env -i PATH="$isolated_bin" HOME="$HOME" bash "$SCRIPT" --dry-run

  assert_success
  assert_output_contains "dry-run mode"
  assert_output_contains "[dry-run]"
}

@test "install-deps: --check reports status without side effects" {
  run bash "$SCRIPT" --check

  # Exit 0 if every tool present, 1 if anything missing. Both are valid.
  assert_success || assert_status 1
  # Each tool is reported as either OK: or MISSING:.
  case "$output" in
    *"OK: jq"* | *"MISSING: jq"*) ;;
    *) printf 'expected OK: jq or MISSING: jq in output\n' >&2; false ;;
  esac
}

@test "install-deps: unknown flag exits 2" {
  run bash "$SCRIPT" --nonsense

  assert_status 2
  assert_output_contains "unknown option"
}

@test "install-deps: unsupported OS exits 1" {
  # Prepend a fake uname that reports a bogus OS.
  local fake_bin="$BATS_TEST_TMPDIR/bin"
  mkdir -p "$fake_bin"
  cat >"$fake_bin/uname" <<'EOF'
#!/bin/sh
echo BogusOS
EOF
  chmod +x "$fake_bin/uname"

  run env PATH="$fake_bin:$PATH" bash "$SCRIPT" --check

  assert_status 1
  assert_output_contains "unsupported OS"
}
