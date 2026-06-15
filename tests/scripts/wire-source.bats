#!/usr/bin/env bats
# Tests for scripts/wire-source.sh — registering a project as a docs-only source.
#
# Behavior under test:
#   - add registers a wired_sources record (docs-only globs, vault auto-excluded)
#     and runs the initial pull into raw/wired/<name>/.
#   - Source code and the vault's own files are never snapshotted.
#   - add is idempotent on name and preserves lastSyncedCommit on re-add.
#   - A non-git path is refused (exit 1).

load '../test_helper/common'

setup() {
  _load_helpers
  PROJ="$BATS_TEST_TMPDIR/proj"
  VAULT="$PROJ/docs/vault"
  mkdir -p "$VAULT/raw" "$VAULT/wiki" "$PROJ/docs/guides" "$PROJ/src"
  printf '%s\n' '---' 'schema_version: 2' '---' >"$VAULT/CLAUDE.md"
  printf '# Project\n' >"$PROJ/README.md"
  printf '# Guide\n' >"$PROJ/docs/guides/guide.md"
  printf 'code\n' >"$PROJ/src/app.ts"
  printf '# vault page\n' >"$VAULT/wiki/page.md"
  git -C "$PROJ" init -q
  git -C "$PROJ" -c user.name=t -c user.email=t@t -c commit.gpgsign=false add -A
  git -C "$PROJ" -c user.name=t -c user.email=t@t -c commit.gpgsign=false commit -qm init --no-verify
  SETTINGS="$PROJ/.claude/claude-wiki-pages/settings.json"
}

run_wire() {
  run bash -c "cd '$PROJ'; export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS' CLAUDE_WIKI_PAGES_VAULT='docs/vault'; bash '$REPO_ROOT/scripts/wire-source.sh' $*"
}

@test "wire-source: add registers the record and pulls docs-only snapshots" {
  run_wire add --name proj --path . --vault docs/vault
  assert_success
  assert_output_contains "WIRED: proj"
  assert_output_contains "PULLED: proj 2 new snapshot(s)"
  [ -f "$VAULT/raw/wired/proj/README.md" ]
  [ -f "$VAULT/raw/wired/proj/docs/guides/guide.md" ]
  # source code and the vault's own pages are never snapshotted
  [ ! -e "$VAULT/raw/wired/proj/src" ]
  run bash -c "find '$VAULT/raw/wired' -name 'page.md' -o -name 'CLAUDE.md' | wc -l"
  assert_output_contains "0"
}

@test "wire-source: record carries docs-only globs and the vault exclude" {
  run_wire add --name proj --path . --vault docs/vault
  assert_success
  run bun -e "const w=JSON.parse(require('fs').readFileSync('$SETTINGS','utf8')).wired_sources[0]; const b=(x)=>x?'True':'False'; console.log([w.name, b(w.exclude.includes('docs/vault/**')), b(w.include.includes('README*')), b(Boolean(w.lastSyncedCommit))].join(' '))"
  assert_output_contains "proj True True True"
}

@test "wire-source: re-add is idempotent and preserves lastSyncedCommit" {
  run_wire add --name proj --path . --vault docs/vault
  assert_success
  before=$(bun -e "console.log(JSON.parse(require('fs').readFileSync('$SETTINGS','utf8')).wired_sources[0].lastSyncedCommit)")
  run_wire add --name proj --path . --vault docs/vault
  assert_success
  run bun -e "const d=JSON.parse(require('fs').readFileSync('$SETTINGS','utf8')); console.log(d.wired_sources.length, d.wired_sources[0].lastSyncedCommit)"
  assert_output_contains "1 $before"
}

@test "wire-source: refuses a path that is not a git work tree" {
  local bare="$BATS_TEST_TMPDIR/not-a-repo"
  mkdir -p "$bare"
  run bash -c "cd '$PROJ'; export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS'; bash '$REPO_ROOT/scripts/wire-source.sh' add --name x --path '$bare' --vault docs/vault"
  assert_status 1
  assert_output_contains "not a git work tree"
}
