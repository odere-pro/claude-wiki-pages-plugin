# tests/test_helper/common.bash
# Shared helpers for Bats tests.
#
# Required libraries under tests/test_helper/ (NOT checked into the repo —
# cloned by .github/workflows/ci.yml via `git clone --depth 1 …`):
#
#   tests/test_helper/bats-support/
#   tests/test_helper/bats-assert/
#   tests/test_helper/bats-file/
#
# For local runs, clone them with:
#
#   mkdir -p tests/test_helper
#   for h in bats-support bats-assert bats-file; do
#     [ -d "tests/test_helper/$h" ] || \
#       git clone --depth 1 "https://github.com/bats-core/${h}.git" "tests/test_helper/${h}"
#   done
#
# Then in each .bats file:
#
#   load '../test_helper/common'

# Resolve the repo root from any test's location.
# This file lives at: tests/test_helper/common.bash
# Repo root is two directories up.
if [ -z "${REPO_ROOT:-}" ]; then
  REPO_ROOT="$(cd "${BATS_TEST_DIRNAME:-$(dirname "${BASH_SOURCE[0]}")}/../.." && pwd)"
  export REPO_ROOT
fi

export SCRIPTS_DIR="$REPO_ROOT/scripts"
export FIXTURES_DIR="$REPO_ROOT/tests/fixtures"
export MINIMAL_VAULT_SRC="$FIXTURES_DIR/minimal-vault"
export JSON_FIXTURES_DIR="$FIXTURES_DIR/json"

# Load bats assertion helpers if present. Tests that call `assert_*` require
# these. Tests that only check `status` and `output` do not.
_load_helpers() {
  local helper
  for helper in bats-support bats-assert bats-file; do
    if [ -d "$REPO_ROOT/tests/test_helper/$helper" ]; then
      # shellcheck disable=SC1090
      load "$REPO_ROOT/tests/test_helper/$helper/load"
    fi
  done
}

# -----------------------------------------------------------------------------
# Fixture helpers
# -----------------------------------------------------------------------------

# Copy the canonical minimal-vault fixture to a throwaway directory and export
# $FIXTURE_VAULT pointing to it. Tests mutate the copy, never the source.
setup_fixture_vault() {
  FIXTURE_VAULT="$(mktemp -d "${BATS_TEST_TMPDIR:-/tmp}/fixture-vault.XXXXXX")"
  # cp -R copies directory contents recursively. Add trailing /. so hidden
  # files (if any) come along on both BSD and GNU cp.
  cp -R "$MINIMAL_VAULT_SRC/." "$FIXTURE_VAULT/"
  export FIXTURE_VAULT
}

# Clean the copied fixture vault.
teardown_fixture_vault() {
  if [ -n "${FIXTURE_VAULT:-}" ] && [ -d "$FIXTURE_VAULT" ]; then
    rm -rf "$FIXTURE_VAULT"
  fi
  unset FIXTURE_VAULT
}

# -----------------------------------------------------------------------------
# Isolated-repo helper (for validate-docs.sh tests)
# -----------------------------------------------------------------------------

# Create a throwaway git repo that mirrors the subset of the real tree
# validate-docs.sh touches. The script depends on `git ls-files` returning
# real files, so we init a repo and commit.
#
# Copies: scripts/ docs/ skills/ agents/ .claude-plugin/ README.md CLAUDE.md
# Exports: $ISOLATED_REPO
setup_isolated_repo() {
  ISOLATED_REPO="$(mktemp -d "${BATS_TEST_TMPDIR:-/tmp}/isolated-repo.XXXXXX")"
  # Copy the top-level items validate-docs.sh inspects.
  local item
  for item in scripts docs skills agents .claude-plugin README.md CLAUDE.md; do
    if [ -e "$REPO_ROOT/$item" ]; then
      cp -R "$REPO_ROOT/$item" "$ISOLATED_REPO/"
    fi
  done

  (
    cd "$ISOLATED_REPO" || exit 1
    git init -q
    git config user.email "test@example.com"
    git config user.name "Test"
    # Disable commit signing and hooks for isolated test repos. The real
    # repo may have signing configured globally (e.g. 1Password), which
    # fails inside Bats's tmpdir.
    git config commit.gpgsign false
    git config tag.gpgsign false
    git config core.hooksPath /dev/null
    git add -A
    git commit -q -m "init"
  )

  export ISOLATED_REPO
}

teardown_isolated_repo() {
  if [ -n "${ISOLATED_REPO:-}" ] && [ -d "$ISOLATED_REPO" ]; then
    rm -rf "$ISOLATED_REPO"
  fi
  unset ISOLATED_REPO
}

# Add, stage, and commit a file inside $ISOLATED_REPO so `git ls-files`
# picks it up. Arguments: <relative-path> <content>.
commit_file_in_isolated_repo() {
  local rel="$1"
  local content="$2"
  local abs="$ISOLATED_REPO/$rel"
  mkdir -p "$(dirname "$abs")"
  # Use printf %b to interpret \n escapes consistently across BSD/GNU.
  printf '%b' "$content" >"$abs"
  (
    cd "$ISOLATED_REPO" || exit 1
    git add -- "$rel"
    git commit -q -m "add $rel"
  )
}

# -----------------------------------------------------------------------------
# Hook-invocation helper
# -----------------------------------------------------------------------------

# Pipe a JSON blob to a hook script and capture stdout, stderr, and exit code.
#
# Usage:
#   run_hook_with_json "scripts/protect-raw.sh" "$JSON_FIXTURES_DIR/write-to-raw.json"
#   run_hook_with_json "scripts/protect-raw.sh" <(echo "$json_string")
#
# Populates Bats's $status and $output via the built-in `run`.
run_hook_with_json() {
  local script="$1"
  local json_file="$2"

  # Resolve to absolute path if relative.
  case "$script" in
    /*) ;;
    *) script="$REPO_ROOT/$script" ;;
  esac

  run bash -c "cat '$json_file' | bash '$script'"
}

# Like run_hook_with_json but takes a JSON string instead of a file path.
run_hook_with_json_string() {
  local script="$1"
  local json="$2"

  case "$script" in
    /*) ;;
    *) script="$REPO_ROOT/$script" ;;
  esac

  run bash -c "printf '%s' \"\$json\" | bash '$script'" json="$json"
}
