#!/usr/bin/env bats
# Tests for scripts/scaffold-vault.sh — idempotent vault scaffolding.
#
# Behavior under test:
#   - Creates target directory when missing.
#   - Copies every top-level entry from source when target is empty.
#   - Leaves existing user content untouched (no-clobber).
#   - Running twice produces zero "CREATED:" lines on the second run.
#   - Skips .DS_Store / Thumbs.db filesystem noise.
#   - Emits the contracted stdout lines (CREATED / EXISTS / READY).
#   - Exits 1 on usage error or missing source.
#   - Defaults source to ${CLAUDE_PLUGIN_ROOT:-<repo>}/docs/vault-example.

load '../test_helper/common'

setup() {
  _load_helpers
  # Build a minimal scaffold source inside the per-test tmpdir.
  SRC="$BATS_TEST_TMPDIR/scaffold-src"
  mkdir -p "$SRC/wiki/_sources" "$SRC/wiki/_synthesis" "$SRC/raw" "$SRC/_templates"
  printf 'schema_version: 1\n' >"$SRC/CLAUDE.md"
  printf '# index\n' >"$SRC/wiki/index.md"
  printf 'ok\n' >"$SRC/raw/example.md"
  printf 'template\n' >"$SRC/_templates/concept.md"

  TARGET="$BATS_TEST_TMPDIR/target-vault"
}

@test "scaffold-vault: creates target when missing and copies full tree" {
  run bash "$REPO_ROOT/scripts/scaffold-vault.sh" "$TARGET" "$SRC"

  [ "$status" -eq 0 ]
  [ -f "$TARGET/CLAUDE.md" ]
  [ -d "$TARGET/wiki/_sources" ]
  [ -d "$TARGET/wiki/_synthesis" ]
  [ -d "$TARGET/raw" ]
  [ -d "$TARGET/_templates" ]
  [ -f "$TARGET/wiki/index.md" ]
  [[ "$output" == *"CREATED:"*"/CLAUDE.md"* ]]
  [[ "$output" == *"READY: vault at"* ]]
}

@test "scaffold-vault: is idempotent (second run creates nothing, preserves all)" {
  bash "$REPO_ROOT/scripts/scaffold-vault.sh" "$TARGET" "$SRC" >/dev/null

  run bash "$REPO_ROOT/scripts/scaffold-vault.sh" "$TARGET" "$SRC"

  [ "$status" -eq 0 ]
  # Every top-level entry should now say EXISTS, none CREATED.
  [[ "$output" != *"CREATED:"* ]]
  [[ "$output" == *"EXISTS:"*"/CLAUDE.md"* ]]
  [[ "$output" == *"0 created"* ]]
}

@test "scaffold-vault: never overwrites existing user content" {
  mkdir -p "$TARGET/wiki"
  printf 'user wrote this\n' >"$TARGET/CLAUDE.md"
  printf '# my custom index\n' >"$TARGET/wiki/index.md"

  run bash "$REPO_ROOT/scripts/scaffold-vault.sh" "$TARGET" "$SRC"

  [ "$status" -eq 0 ]
  # Contents must match what the user wrote, not the scaffold template.
  grep -q "user wrote this" "$TARGET/CLAUDE.md"
  grep -q "# my custom index" "$TARGET/wiki/index.md"
  # Missing pieces still get filled in.
  [ -d "$TARGET/_templates" ]
  [ -d "$TARGET/raw" ]
}

