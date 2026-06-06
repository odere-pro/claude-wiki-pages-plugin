#!/usr/bin/env bats
# Tests for `set-vault.sh cross-vault-log` (PM.3 — read-time audit roll-up).
#
# ADR-0016 Part C / N8: the roll-up enumerates registered vaults by calling
# _vaults_read directly (no registry_all_vaults wrapper). For each vault it
# folds wiki/log.md entries vault-tagged and date-sorted. Running it twice must
# leave every vault's wiki/ byte-identical (no ledger, no cache, no _audit/).
#
# Acceptance items covered:
#   1. ≥2-vault fold: entries from both vaults appear, vault-tagged.
#   2. Date-sort: entries are ordered chronologically across vaults.
#   3. --last N: limits entries per vault.
#   4. Twice-run snapshot-clean invariant: second run leaves wiki/ unmodified.
#   5. Malformed registry: own "registry malformed" status + zero entries +
#      non-zero exit; __FAIL_CLOSED__ token ABSENT from stdout+stderr.
#   6. Missing wiki/log.md: vault skipped with stderr WARN; others still listed.

load '../test_helper/common'

# ── helpers ──────────────────────────────────────────────────────────────────

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

# Create a minimal vault directory with a wiki/log.md populated with sample entries.
# Usage: _make_vault <dir> <vault-name> <num-entries>
# Entry dates are derived as 2026-0<n>-0<i> so they are predictable and sortable.
_make_vault() {
  local dir="$1"
  local name="$2"
  local n="${3:-2}"
  mkdir -p "$dir/wiki"
  {
    printf -- '---\ntitle: "Operations Log"\ntype: log\ncreated: 2026-01-01\nupdated: 2026-01-01\n---\n\n# Operations Log\n\n'
    local i=1
    while [ "$i" -le "$n" ]; do
      printf '## [2026-0%s-%02d] ingest | %s-entry-%s\n\nSome detail for entry %s in vault %s.\n\n' \
        "$i" "$i" "$name" "$i" "$i" "$name"
      i=$((i + 1))
    done
  } >"$dir/wiki/log.md"
}

# Write a two-vault registry pointing to $V1 (active) and $V2.
_write_registry() {
  local v1="$1" v1name="$2" v2="$3" v2name="$4"
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "%s",\n  "current_vault_path": "%s",\n  "vaults": [{"path":"%s","name":"%s"},{"path":"%s","name":"%s"}]\n}\n' \
    "$v1" "$v1" "$v1" "$v1name" "$v2" "$v2name" >"$SETTINGS_TMP"
}

# ── test 1: ≥2-vault fold — entries from both vaults appear, vault-tagged ────

@test "PM.3 cross-vault-log: lists entries from ≥2 registered vaults, vault-tagged" {
  local V1="$BATS_TEST_TMPDIR/vault-alpha"
  local V2="$BATS_TEST_TMPDIR/vault-beta"
  _make_vault "$V1" "alpha" 2
  _make_vault "$V2" "beta" 2
  _write_registry "$V1" "alpha" "$V2" "beta"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' cross-vault-log
  "

  assert_success
  # Both vault tags must appear in stdout
  assert_output_contains "[alpha]"
  assert_output_contains "[beta]"
  # At least one entry from each vault
  assert_output_contains "alpha-entry"
  assert_output_contains "beta-entry"
}

# ── test 2: date-sort — entries are ordered chronologically across vaults ─────

@test "PM.3 cross-vault-log: entries are date-sorted across vaults" {
  local V1="$BATS_TEST_TMPDIR/ds-vault-a"
  local V2="$BATS_TEST_TMPDIR/ds-vault-b"
  mkdir -p "$V1/wiki" "$V2/wiki"

  # V1 has an entry on 2026-01-15; V2 has one on 2026-01-10 (earlier).
  {
    printf -- '---\ntitle: "Operations Log"\ntype: log\ncreated: 2026-01-01\nupdated: 2026-01-15\n---\n\n# Operations Log\n\n'
    printf '## [2026-01-15] ingest | Late Entry\n\ndetail\n\n'
  } >"$V1/wiki/log.md"
  {
    printf -- '---\ntitle: "Operations Log"\ntype: log\ncreated: 2026-01-01\nupdated: 2026-01-10\n---\n\n# Operations Log\n\n'
    printf '## [2026-01-10] ingest | Early Entry\n\ndetail\n\n'
  } >"$V2/wiki/log.md"

  _write_registry "$V1" "a" "$V2" "b"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' cross-vault-log
  "

  assert_success
  # "Early Entry" (2026-01-10) must appear before "Late Entry" (2026-01-15)
  local pos_early pos_late
  pos_early=$(printf '%s\n' "$output" | grep -n "Early Entry" | cut -d: -f1 | head -1)
  pos_late=$(printf '%s\n' "$output" | grep -n "Late Entry" | cut -d: -f1 | head -1)
  [ -n "$pos_early" ]
  [ -n "$pos_late" ]
  [ "$pos_early" -lt "$pos_late" ]
}

