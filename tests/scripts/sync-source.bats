#!/usr/bin/env bats
# Tests for scripts/sync-source.sh — wired-source change detection and pull.
#
# Behavior under test:
#   - status counts changed docs since lastSyncedCommit (git-diff based),
#     filtered by the docs-only include/exclude globs.
#   - pull snapshots a changed doc as a NEW versioned sibling — never
#     overwrites an existing raw/ file (raw immutability).
#   - Identical content is deduped (sha256-12); re-pull is a no-op.
#   - pull advances lastSyncedCommit to the wired repo's HEAD.

load '../test_helper/common'

setup() {
  _load_helpers
  PROJ="$BATS_TEST_TMPDIR/proj"
  VAULT="$PROJ/docs/vault"
  mkdir -p "$VAULT/raw" "$VAULT/wiki" "$PROJ/src"
  printf '%s\n' '---' 'schema_version: 2' '---' >"$VAULT/CLAUDE.md"
  printf '# Project\n' >"$PROJ/README.md"
  printf 'code\n' >"$PROJ/src/app.ts"
  git -C "$PROJ" init -q
  proj_commit init
  SETTINGS="$PROJ/.claude/claude-wiki-pages/settings.json"
  # Wire (includes the initial pull of README.md).
  run_script wire-source.sh add --name proj --path . --vault docs/vault
}

proj_commit() {
  git -C "$PROJ" -c user.name=t -c user.email=t@t -c commit.gpgsign=false add -A
  git -C "$PROJ" -c user.name=t -c user.email=t@t -c commit.gpgsign=false commit -qm "$1" --no-verify
}

run_script() {
  local script="$1"
  shift
  run bash -c "cd '$PROJ'; export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS' CLAUDE_WIKI_PAGES_VAULT='docs/vault'; bash '$REPO_ROOT/scripts/$script' $*"
}

@test "Source sync: status reports zero pending changes right after wiring" {
  run_script sync-source.sh status
  assert_success
  assert_output_contains "WIRED-CHANGES: proj 0"
}

@test "Source sync: status counts a changed doc but ignores changed source code" {
  printf '\nmore docs\n' >>"$PROJ/README.md"
  printf 'more code\n' >>"$PROJ/src/app.ts"
  proj_commit "upstream change"
  run_script sync-source.sh status
  assert_success
  assert_output_contains "WIRED-CHANGES: proj 1"
  assert_output_contains "README.md"
  refute_output_contains "app.ts"
}

@test "Source sync: pull writes a versioned sibling and never overwrites the original" {
  original_sum=$(shasum -a 256 "$VAULT/raw/wired/proj/README.md")
  printf '\nmore docs\n' >>"$PROJ/README.md"
  proj_commit "upstream change"
  run_script sync-source.sh pull --name proj
  assert_success
  assert_output_contains "PULLED: proj 1 new snapshot(s)"
  # original snapshot untouched
  echo "$original_sum" | shasum -a 256 -c - >/dev/null
  # versioned sibling exists alongside it
  run bash -c "ls '$VAULT/raw/wired/proj/' | grep -c 'README--'"
  assert_output_contains "1"
}

@test "Source sync: re-pull is idempotent, deduplicating content and adding no new snapshots" {
  printf '\nmore docs\n' >>"$PROJ/README.md"
  proj_commit "upstream change"
  run_script sync-source.sh pull --name proj
  run_script sync-source.sh pull --name proj
  assert_success
  assert_output_contains "PULLED: proj 0 new snapshot(s)"
}

@test "Source sync: pull advances lastSyncedCommit to HEAD" {
  printf '\nmore docs\n' >>"$PROJ/README.md"
  proj_commit "upstream change"
  run_script sync-source.sh pull --name proj
  assert_success
  head_sha=$(git -C "$PROJ" rev-parse HEAD)
  run bun -e "console.log(JSON.parse(require('fs').readFileSync('$SETTINGS','utf8')).wired_sources[0].lastSyncedCommit)"
  assert_output_contains "$head_sha"
}