@test "scaffold-vault: fills only missing entries when partial vault exists" {
  mkdir -p "$TARGET/wiki"
  printf 'custom\n' >"$TARGET/CLAUDE.md"
  # raw/, _templates/, wiki/_sources/ etc. are absent — script should supply them.

  run bash "$REPO_ROOT/scripts/scaffold-vault.sh" "$TARGET" "$SRC"

  [ "$status" -eq 0 ]
  grep -q "custom" "$TARGET/CLAUDE.md"
  [ -d "$TARGET/raw" ]
  [ -d "$TARGET/_templates" ]
  # The pre-existing wiki/ was kept, so nested children from source did NOT merge.
  # That is an intentional trade-off: top-level no-clobber only.
  [[ "$output" == *"EXISTS:"*"/CLAUDE.md"* ]]
  [[ "$output" == *"EXISTS:"*"/wiki"* ]]
  [[ "$output" == *"CREATED:"*"/raw"* ]]
  [[ "$output" == *"CREATED:"*"/_templates"* ]]
}

@test "scaffold-vault: skips .DS_Store and Thumbs.db noise from source" {
  printf 'junk\n' >"$SRC/.DS_Store"
  printf 'junk\n' >"$SRC/Thumbs.db"

  run bash "$REPO_ROOT/scripts/scaffold-vault.sh" "$TARGET" "$SRC"

  [ "$status" -eq 0 ]
  [ ! -e "$TARGET/.DS_Store" ]
  [ ! -e "$TARGET/Thumbs.db" ]
}

@test "scaffold-vault: exits 1 with no argument" {
  run bash "$REPO_ROOT/scripts/scaffold-vault.sh"

  [ "$status" -eq 1 ]
  [[ "$output" == *"Usage:"* ]]
}

@test "scaffold-vault: exits 1 when source scaffold missing" {
  run bash "$REPO_ROOT/scripts/scaffold-vault.sh" "$TARGET" "$BATS_TEST_TMPDIR/does-not-exist"

  [ "$status" -eq 1 ]
  [[ "$output" == *"source scaffold not found"* ]]
}

@test "scaffold-vault: defaults source to CLAUDE_PLUGIN_ROOT/skills/init/template" {
  # Redirect plugin root at a minimal synthetic scaffold.
  local plugin_root="$BATS_TEST_TMPDIR/plugin-root"
  mkdir -p "$plugin_root/skills/init/template/wiki"
  printf 'schema_version: 1\n' >"$plugin_root/skills/init/template/CLAUDE.md"

  run bash -c "
    export CLAUDE_PLUGIN_ROOT='$plugin_root'
    bash '$REPO_ROOT/scripts/scaffold-vault.sh' '$TARGET'
  "

  [ "$status" -eq 0 ]
  [ -f "$TARGET/CLAUDE.md" ]
  grep -q 'schema_version: 1' "$TARGET/CLAUDE.md"
}

@test "scaffold-vault: real skills/init/template default scaffolds an empty vault" {
  # Use the actual shipped template — proves first-time users get a clean slate,
  # not the demo vault's pages, but DO get the bundled sample source in raw/.
  run bash "$REPO_ROOT/scripts/scaffold-vault.sh" "$TARGET"

  [ "$status" -eq 0 ]
  [ -f "$TARGET/CLAUDE.md" ]
  [ -d "$TARGET/_templates" ]
  [ -d "$TARGET/raw" ]
  [ -d "$TARGET/wiki/_sources" ]
  [ -d "$TARGET/wiki/_synthesis" ]
  [ -f "$TARGET/wiki/index.md" ]
  [ -f "$TARGET/wiki/log.md" ]
  # No demo content from docs/vault-example/ should leak in.
  [ ! -d "$TARGET/wiki/patterns" ]
  [ ! -d "$TARGET/wiki/tools" ]
  [ ! -f "$TARGET/wiki/dashboard.md" ]
  # raw/ holds the bundled sample source (U2 — first run just works).
  [ -f "$TARGET/raw/sample-source.md" ]
  # _sources/ and _synthesis/ are empty of content notes.
  [ -z "$(find "$TARGET/wiki/_sources" -maxdepth 1 -name '*.md' -type f)" ]
  [ -z "$(find "$TARGET/wiki/_synthesis" -maxdepth 1 -name '*.md' -type f)" ]
}

# ── U2 — bundled sample source (Phase U) ──────────────────────────────────────

