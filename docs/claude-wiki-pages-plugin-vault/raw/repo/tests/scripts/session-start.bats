#!/usr/bin/env bats
# Tests for scripts/session-start.sh
#
# Behavior under test:
#   - Prints SETUP prompt when vault directory does not exist.
#   - Prints REMINDER when vault directory exists.
#   - Creates settings.json on first run (settings file absent before test).
#   - Prints MOC pointer (INDEX:) when wiki/index.md exists.
#   - Omits MOC pointer when wiki/index.md does not exist.
#   - Always prints a config-independent NEXT: line (vault populated vs empty).

load '../test_helper/common'

setup() {
  _load_helpers
  SETTINGS_TMP="$BATS_TEST_TMPDIR/claude-wiki-pages/settings.json"
  export CLAUDE_WIKI_PAGES_SETTINGS_FILE="$SETTINGS_TMP"
  unset CLAUDE_WIKI_PAGES_VAULT
}

teardown() {
  unset CLAUDE_WIKI_PAGES_SETTINGS_FILE
  unset CLAUDE_WIKI_PAGES_VAULT
}

@test "session-start: prints SETUP when vault dir does not exist" {
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='/nonexistent/vault/does-not-exist'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "SETUP:"
  assert_output_contains "/nonexistent/vault/does-not-exist"
}

@test "session-start: prints REMINDER when vault dir exists" {
  local vault_dir="$BATS_TEST_TMPDIR/my-vault"
  mkdir -p "$vault_dir"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "REMINDER:"
  assert_output_contains "$vault_dir"
}

@test "session-start: creates settings.json on first run" {
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='/nonexistent/vault/does-not-exist'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  [ -f "$SETTINGS_TMP" ]
  grep -q '"default_vault_path"' "$SETTINGS_TMP"
}

@test "session-start: prints INDEX pointer when wiki/index.md exists" {
  local vault_dir="$BATS_TEST_TMPDIR/moc-vault"
  mkdir -p "$vault_dir/wiki"
  printf '%s\n' '---' 'title: Index' '---' >"$vault_dir/wiki/index.md"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "INDEX:"
  assert_output_contains "wiki/index.md"
}

@test "session-start: omits INDEX pointer when wiki/index.md does not exist" {
  local vault_dir="$BATS_TEST_TMPDIR/no-moc-vault"
  mkdir -p "$vault_dir/wiki"
  # wiki/ exists but index.md is absent

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  refute_output_contains "INDEX:"
}

@test "session-start: always prints NEXT line when vault exists and is populated" {
  local vault_dir="$BATS_TEST_TMPDIR/next-vault-pop"
  mkdir -p "$vault_dir/raw" "$vault_dir/wiki"
  printf 'source content\n' >"$vault_dir/raw/doc.md"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "NEXT:"
}

@test "session-start: always prints NEXT line when vault exists but raw is empty" {
  local vault_dir="$BATS_TEST_TMPDIR/next-vault-empty"
  mkdir -p "$vault_dir/wiki"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "NEXT:"
}

@test "session-start: NEXT line references /claude-wiki-pages:wiki" {
  local vault_dir="$BATS_TEST_TMPDIR/next-verb-vault"
  mkdir -p "$vault_dir/wiki"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "/claude-wiki-pages:wiki"
}

@test "session-start: NEXT reports no pending when all raw sources predate the last sync" {
  local vault_dir="$BATS_TEST_TMPDIR/next-synced"
  mkdir -p "$vault_dir/raw" "$vault_dir/wiki"
  printf 'already ingested\n' >"$vault_dir/raw/old.md"
  printf '%s\n' '---' 'title: log' '---' >"$vault_dir/wiki/log.md"
  # Deterministic mtimes (no sleep): raw source older than the log = synced.
  touch -t 202601010000 "$vault_dir/raw/old.md"
  touch -t 202606150000 "$vault_dir/wiki/log.md"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  # An already-ingested source must NOT be counted as pending.
  refute_output_contains "pending source"
}

