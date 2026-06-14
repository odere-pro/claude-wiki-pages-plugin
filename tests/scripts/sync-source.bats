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

@test "sync-source: status reports zero right after wiring" {
  run_script sync-source.sh status
  assert_success
  assert_output_contains "WIRED-CHANGES: proj 0"
}

@test "sync-source: status counts a changed doc, ignores changed source code" {
  printf '\nmore docs\n' >>"$PROJ/README.md"
  printf 'more code\n' >>"$PROJ/src/app.ts"
  proj_commit "upstream change"
  run_script sync-source.sh status
  assert_success
  assert_output_contains "WIRED-CHANGES: proj 1"
  assert_output_contains "README.md"
  refute_output_contains "app.ts"
}

@test "sync-source: pull writes a versioned sibling, never overwrites" {
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

@test "sync-source: re-pull is idempotent (content dedup, no new snapshots)" {
  printf '\nmore docs\n' >>"$PROJ/README.md"
  proj_commit "upstream change"
  run_script sync-source.sh pull --name proj
  run_script sync-source.sh pull --name proj
  assert_success
  assert_output_contains "PULLED: proj 0 new snapshot(s)"
}

@test "sync-source: pull advances lastSyncedCommit to HEAD" {
  printf '\nmore docs\n' >>"$PROJ/README.md"
  proj_commit "upstream change"
  run_script sync-source.sh pull --name proj
  assert_success
  head_sha=$(git -C "$PROJ" rev-parse HEAD)
  run python3 -c "import json; print(json.load(open('$SETTINGS'))['wired_sources'][0]['lastSyncedCommit'])"
  assert_output_contains "$head_sha"
}

@test "sync-source: unknown --name exits 1 with a clear error" {
  run_script sync-source.sh pull --name nope
  assert_status 1
  assert_output_contains "not registered"
}

@test "sync-source: M15 — a '|' in a wired field fails closed (no corrupt record split)" {
  # Tamper the stored record so a field carries the reserved '|' delimiter.
  # wired_read must refuse it rather than emit an ambiguous positional record.
  python3 -c "
import json
d = json.load(open('$SETTINGS'))
d['wired_sources'][0]['path'] = '/tmp/ev|il'
json.dump(d, open('$SETTINGS', 'w'))
"
  run_script sync-source.sh status
  assert_status 1
  assert_output_contains "reserved record delimiter"
}