@test "scaffold-vault: fresh vault raw/ contains the bundled sample source" {
  # TDD: scaffolding an empty /tmp vault seeds raw/ with the bundled sample so a
  # brand-new user can run /claude-wiki-pages:wiki immediately and get a real
  # ingest result without supplying their own source first.
  run bash "$REPO_ROOT/scripts/scaffold-vault.sh" "$TARGET"

  [ "$status" -eq 0 ]
  # raw/ must be non-empty — the bundled sample must be present.
  [ -f "$TARGET/raw/sample-source.md" ]
  # The file must be a real plain-text source, not an empty placeholder.
  [ -s "$TARGET/raw/sample-source.md" ]
}

@test "scaffold-vault: no-clobber — existing raw/ user file is untouched when sample is present" {
  # TDD: if the user already has a file in raw/, scaffold must not overwrite it
  # (no-clobber). The existing scaffold-vault no-clobber covers the top-level
  # raw/ directory entry; this test verifies that a pre-seeded user file inside
  # raw/ is preserved when scaffold is re-run (idempotency).
  # Simulate: run scaffold once (seeds sample-source.md), then add a user file,
  # then run scaffold again — user file must survive unchanged.
  bash "$REPO_ROOT/scripts/scaffold-vault.sh" "$TARGET" >/dev/null
  printf 'my private notes\n' >"$TARGET/raw/my-notes.md"
  local user_content="my private notes"

  run bash "$REPO_ROOT/scripts/scaffold-vault.sh" "$TARGET"

  [ "$status" -eq 0 ]
  # User file must still contain the original content.
  grep -q "$user_content" "$TARGET/raw/my-notes.md"
  # The bundled sample is still there.
  [ -f "$TARGET/raw/sample-source.md" ]
}

@test "scaffold-vault: shipped template passes verify-ingest without further edits" {
  # End-to-end: scaffold from the real default, then run the verifier the
  # onboarding skill calls. This is the regression guard for "first run is
  # error-free" — a future change to the template that breaks the schema
  # fails this test.
  bash "$REPO_ROOT/scripts/scaffold-vault.sh" "$TARGET" >/dev/null

  run bash "$REPO_ROOT/scripts/verify-ingest.sh" --target "$TARGET"

  [ "$status" -eq 0 ]
  [[ "$output" == *"All checks passed"* ]]
}

@test "scaffold-vault: emits READY line with accurate created/preserved counts" {
  # Pre-create two entries so they count as preserved.
  mkdir -p "$TARGET"
  printf 'existing\n' >"$TARGET/CLAUDE.md"
  mkdir -p "$TARGET/wiki"  # pre-existing dir counts as preserved too

  run bash "$REPO_ROOT/scripts/scaffold-vault.sh" "$TARGET" "$SRC"

  [ "$status" -eq 0 ]
  # Source has 4 top-level entries (CLAUDE.md, wiki, raw, _templates).
  # 2 preserved, 2 created.
  [[ "$output" == *"2 created"* ]]
  [[ "$output" == *"2 preserved"* ]]
}

# ── git-required per-vault init (Phase 0, item 6) ─────────────────────────────

@test "scaffold-vault: git-inits the vault when target is not already in a repo" {
  # TARGET is inside BATS_TEST_TMPDIR — which is NOT inside any git work tree —
  # so the nesting guard must not skip git init.
  run bash "$REPO_ROOT/scripts/scaffold-vault.sh" "$TARGET" "$SRC"

  [ "$status" -eq 0 ]
  # Vault must be a git work tree after scaffolding.
  git -C "$TARGET" rev-parse --is-inside-work-tree
  # Must have at least one commit (the initial vault commit).
  local commit_count
  commit_count="$(git -C "$TARGET" rev-list --count HEAD 2>/dev/null)"
  [ "$commit_count" -ge 1 ]
  # READY line must acknowledge git state.
  [[ "$output" == *"git=initialised"* ]]
}

