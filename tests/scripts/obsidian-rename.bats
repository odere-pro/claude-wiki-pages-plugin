#!/usr/bin/env bats
# Tests for scripts/obsidian-rename.sh — backlink-safe rename via Obsidian CLI.
#
# Behavior under test:
#   - With a working `obsidian` stub: renames, passes --vault (guard), exit 0.
#   - Without the CLI: exit 3 + the exact [skip] cli-rename marker.
#   - Stub that "succeeds" but does not move the file → post-condition → exit 3.
#   - Usage errors (missing args, --from absent, traversal, non-wiki path,
#     --to collision) → exit 2, never a blind fallback signal.

load '../test_helper/common'

setup() {
  _load_helpers
  PROJ="$BATS_TEST_TMPDIR/proj"
  VAULT="$PROJ/vault"
  mkdir -p "$VAULT/wiki/topics"
  printf '%s\n' '---' 'schema_version: 2' '---' >"$VAULT/CLAUDE.md"
  printf '%s\n' '---' 'title: Old Page' '---' 'body' >"$VAULT/wiki/topics/old-page.md"

  # Sandbox PATH with core tools but no `obsidian` (doctor.bats pattern).
  SANDBOX_BIN="$BATS_TEST_TMPDIR/sandbox-bin"
  mkdir -p "$SANDBOX_BIN"
  for tool in bash dirname basename find grep sed sort head cat cp mv mkdir rm jq git awk tr wc env date printf; do
    real="$(command -v "$tool")" || continue
    case "$real" in
      /*) ln -s "$real" "$SANDBOX_BIN/$tool" ;;
    esac
  done
}

run_rename() {
  run bash -c "cd '$PROJ'; export PATH='$SANDBOX_BIN'; export CLAUDE_WIKI_PAGES_VAULT='$VAULT'; bash '$REPO_ROOT/scripts/obsidian-rename.sh' $*"
}

# A stub `obsidian` that records its argv and actually performs the move,
# emulating app.fileManager.renameFile.
install_working_stub() {
  cat >"$SANDBOX_BIN/obsidian" <<STUB
#!/bin/bash
printf '%s\n' "\$@" >>"$BATS_TEST_TMPDIR/obsidian-argv"
vault=""
code=""
while [ \$# -gt 0 ]; do
  case "\$1" in
    --vault) vault="\$2"; shift 2 ;;
    code=*) code="\${1#code=}"; shift ;;
    eval) shift ;;
    *) shift ;;
  esac
done
from=\$(printf '%s' "\$code" | sed -n 's/.*getAbstractFileByPath("\([^"]*\)").*/\1/p')
to=\$(printf '%s' "\$code" | sed -n 's/.*, *"\([^"]*\)")\$/\1/p')
mkdir -p "\$vault/\$(dirname "\$to")"
mv "\$vault/\$from" "\$vault/\$to"
STUB
  chmod +x "$SANDBOX_BIN/obsidian"
}

# A stub that exits 0 but moves nothing (CLI lies / app ignored the call).
install_noop_stub() {
  printf '#!/bin/bash\nexit 0\n' >"$SANDBOX_BIN/obsidian"
  chmod +x "$SANDBOX_BIN/obsidian"
}

@test "Backlink-safe rename: renames via the CLI, passing --vault, and exits 0" {
  install_working_stub
  run_rename --from wiki/topics/old-page.md --to wiki/topics/new-page.md
  assert_success
  assert_output_contains "RENAMED: wiki/topics/old-page.md -> wiki/topics/new-page.md"
  [ -f "$VAULT/wiki/topics/new-page.md" ]
  [ ! -e "$VAULT/wiki/topics/old-page.md" ]
  # obsidian-vault guard: the call carried the resolved vault explicitly.
  run cat "$BATS_TEST_TMPDIR/obsidian-argv"
  assert_output_contains "--vault"
  assert_output_contains "$VAULT"
}

@test "Backlink-safe rename: exits 3 with the exact skip marker when the CLI is absent" {
  run_rename --from wiki/topics/old-page.md --to wiki/topics/new-page.md
  assert_status 3
  assert_output_contains "[skip] cli-rename: obsidian-cli unavailable"
  [ -f "$VAULT/wiki/topics/old-page.md" ] # untouched
}

@test "Backlink-safe rename: a post-condition check exits 3 when the CLI succeeds but the file did not move" {
  install_noop_stub
  run_rename --from wiki/topics/old-page.md --to wiki/topics/new-page.md
  assert_status 3
  assert_output_contains "[skip] cli-rename:"
  [ -f "$VAULT/wiki/topics/old-page.md" ]
}

@test "Backlink-safe rename: usage errors exit 2 — missing args, absent --from, traversal, non-wiki, and collision" {
  install_working_stub
  run_rename --from wiki/topics/old-page.md
  assert_status 2
  run_rename --from wiki/topics/missing.md --to wiki/topics/x.md
  assert_status 2
  run_rename --from wiki/topics/old-page.md --to ../escape.md
  assert_status 2
  run_rename --from wiki/topics/old-page.md --to raw/not-allowed.md
  assert_status 2
  printf 'x\n' >"$VAULT/wiki/topics/taken.md"
  run_rename --from wiki/topics/old-page.md --to wiki/topics/taken.md
  assert_status 2
}

@test "Backlink-safe rename: realpath confinement blocks wiki/-prefixed traversal such as ../../escape" {
  # H03 regression guard: a path like wiki/../../escape.md starts with wiki/
  # so a string-glob check would pass it, but realpath confinement must reject
  # it because its canonical target escapes vault/wiki/.
  install_working_stub
  run_rename --from wiki/topics/old-page.md --to wiki/../../escape.md
  assert_status 2
  assert_output_contains "escapes the vault"
  # Absolute path shorthand must also be blocked.
  run_rename --from wiki/topics/old-page.md --to /tmp/escape.md
  assert_status 2
}

# ── N18-obsidian-rename: strict mode must include -e ────────────────────────
# Without set -e a failing command mid-sequence (e.g. a failing jq call or a
# failed vault resolution) is silently swallowed and execution continues with
# invalid state — a classic insecure-configuration vulnerability.
# This test will FAIL until set -euo pipefail replaces set -uo pipefail.
@test "Backlink-safe rename: the script source declares set -euo pipefail for strict mode with -e" { # spec N18
  # Static structural check: grep for the full strict-mode line.
  run grep -q 'set -euo pipefail' "$REPO_ROOT/scripts/obsidian-rename.sh"
  assert_success
}