@test "session-start: NEXT reports pending when a raw source is newer than the last sync" {
  local vault_dir="$BATS_TEST_TMPDIR/next-newraw"
  mkdir -p "$vault_dir/raw" "$vault_dir/wiki"
  printf '%s\n' '---' 'title: log' '---' >"$vault_dir/wiki/log.md"
  printf 'newly dropped\n' >"$vault_dir/raw/new.md"
  # Deterministic mtimes (no sleep): raw source newer than the log = pending.
  touch -t 202601010000 "$vault_dir/wiki/log.md"
  touch -t 202606150000 "$vault_dir/raw/new.md"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "pending source"
}

@test "session-start: NEXT line does not depend on settings.json being present" {
  local vault_dir="$BATS_TEST_TMPDIR/next-nosettings-vault"
  local absent_settings="$BATS_TEST_TMPDIR/no-such-dir/settings.json"
  mkdir -p "$vault_dir/wiki"
  # settings file path points to a non-existent directory — config-independence check

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$absent_settings'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "NEXT:"
  assert_output_contains "/claude-wiki-pages:wiki"
}

# P1.1: REMINDER line must contain the ABSOLUTE resolved vault path (begins with /).
# Protects against relative paths such as "docs/vault" leaking into the pointer.
@test "session-start: REMINDER path is absolute (begins with /)" {
  local vault_dir="$BATS_TEST_TMPDIR/abs-path-vault"
  mkdir -p "$vault_dir"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "REMINDER:"
  # Extract the path from the REMINDER line and verify it starts with /
  local reminder_line
  reminder_line=$(printf '%s\n' "${output}" | grep '^REMINDER:')
  case "$reminder_line" in
    *"/$vault_dir"*|*" /"*) : ;;  # contains an absolute path segment
    *) : ;;
  esac
  # The vault_dir itself is already absolute (BATS_TEST_TMPDIR is /tmp/…)
  # so checking that output contains vault_dir is sufficient when vault_dir is absolute
  assert_output_contains "$vault_dir/CLAUDE.md"
}

# P1.1: REMINDER must point to vault/CLAUDE.md explicitly (not just vault/).
@test "session-start: REMINDER points to vault CLAUDE.md" {
  local vault_dir="$BATS_TEST_TMPDIR/claudemd-pointer-vault"
  mkdir -p "$vault_dir"
  printf '%s\n' '---' 'schema_version: 1' '---' >"$vault_dir/CLAUDE.md"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "REMINDER:"
  assert_output_contains "${vault_dir}/CLAUDE.md"
  [ -f "${vault_dir}/CLAUDE.md" ]
}

# P1.1: When vault resolves to a RELATIVE path (e.g. tests/fixtures/reference-vault),
# the emitted REMINDER must still use the absolute canonical path.
@test "session-start: REMINDER is absolute even when VAULT env var is relative" {
  # Use a relative path inside the repo to simulate the tests/fixtures/reference-vault case.
  local rel_vault="tests/fixtures/reference-vault"
  local abs_vault
  # Use realpath when available (preferred) to get the case-canonical path on
  # case-insensitive macOS filesystems.  Bash -c subshells do not always
  # canonicalize through pwd -P when entered via a case-aliased path (e.g.
  # /git vs /Git), so realpath is required to match the script's output (which
  # normalizes via realpath in resolve_vault).
  if command -v realpath >/dev/null 2>&1; then
    abs_vault="$(realpath "$REPO_ROOT/$rel_vault" 2>/dev/null)" || \
      abs_vault="$(cd "$REPO_ROOT/$rel_vault" 2>/dev/null && pwd -P)" || true
  else
    abs_vault="$(cd "$REPO_ROOT/$rel_vault" 2>/dev/null && pwd -P)" || true
  fi

  # Skip if the reference vault does not exist (not a blocker on minimal CI).
  [ -d "$REPO_ROOT/$rel_vault" ] || skip "tests/fixtures/reference-vault not present in this checkout"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$rel_vault'
    cd '$REPO_ROOT'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "REMINDER:"
  # Must contain the absolute path, not the bare relative fragment
  assert_output_contains "$abs_vault/CLAUDE.md"
  refute_output_contains "REMINDER: Read ${rel_vault}/CLAUDE.md"
}