@test "scaffold-vault: does NOT nest a new git repo when target is already inside a work tree" {
  # Scaffold into a subdirectory of the plugin repo itself — which IS already
  # a git work tree.  The nesting guard must detect this and skip git init,
  # so the .git directory comes from the plugin repo, not from a fresh init.
  local NESTED_TARGET="$BATS_TEST_TMPDIR/nested-inside-repo"
  # We cannot put TARGET inside the plugin repo without polluting the
  # working tree, so instead we init a throwaway outer repo and nest inside.
  local OUTER_REPO="$BATS_TEST_TMPDIR/outer-repo"
  git init -q "$OUTER_REPO"
  git -C "$OUTER_REPO" config user.email "test@example.com"
  git -C "$OUTER_REPO" config user.name "Test"
  git -C "$OUTER_REPO" config commit.gpgsign false
  printf 'init\n' >"$OUTER_REPO/README.md"
  git -C "$OUTER_REPO" add -A
  git -C "$OUTER_REPO" -c commit.gpgsign=false commit -q -m "init"

  NESTED_TARGET="$OUTER_REPO/vault"
  mkdir -p "$NESTED_TARGET"

  run bash "$REPO_ROOT/scripts/scaffold-vault.sh" "$NESTED_TARGET" "$SRC"

  [ "$status" -eq 0 ]
  # No .git inside the nested target — it is covered by the outer repo.
  [ ! -d "$NESTED_TARGET/.git" ]
  # READY line acknowledges git was skipped.
  [[ "$output" == *"git=skipped(already-in-repo)"* ]]
}

@test "scaffold-vault: bun-absent fallback git-inits the vault via the bash shim" {
  # Prove the bun-absent shim (the bash `git init` fallback in scaffold-vault.sh)
  # still produces a git repo. We build a hermetic sandbox PATH that resolves
  # git/coreutils/find but deliberately omits bun, so `command -v bun` fails and
  # the script must take the fallback branch — never the engine path.
  local SANDBOX_BIN="$BATS_TEST_TMPDIR/sandbox-bin"
  mkdir -p "$SANDBOX_BIN"
  # Symlink only the binaries the script needs; bun is intentionally excluded.
  # Resolve each tool to its real absolute path; skip if it cannot be located
  # absolutely (e.g. an interactive shell shadows it with a function), so we
  # never create a self-referential symlink that silently breaks the sandbox.
  local tool real
  for tool in git find dirname basename cp mkdir sort; do
    real="$(command -v "$tool")"
    case "$real" in
      /*) ln -s "$real" "$SANDBOX_BIN/$tool" ;;
      *) skip "cannot resolve absolute path for required tool: $tool ($real)" ;;
    esac
  done
  # Sanity: bun must NOT resolve under the sandbox PATH (else this proves nothing).
  if PATH="$SANDBOX_BIN" command -v bun >/dev/null 2>&1; then
    fail "bun leaked into sandbox PATH — fallback branch not exercised"
  fi

  # Run with the sandbox PATH only. `bash` is invoked by absolute path so we do
  # not need it on PATH; the script's own `command -v bun` resolves against the
  # PATH we export here, which has no bun → fallback branch.
  run env -i PATH="$SANDBOX_BIN" HOME="$HOME" \
    /bin/bash "$REPO_ROOT/scripts/scaffold-vault.sh" "$TARGET" "$SRC"

  [ "$status" -eq 0 ]
  # The bash fallback must have created a real git work tree...
  git -C "$TARGET" rev-parse --is-inside-work-tree
  # ...with at least one commit (the initial vault commit from the shim).
  local commit_count
  commit_count="$(git -C "$TARGET" rev-list --count HEAD 2>/dev/null)"
  [ "$commit_count" -ge 1 ]
  # READY line reports the same git=initialised contract as the engine path.
  [[ "$output" == *"git=initialised"* ]]
}