@test "Source sync: an unknown --name exits 1 with a clear error" {
  run_script sync-source.sh pull --name nope
  assert_status 1
  assert_output_contains "not registered"
}

@test "Source sync: pull confines writes to DEST_ROOT so a symlinked dest dir cannot redirect a copy outside the vault" { # spec M31
  # The REACHABLE traversal vector is a symlink, not a '..' rel path: git itself
  # refuses to track an index entry whose path contains '..' (git update-index
  # --cacheinfo / checkout reject it), so a git-derived rel can never carry '..'.
  # The confinement that matters is therefore the physical-path (pwd -P) re-check
  # AFTER mkdir: a dest subdir that is (or becomes) a symlink pointing outside
  # DEST_ROOT must not let a copied doc escape the vault.
  DEST_ROOT="$VAULT/raw/wired/proj"
  OUTSIDE="$BATS_TEST_TMPDIR/outside"
  mkdir -p "$OUTSIDE"

  # A doc under docs/ (matched by the default docs-only "docs/**" glob), pulled
  # once so DEST_ROOT/docs/ exists for real.
  mkdir -p "$PROJ/docs"
  printf '# note\n' >"$PROJ/docs/note.md"
  proj_commit "add docs/note.md"
  run_script sync-source.sh pull --name proj
  assert_success
  [ -f "$DEST_ROOT/docs/note.md" ]

  # Sabotage: replace the real dest subdir with a symlink pointing OUTSIDE the
  # vault (the adversarial-state a prior compromise could leave behind).
  rm -rf "$DEST_ROOT/docs"
  ln -s "$OUTSIDE" "$DEST_ROOT/docs"

  # Change the doc upstream and pull again. The physical-path confinement must
  # detect that DEST_ROOT/docs resolves outside DEST_ROOT and skip the entry —
  # writing nothing into OUTSIDE.
  printf '\nmore\n' >>"$PROJ/docs/note.md"
  proj_commit "change docs/note.md"
  run_script sync-source.sh pull --name proj
  assert_success

  # Nothing escaped into OUTSIDE.
  run bash -c "ls -A '$OUTSIDE'"
  assert_output_empty
}

@test "Source sync: pull exits non-zero rather than silently when the vault directory is missing" { # spec N18
  # Guard: set -euo pipefail (with -e) must propagate the hard failure when
  # the registered vault path no longer exists. Without -e the script would
  # swallow the mkdir-p failure and report success while doing nothing useful.
  bun -e "
const fs = require('fs');
const d = JSON.parse(fs.readFileSync('$SETTINGS', 'utf8'));
d.current_vault_path = '$PROJ/does-not-exist';
if (d.wired_sources && d.wired_sources[0]) {
  d.wired_sources[0].vault = '$PROJ/does-not-exist';
}
fs.writeFileSync('$SETTINGS', JSON.stringify(d));
"
  run bash -c "cd '$PROJ'; export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS' CLAUDE_WIKI_PAGES_VAULT='$PROJ/does-not-exist'; bash '$REPO_ROOT/scripts/sync-source.sh' pull --name proj"
  assert_status 1
  assert_output_contains "ERROR"
}

@test "Source sync: a '|' in a wired field fails closed and never corrupts the record split" { # spec M15
  # Tamper the stored record so a field carries the reserved '|' delimiter.
  # wired_read must refuse it rather than emit an ambiguous positional record.
  bun -e "
const fs = require('fs');
const d = JSON.parse(fs.readFileSync('$SETTINGS', 'utf8'));
d.wired_sources[0].path = '/tmp/ev|il';
fs.writeFileSync('$SETTINGS', JSON.stringify(d));
"
  run_script sync-source.sh status
  assert_status 1
  assert_output_contains "reserved record delimiter"
}