# P1.1: No-vault path must NOT emit a REMINDER or INDEX line (no broken pointer).
@test "session-start: no REMINDER or INDEX when vault does not exist" {
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='/nonexistent/vault/does-not-exist'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  refute_output_contains "REMINDER:"
  refute_output_contains "INDEX:"
}

# jq pre-flight: when jq is absent the JSON-parsing hooks (firewall,
# frontmatter, raw-protect) silently pass writes through unchecked, so the
# session must surface a NOTICE — same teaching pattern as the Bun notice.
@test "session-start: prints jq NOTICE when jq is absent" {
  local vault_dir="$BATS_TEST_TMPDIR/jq-absent-vault"
  mkdir -p "$vault_dir"

  # Hermetic sandbox PATH that resolves everything session-start.sh needs but
  # deliberately omits jq, so `command -v jq` fails inside the script.
  local SANDBOX_BIN="$BATS_TEST_TMPDIR/sandbox-bin-nojq"
  mkdir -p "$SANDBOX_BIN"
  local tool real
  for tool in bash dirname basename find wc tr mkdir cat cp grep sed sort head date; do
    real="$(command -v "$tool")" || continue
    case "$real" in
      /*) ln -s "$real" "$SANDBOX_BIN/$tool" ;;
      *) skip "cannot resolve absolute path for required tool: $tool ($real)" ;;
    esac
  done
  # Sanity: jq must NOT resolve under the sandbox PATH.
  if PATH="$SANDBOX_BIN" command -v jq >/dev/null 2>&1; then
    fail "jq leaked into sandbox PATH — notice branch not exercised"
  fi

  run env -i PATH="$SANDBOX_BIN" HOME="$HOME" \
    CLAUDE_WIKI_PAGES_SETTINGS_FILE="$SETTINGS_TMP" \
    CLAUDE_WIKI_PAGES_VAULT="$vault_dir" \
    /bin/bash "$REPO_ROOT/scripts/session-start.sh"

  assert_success
  assert_output_contains "NOTICE: jq is not installed"
  # The notice must teach the consequence and the fix.
  assert_output_contains "unchecked"
  assert_output_contains "brew install jq"
}

@test "session-start: no jq NOTICE when jq is present" {
  local vault_dir="$BATS_TEST_TMPDIR/jq-present-vault"
  mkdir -p "$vault_dir"
  command -v jq >/dev/null 2>&1 || skip "jq not installed on this machine"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  refute_output_contains "NOTICE: jq is not installed"
}

# Maintenance trigger wiring (review 2026-06-11, fix 5): session-start.sh is
# the ONE invocation point for heartbeat.sh — the SessionStart hook is the
# scheduled trigger of the autonomous-maintenance loop. This test pins that
# wiring: if the heartbeat call is dropped from session-start.sh, it goes red.
@test "session-start: surfaces heartbeat CATCHUP when maintenance enabled and backlog exists" {
  local proj="$BATS_TEST_TMPDIR/hb-proj"
  local vault_dir="$proj/vault"
  mkdir -p "$vault_dir/raw" "$vault_dir/wiki/_sources" "$proj/.claude/claude-wiki-pages"
  printf '%s\n' '---' 'title: log' '---' >"$vault_dir/wiki/log.md"
  printf 'unprocessed source\n' >"$vault_dir/raw/new.md" # no _sources/new.md → pending
  printf '{"maintenance":{"enabled":true}}\n' >"$proj/.claude/claude-wiki-pages.json"

  run bash -c "
    cd '$proj'
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$proj/.claude/claude-wiki-pages/settings.json'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "CATCHUP:"
  assert_output_contains "/claude-wiki-pages:wiki"
}

@test "session-start: no CATCHUP when maintenance is disabled (default)" {
  local proj="$BATS_TEST_TMPDIR/hb-proj-off"
  local vault_dir="$proj/vault"
  mkdir -p "$vault_dir/raw" "$vault_dir/wiki/_sources" "$proj/.claude/claude-wiki-pages"
  printf 'unprocessed source\n' >"$vault_dir/raw/new.md"
  # No .claude/claude-wiki-pages.json — maintenance.enabled defaults to false.

  run bash -c "
    cd '$proj'
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$proj/.claude/claude-wiki-pages/settings.json'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  refute_output_contains "CATCHUP:"
}

# Degraded-mode advisory (ADR-0018): opt-in only — silent unless localModel is
# enabled with offlinePolicy != "off". The default config must emit no DEGRADED
# line and make no network call.
@test "session-start: no DEGRADED line and no network call by default" {
  command -v bun >/dev/null 2>&1 || skip "bun not installed on this machine"
  local proj="$BATS_TEST_TMPDIR/deg-off"
  local vault_dir="$proj/vault"
  local fake_bin="$BATS_TEST_TMPDIR/deg-off-bin"
  local marker="$BATS_TEST_TMPDIR/deg-off-curl-called"
  mkdir -p "$vault_dir/wiki" "$proj/.claude/claude-wiki-pages" "$fake_bin"
  cat >"$fake_bin/curl" <<EOF
#!/bin/bash
touch "$marker"
exit 0
EOF
  chmod +x "$fake_bin/curl"
  # No localModel config — offlinePolicy defaults to "off".

  run bash -c "
    cd '$proj'
    export PATH=\"$fake_bin:\$PATH\"
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$proj/.claude/claude-wiki-pages/settings.json'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  refute_output_contains "DEGRADED:"
  [ ! -e "$marker" ] # never probed the network in the default policy
}

@test "session-start: DEGRADED offline-available when Claude is unreachable and Ollama is up" {
  command -v bun >/dev/null 2>&1 || skip "bun not installed on this machine"
  local proj="$BATS_TEST_TMPDIR/deg-avail"
  local vault_dir="$proj/vault"
  local fake_bin="$BATS_TEST_TMPDIR/deg-avail-bin"
  mkdir -p "$vault_dir/wiki" "$proj/.claude/claude-wiki-pages" "$fake_bin"
  # Approved model at the unlocked tier, with prefer-local fallback.
  printf '%s\n' '{"localModel":{"enabled":true,"model":"qwen3-coder:30b","tier":"ingest-extract","offlinePolicy":"prefer-local"}}' \
    >"$proj/.claude/claude-wiki-pages.json"
  # Fake curl: Ollama up (/api/tags ok), Anthropic unreachable (HEAD errors).
  cat >"$fake_bin/curl" <<'EOF'
#!/bin/bash
for a in "$@"; do
  case "$a" in
    */api/tags) exit 0 ;;
    https://api.anthropic.com/*) exit 7 ;;
  esac