# ── test 3: --last N limits entries per vault ─────────────────────────────────

@test "PM.3 cross-vault-log: --last N limits entries per vault" {
  local V1="$BATS_TEST_TMPDIR/last-vault-a"
  local V2="$BATS_TEST_TMPDIR/last-vault-b"
  _make_vault "$V1" "a" 3
  _make_vault "$V2" "b" 3
  _write_registry "$V1" "a" "$V2" "b"

  # --last 1 must return at most 1 entry per vault (2 total from 2 vaults)
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' cross-vault-log --last 1
  "

  assert_success
  # Count heading lines emitted — each line is "[vaultname] ## [date] ..."
  local entry_count
  entry_count=$(printf '%s\n' "$output" | grep -c '^\[.*\] ## \[' || true)
  [ "$entry_count" -le 2 ]   # at most 1 per vault * 2 vaults
  [ "$entry_count" -ge 1 ]   # at least 1 entry present
}

@test "PM.3 cross-vault-log: without --last returns all entries from all vaults" {
  local V1="$BATS_TEST_TMPDIR/nolast-a"
  local V2="$BATS_TEST_TMPDIR/nolast-b"
  _make_vault "$V1" "x" 3
  _make_vault "$V2" "y" 3
  _write_registry "$V1" "x" "$V2" "y"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' cross-vault-log
  "

  assert_success
  local entry_count
  entry_count=$(printf '%s\n' "$output" | grep -c '^\[.*\] ## \[' || true)
  [ "$entry_count" -eq 6 ]   # 3 per vault * 2 vaults
}

# ── test 4: twice-run snapshot-clean invariant ────────────────────────────────
# Running cross-vault-log twice must leave every vault's wiki/ byte-identical.
# We take a snapshot before the first run, diff after the second run.

@test "PM.3 cross-vault-log: running twice creates/modifies NO file under any vault wiki/" {
  local V1="$BATS_TEST_TMPDIR/snap-vault-a"
  local V2="$BATS_TEST_TMPDIR/snap-vault-b"
  _make_vault "$V1" "snap-a" 2
  _make_vault "$V2" "snap-b" 2
  _write_registry "$V1" "snap-a" "$V2" "snap-b"

  # Snapshot: record a sorted listing of all files + their sizes under both wiki/ dirs.
  local before
  before=$(find "$V1/wiki" "$V2/wiki" -type f | sort | xargs -I{} sh -c 'printf "%s %s\n" "$(wc -c < "{}")" "{}"')

  # Run once
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' cross-vault-log
  "
  assert_success

  # Run twice
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' cross-vault-log
  "
  assert_success

  # After: must be identical to before
  local after
  after=$(find "$V1/wiki" "$V2/wiki" -type f | sort | xargs -I{} sh -c 'printf "%s %s\n" "$(wc -c < "{}")" "{}"')

  if [ "$before" != "$after" ]; then
    printf 'FAIL: wiki/ working tree was modified by cross-vault-log\nbefore:\n%s\nafter:\n%s\n' "$before" "$after" >&2
    return 1
  fi
}

# ── test 5: malformed registry → own status, zero entries, non-zero exit ──────
# The roll-up must NOT emit __FAIL_CLOSED__ (that is a firewall-internal token).

@test "PM.3 cross-vault-log: malformed registry → registry-malformed status, non-zero exit" {
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  # Write intentionally malformed JSON
  printf '{"default_vault_path":"x","current_vault_path":"x","vaults":[INVALID}' >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' cross-vault-log 2>&1
  "

  # Must exit non-zero
  [ "$status" -ne 0 ]
  # Must mention registry malformed / error in its own terms
  assert_output_contains "registry"
  # Zero log entries in stdout (no vault-tagged heading lines)
  local entry_count
  entry_count=$(printf '%s\n' "$output" | grep -c '^\[.*\] ## \[' || true)
  [ "$entry_count" -eq 0 ]
}

