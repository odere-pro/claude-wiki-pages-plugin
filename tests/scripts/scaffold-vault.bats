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

@test "scaffold-vault: defaults source to CLAUDE_PLUGIN_ROOT/skills/llm-wiki/template" {
  # Redirect plugin root at a minimal synthetic scaffold.
  local plugin_root="$BATS_TEST_TMPDIR/plugin-root"
  mkdir -p "$plugin_root/skills/llm-wiki/template/wiki"
  printf 'schema_version: 1\n' >"$plugin_root/skills/llm-wiki/template/CLAUDE.md"

  run bash -c "
    export CLAUDE_PLUGIN_ROOT='$plugin_root'
    bash '$REPO_ROOT/scripts/scaffold-vault.sh' '$TARGET'
  "

  [ "$status" -eq 0 ]
  [ -f "$TARGET/CLAUDE.md" ]
  grep -q 'schema_version: 1' "$TARGET/CLAUDE.md"
}

@test "scaffold-vault: real skills/llm-wiki/template default scaffolds an empty vault" {
  # Use the actual shipped template (no sample content) — proves first-time
  # users get a clean slate, not the demo vault's pages.
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
  # raw/ holds no ingested sources — only its placeholder.
  [ -z "$(find "$TARGET/raw" -maxdepth 1 -name '*.md' -type f)" ]
  # _sources/ and _synthesis/ are empty of content notes.
  [ -z "$(find "$TARGET/wiki/_sources" -maxdepth 1 -name '*.md' -type f)" ]
  [ -z "$(find "$TARGET/wiki/_synthesis" -maxdepth 1 -name '*.md' -type f)" ]
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