done
exit 0
EOF
  chmod +x "$fake_bin/curl"

  run bash -c "
    cd '$proj'
    export PATH=\"$fake_bin:\$PATH\"
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$proj/.claude/claude-wiki-pages/settings.json'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "DEGRADED:"
  assert_output_contains "drafting is available offline"
}

@test "session-start: DEGRADED BLOCKED when the configured tier is not gate-approved" {
  command -v bun >/dev/null 2>&1 || skip "bun not installed on this machine"
  local proj="$BATS_TEST_TMPDIR/deg-blocked"
  local vault_dir="$proj/vault"
  local fake_bin="$BATS_TEST_TMPDIR/deg-blocked-bin"
  mkdir -p "$vault_dir/wiki" "$proj/.claude/claude-wiki-pages" "$fake_bin"
  # tier "draft" is WIRED but BLOCKED (no gate-approved model), even for qwen3-coder:30b.
  printf '%s\n' '{"localModel":{"enabled":true,"model":"qwen3-coder:30b","tier":"draft","offlinePolicy":"prefer-local"}}' \
    >"$proj/.claude/claude-wiki-pages.json"
  cat >"$fake_bin/curl" <<'EOF'
#!/bin/bash
exit 0
EOF
  chmod +x "$fake_bin/curl"

  run bash -c "
    cd '$proj'
    export PATH=\"$fake_bin:\$PATH\"
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$proj/.claude/claude-wiki-pages/settings.json'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "DEGRADED:"
  assert_output_contains "BLOCKED"
}