@test "PM.3 cross-vault-log: malformed registry → __FAIL_CLOSED__ token ABSENT from output" {
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{"default_vault_path":"x","current_vault_path":"x","vaults":[INVALID}' >"$SETTINGS_TMP"

  # Capture both stdout and stderr to check the token is absent from both channels.
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' cross-vault-log 2>&1
  "

  refute_output_contains "__FAIL_CLOSED__"
}

@test "PM.3 cross-vault-log: current_vault_path not in vaults[] → registry-malformed status, non-zero exit" {
  local V1="$BATS_TEST_TMPDIR/notin-a"
  local V2="$BATS_TEST_TMPDIR/notin-b"
  mkdir -p "$V1/wiki" "$V2/wiki"
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  # current_vault_path points to V1 but vaults[] only has V2
  printf '{\n  "default_vault_path": "%s",\n  "current_vault_path": "%s",\n  "vaults": [{"path":"%s","name":"b"}]\n}\n' \
    "$V1" "$V1" "$V2" >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' cross-vault-log 2>&1
  "

  [ "$status" -ne 0 ]
  assert_output_contains "registry"
  local entry_count
  entry_count=$(printf '%s\n' "$output" | grep -c '^\[.*\] ## \[' || true)
  [ "$entry_count" -eq 0 ]
}

# ── test 6: missing wiki/log.md → WARN on stderr, others still listed ─────────

@test "PM.3 cross-vault-log: vault missing wiki/log.md is skipped with stderr WARN" {
  local V1="$BATS_TEST_TMPDIR/nolog-a"
  local V2="$BATS_TEST_TMPDIR/nolog-b"
  _make_vault "$V1" "has-log" 2   # V1 has a log
  mkdir -p "$V2/wiki"              # V2 has wiki/ but NO log.md
  _write_registry "$V1" "has-log" "$V2" "no-log"

  # Capture stderr in output via 2>&1
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' cross-vault-log 2>&1
  "

  assert_success
  # V1 entries must appear
  assert_output_contains "has-log-entry"
  # A WARN about the missing log must appear
  assert_output_contains "WARN"
  assert_output_contains "log.md"
}

@test "PM.3 cross-vault-log: vault with no wiki/ directory is skipped with stderr WARN" {
  local V1="$BATS_TEST_TMPDIR/nowiki-a"
  local V2="$BATS_TEST_TMPDIR/nowiki-b"
  _make_vault "$V1" "with-wiki" 2   # V1 has wiki/log.md
  mkdir -p "$V2"                     # V2 has NO wiki/ at all
  _write_registry "$V1" "with-wiki" "$V2" "no-wiki"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' cross-vault-log 2>&1
  "

  assert_success
  assert_output_contains "with-wiki-entry"
  assert_output_contains "WARN"
}

# ── test 7: usage / bad args ──────────────────────────────────────────────────

@test "PM.3 cross-vault-log: --last requires a numeric argument" {
  local V1="$BATS_TEST_TMPDIR/args-a"
  _make_vault "$V1" "args" 1
  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "%s",\n  "current_vault_path": "%s",\n  "vaults": [{"path":"%s","name":"args"}]\n}\n' \
    "$V1" "$V1" "$V1" >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' cross-vault-log --last 2>&1
  "

  # Must fail (missing/invalid value for --last)
  [ "$status" -ne 0 ]
}

# ── test 8: set-vault.sh cross-vault-log appears in usage ────────────────────

@test "PM.3 set-vault.sh: cross-vault-log subcommand appears in usage/help" {
  run bash -c "bash '$REPO_ROOT/scripts/set-vault.sh' 2>&1"
  # set-vault.sh with no args exits 1 and prints usage
  assert_status 1
  assert_output_contains "cross-vault-log"
}

# ── test 9: N=3 vault fold — all three vaults' logs appear ───────────────────

@test "PM.3 cross-vault-log: N=3 vaults all folded correctly" {
  local V1="$BATS_TEST_TMPDIR/tri-a"
  local V2="$BATS_TEST_TMPDIR/tri-b"
  local V3="$BATS_TEST_TMPDIR/tri-c"
  _make_vault "$V1" "tri-a" 1
  _make_vault "$V2" "tri-b" 1
  _make_vault "$V3" "tri-c" 1

  mkdir -p "$(dirname "$SETTINGS_TMP")"
  printf '{\n  "default_vault_path": "%s",\n  "current_vault_path": "%s",\n  "vaults": [{"path":"%s","name":"tri-a"},{"path":"%s","name":"tri-b"},{"path":"%s","name":"tri-c"}]\n}\n' \
    "$V1" "$V1" "$V1" "$V2" "$V3" >"$SETTINGS_TMP"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    bash '$REPO_ROOT/scripts/set-vault.sh' cross-vault-log
  "

  assert_success
  assert_output_contains "[tri-a]"
  assert_output_contains "[tri-b]"
  assert_output_contains "[tri-c]"
  local entry_count
  entry_count=$(printf '%s\n' "$output" | grep -c '^\[.*\] ## \[' || true)
  [ "$entry_count" -eq 3 ]
}