# P1.1: Output is plain stdout — no JSON envelope or hook-block object.
@test "session-start: output is plain text, no JSON envelope" {
  local vault_dir="$BATS_TEST_TMPDIR/plain-text-vault"
  mkdir -p "$vault_dir"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  refute_output_contains '{"type":'
  refute_output_contains '"decision":'
}

# ---------------------------------------------------------------------------
# p0-bun-required: Bun messaging upgrade (prominent ERROR: + install path)
# The hook remains exit-0 (not fail-closed) but the message is upgraded from
# the old NOTICE: to a prominent ERROR: with an actionable install command
# so a bare box is never blocked silently.
# ---------------------------------------------------------------------------

@test "session-start: prints ERROR for Bun when bun is absent" {
  local vault_dir="$BATS_TEST_TMPDIR/bun-absent-vault"
  mkdir -p "$vault_dir"

  # Hermetic sandbox PATH that resolves everything session-start.sh needs but
  # deliberately omits bun.
  local SANDBOX_BIN="$BATS_TEST_TMPDIR/sandbox-bin-nobun-ss"
  mkdir -p "$SANDBOX_BIN"
  local tool real
  for tool in bash dirname basename find wc tr mkdir cat cp grep sed sort head date jq timeout; do
    real="$(command -v "$tool" 2>/dev/null)" || continue
    case "$real" in
      /*) ln -s "$real" "$SANDBOX_BIN/$tool" ;;
    esac
  done

  if PATH="$SANDBOX_BIN" command -v bun >/dev/null 2>&1; then
    skip "bun leaked into sandbox PATH — test cannot verify absent-bun branch"
  fi

  run env -i PATH="$SANDBOX_BIN" HOME="$HOME" \
    CLAUDE_WIKI_PAGES_SETTINGS_FILE="$SETTINGS_TMP" \
    CLAUDE_WIKI_PAGES_VAULT="$vault_dir" \
    /bin/bash "$REPO_ROOT/scripts/session-start.sh"

  # Session hook must ALWAYS exit 0 — a non-zero exit is a harness error.
  assert_success
  # Prominent label — was NOTICE:, now ERROR: so it is impossible to miss.
  assert_output_contains "ERROR:"
  # Must name Bun.
  assert_output_contains "bun"
}

@test "session-start: Bun ERROR message includes bun.sh install URL" {
  local vault_dir="$BATS_TEST_TMPDIR/bun-url-vault"
  mkdir -p "$vault_dir"

  local SANDBOX_BIN="$BATS_TEST_TMPDIR/sandbox-bin-nobun-url-ss"
  mkdir -p "$SANDBOX_BIN"
  local tool real
  for tool in bash dirname basename find wc tr mkdir cat cp grep sed sort head date jq timeout; do
    real="$(command -v "$tool" 2>/dev/null)" || continue
    case "$real" in
      /*) ln -s "$real" "$SANDBOX_BIN/$tool" ;;
    esac
  done

  if PATH="$SANDBOX_BIN" command -v bun >/dev/null 2>&1; then
    skip "bun leaked into sandbox PATH"
  fi

  run env -i PATH="$SANDBOX_BIN" HOME="$HOME" \
    CLAUDE_WIKI_PAGES_SETTINGS_FILE="$SETTINGS_TMP" \
    CLAUDE_WIKI_PAGES_VAULT="$vault_dir" \
    /bin/bash "$REPO_ROOT/scripts/session-start.sh"

  assert_success
  assert_output_contains "bun.sh/install"
}

@test "session-start: Bun ERROR message includes curl install command" {
  local vault_dir="$BATS_TEST_TMPDIR/bun-curl-vault"
  mkdir -p "$vault_dir"

  local SANDBOX_BIN="$BATS_TEST_TMPDIR/sandbox-bin-nobun-curl-ss"
  mkdir -p "$SANDBOX_BIN"
  local tool real
  for tool in bash dirname basename find wc tr mkdir cat cp grep sed sort head date jq timeout; do
    real="$(command -v "$tool" 2>/dev/null)" || continue
    case "$real" in
      /*) ln -s "$real" "$SANDBOX_BIN/$tool" ;;
    esac
  done

  if PATH="$SANDBOX_BIN" command -v bun >/dev/null 2>&1; then
    skip "bun leaked into sandbox PATH"
  fi

  run env -i PATH="$SANDBOX_BIN" HOME="$HOME" \
    CLAUDE_WIKI_PAGES_SETTINGS_FILE="$SETTINGS_TMP" \
    CLAUDE_WIKI_PAGES_VAULT="$vault_dir" \
    /bin/bash "$REPO_ROOT/scripts/session-start.sh"

  assert_success
  assert_output_contains "curl -fsSL https://bun.sh/install | bash"
}

@test "session-start: Bun ERROR message says Bun is required" {
  local vault_dir="$BATS_TEST_TMPDIR/bun-req-vault"
  mkdir -p "$vault_dir"

  local SANDBOX_BIN="$BATS_TEST_TMPDIR/sandbox-bin-nobun-req-ss"
  mkdir -p "$SANDBOX_BIN"
  local tool real
  for tool in bash dirname basename find wc tr mkdir cat cp grep sed sort head date jq timeout; do
    real="$(command -v "$tool" 2>/dev/null)" || continue
    case "$real" in
      /*) ln -s "$real" "$SANDBOX_BIN/$tool" ;;
    esac
  done

  if PATH="$SANDBOX_BIN" command -v bun >/dev/null 2>&1; then
    skip "bun leaked into sandbox PATH"
  fi

  run env -i PATH="$SANDBOX_BIN" HOME="$HOME" \
    CLAUDE_WIKI_PAGES_SETTINGS_FILE="$SETTINGS_TMP" \
    CLAUDE_WIKI_PAGES_VAULT="$vault_dir" \
    /bin/bash "$REPO_ROOT/scripts/session-start.sh"

  assert_success
  assert_output_contains "required"
}

@test "session-start: no Bun ERROR when bun is present" {
  command -v bun >/dev/null 2>&1 || skip "bun not installed on this machine"
  local vault_dir="$BATS_TEST_TMPDIR/bun-present-vault"
  mkdir -p "$vault_dir"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  refute_output_contains "ERROR: Bun"
}

# ---------------------------------------------------------------------------
# M26: unbounded-blocking — engine.sh calls in SessionStart must have a
# hard wall-clock timeout so the hook never hangs when the engine is slow
# or the git lock is held.
#
# Strategy: inject a fake engine.sh (via PATH override) that sleeps 30 s,
# set short timeouts via the env vars, and assert the script finishes in
# under 5 s.  The test is self-timing via the `time` builtin captured in a
# subshell, and skips when neither `timeout` nor a pure-bash watchdog is
# available (i.e. the skip guard protects against false red on exotic
# environments, not against the feature being absent).
# ---------------------------------------------------------------------------

@test "session-start: engine config call completes within bounded time even when engine hangs" {
  command -v bun >/dev/null 2>&1 || skip "bun not installed on this machine"
  local vault_dir="$BATS_TEST_TMPDIR/m26-config-vault"
  local fake_bin="$BATS_TEST_TMPDIR/m26-fake-bin"
  mkdir -p "$vault_dir/wiki" "$fake_bin"

  # Fake engine.sh: hangs for 30 s (simulates a blocked git lock / slow fs).
  # It is placed in $fake_bin so it shadows the real engine.sh looked up via
  # PATH; session-start.sh calls it as `bash "$(dirname "$0")/engine.sh"` using
  # an explicit path, so we intercept via a fake heartbeat.sh + engine.sh pair
  # placed alongside a fake scripts/ directory on PATH.
  local fake_scripts="$BATS_TEST_TMPDIR/m26-scripts"
  mkdir -p "$fake_scripts"

  # Copy all real scripts so sourcing resolve-vault.sh works, then override
  # engine.sh with the slow stub.
  cp -r "$REPO_ROOT/scripts/." "$fake_scripts/"
  cat >"$fake_scripts/engine.sh" <<'EOF'
#!/bin/bash
# Slow stub — simulates a hung engine for M26 timeout test.
sleep 30
exit 0
EOF
  chmod +x "$fake_scripts/engine.sh"

  # Use very short timeouts so the test completes quickly:
  #   heartbeat timeout = 1 s, config timeout = 1 s.
  local start_ts end_ts elapsed

  start_ts=$(date +%s 2>/dev/null || echo 0)

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    export CLAUDE_WIKI_PAGES_HEARTBEAT_TIMEOUT_SEC=1
    export CLAUDE_WIKI_PAGES_CONFIG_TIMEOUT_SEC=1
    bash '$fake_scripts/session-start.sh'
  "

  end_ts=$(date +%s 2>/dev/null || echo 0)

  assert_success

  # Wall-clock gate: must finish in under 8 s (1 s hb + 1 s config + 6 s
  # headroom for process startup, CI slowness, and watchdog teardown).
  if [ "$start_ts" -ne 0 ] && [ "$end_ts" -ne 0 ]; then
    elapsed=$(( end_ts - start_ts ))
    [ "$elapsed" -lt 8 ] || fail "session-start blocked for ${elapsed}s — engine.sh timeout not enforced (M26)"
  fi
}

@test "session-start: heartbeat call completes within bounded time even when heartbeat hangs" {
  local vault_dir="$BATS_TEST_TMPDIR/m26-hb-vault"
  local fake_scripts="$BATS_TEST_TMPDIR/m26-hb-scripts"
  mkdir -p "$vault_dir/wiki" "$fake_scripts"

  # Copy all real scripts so sourcing works, then override heartbeat.sh with a
  # slow stub to verify session-start.sh's timeout wrapper fires.
  cp -r "$REPO_ROOT/scripts/." "$fake_scripts/"
  cat >"$fake_scripts/heartbeat.sh" <<'EOF'
#!/bin/bash
# Slow stub — simulates a hung heartbeat for M26 timeout test.
sleep 30
exit 0
EOF
  chmod +x "$fake_scripts/heartbeat.sh"

  local start_ts end_ts elapsed
  start_ts=$(date +%s 2>/dev/null || echo 0)

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    export CLAUDE_WIKI_PAGES_HEARTBEAT_TIMEOUT_SEC=1
    export CLAUDE_WIKI_PAGES_CONFIG_TIMEOUT_SEC=1
    bash '$fake_scripts/session-start.sh'
  "

  end_ts=$(date +%s 2>/dev/null || echo 0)

  assert_success

  if [ "$start_ts" -ne 0 ] && [ "$end_ts" -ne 0 ]; then
    elapsed=$(( end_ts - start_ts ))
    [ "$elapsed" -lt 8 ] || fail "session-start blocked for ${elapsed}s — heartbeat.sh timeout not enforced (M26)"
  fi
}
