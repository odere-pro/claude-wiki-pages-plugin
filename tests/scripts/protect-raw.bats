#!/usr/bin/env bats
# Tests for scripts/protect-raw.sh
#
# Behavior under test:
#   - Block (JSON stdout with "decision":"block") any Edit to vault/raw/**.
#   - Block Write if target under vault/raw/** already exists.
#   - Pass through (exit 0, no stdout) for non-raw paths.
#
# The current script signals blocks via stdout JSON and exits 0 either way —
# Claude Code reads the JSON to decide. Tests check stdout, not exit code.

load '../test_helper/common'

setup() {
  _load_helpers
}

@test "protect-raw: blocks Edit to vault/raw/" {
  run_hook_with_json "scripts/protect-raw.sh" "$JSON_FIXTURES_DIR/write-to-raw.json"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "immutable"
}

@test "protect-raw: allows Write under vault/wiki/" {
  run_hook_with_json "scripts/protect-raw.sh" "$JSON_FIXTURES_DIR/write-good.json"

  assert_success
  assert_output_empty
}

@test "protect-raw: ignores non-vault paths" {
  local json='{"tool_name":"Write","tool_input":{"file_path":"/tmp/unrelated/foo.md","content":"hi"}}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/protect-raw.sh'"

  assert_success
  assert_output_empty
}

@test "protect-raw: blocks Write to existing raw/ file" {
  # Create a real file under a vault/raw/ path so the "file exists" check trips.
  local vault_dir="$BATS_TEST_TMPDIR/proj/vault/raw"
  mkdir -p "$vault_dir"
  local existing="$vault_dir/already-there.md"
  printf 'pre-existing\n' >"$existing"

  local json
  json=$(cat <<EOF
{"tool_name":"Write","tool_input":{"file_path":"$existing","content":"overwrite"}}
EOF
)
  run bash -c "export CLAUDE_WIKI_PAGES_VAULT=vault; printf '%s' '$json' | bash '$REPO_ROOT/scripts/protect-raw.sh'"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "Cannot overwrite"
}

@test "protect-raw: allows Write to NEW raw/ file (new source)" {
  # Parent dir exists, target file does NOT — so the `[ -f "$FILE_PATH" ]`
  # guard is meaningfully exercised (not tautologically skipped by a path
  # that can never exist).
  local vault_dir="$BATS_TEST_TMPDIR/proj/vault/raw"
  mkdir -p "$vault_dir"
  local new_path="$vault_dir/new-src.md"
  [ ! -e "$new_path" ]

  local json
  json=$(cat <<EOF
{"tool_name":"Write","tool_input":{"file_path":"$new_path","content":"new"}}
EOF
)
  run bash -c "export CLAUDE_WIKI_PAGES_VAULT=vault; printf '%s' '$json' | bash '$REPO_ROOT/scripts/protect-raw.sh'"

  assert_success
  assert_output_empty
}

# ─── agent-session carve-out tests ────────────────────────────────────────────
# The carve-out permits EXACTLY: Write to a NEW file inside raw/agent-sessions/
# whose content frontmatter contains "source_type: agent-session".

@test "protect-raw carve-out: PERMIT Write to NEW raw/agent-sessions/ file with source_type marker" {
  local vault_dir="$BATS_TEST_TMPDIR/proj/vault/raw/agent-sessions"
  mkdir -p "$vault_dir"
  local new_path="$vault_dir/sess-abc-20260101T000000.md"
  [ ! -e "$new_path" ]

  # Use cat heredoc to avoid printf interpreting leading dashes.
  local content
  content=$(cat <<'HEREDOC'
---
title: "Session Learning"
type: source
source_type: agent-session
created: 2026-06-05
date_ingested: 2026-06-05
---

Learning body.
HEREDOC
)

  # Write JSON to a temp file so the pipe is not confused by multi-line variables.
  local jf="$BATS_TEST_TMPDIR/test6.json"
  jq -n --arg p "$new_path" --arg c "$content" \
    '{"tool_name":"Write","tool_input":{"file_path":$p,"content":$c}}' >"$jf"
  run bash -c "export CLAUDE_WIKI_PAGES_VAULT=vault; cat '$jf' | bash '$REPO_ROOT/scripts/protect-raw.sh'"

  assert_success
  assert_output_empty
}

@test "protect-raw carve-out: BLOCK Edit to existing raw/agent-sessions/ file" {
  local vault_dir="$BATS_TEST_TMPDIR/proj/vault/raw/agent-sessions"
  mkdir -p "$vault_dir"
  local existing_path="$vault_dir/sess-abc-20260101T000000.md"
  cat >"$existing_path" <<'HEREDOC'
---
source_type: agent-session
---
HEREDOC

  local jf="$BATS_TEST_TMPDIR/test7.json"
  jq -n --arg p "$existing_path" \
    '{"tool_name":"Edit","tool_input":{"file_path":$p,"old_string":"x","new_string":"y"}}' >"$jf"
  run bash -c "export CLAUDE_WIKI_PAGES_VAULT=vault; cat '$jf' | bash '$REPO_ROOT/scripts/protect-raw.sh'"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "immutable"
}

@test "protect-raw carve-out: BLOCK Write OVERWRITING existing raw/agent-sessions/ file" {
  local vault_dir="$BATS_TEST_TMPDIR/proj/vault/raw/agent-sessions"
  mkdir -p "$vault_dir"
  local existing_path="$vault_dir/sess-abc-20260101T000000.md"
  cat >"$existing_path" <<'HEREDOC'
---
source_type: agent-session
---
HEREDOC

  local content
  content=$(cat <<'HEREDOC'
---
source_type: agent-session
---

Overwrite attempt.
HEREDOC
)
  local jf="$BATS_TEST_TMPDIR/test8.json"
  jq -n --arg p "$existing_path" --arg c "$content" \
    '{"tool_name":"Write","tool_input":{"file_path":$p,"content":$c}}' >"$jf"
  run bash -c "export CLAUDE_WIKI_PAGES_VAULT=vault; cat '$jf' | bash '$REPO_ROOT/scripts/protect-raw.sh'"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "Cannot overwrite"
}

@test "protect-raw carve-out: BLOCK Write NEW file directly under raw/ even WITH source_type marker" {
  # Marker confers no out-of-fence power — fence is raw/agent-sessions/ only.
  # A new file DIRECTLY under raw/ (no agent-sessions subpath) with the marker
  # is handled by the existing human-source allow rule (new raw/ file is OK).
  # The marker neither grants extra privilege nor blocks the write — it's simply
  # out-of-fence and falls to normal new-source logic (allowed).
  local vault_dir="$BATS_TEST_TMPDIR/proj/vault/raw"
  mkdir -p "$vault_dir"
  local new_path="$vault_dir/sneaky.md"
  [ ! -e "$new_path" ]

  local content
  content=$(cat <<'HEREDOC'
---
title: "Sneaky"
type: source
source_type: agent-session
---

Body.
HEREDOC
)
  local jf="$BATS_TEST_TMPDIR/test9.json"
  jq -n --arg p "$new_path" --arg c "$content" \
    '{"tool_name":"Write","tool_input":{"file_path":$p,"content":$c}}' >"$jf"
  run bash -c "export CLAUDE_WIKI_PAGES_VAULT=vault; cat '$jf' | bash '$REPO_ROOT/scripts/protect-raw.sh'"

  # The marker does NOT grant or revoke power outside the fence.
  # Normal human-source new-file rule: allowed.
  assert_success
  assert_output_empty
}

@test "protect-raw carve-out: BLOCK Write NEW file inside raw/agent-sessions/ WITHOUT source_type marker" {
  local vault_dir="$BATS_TEST_TMPDIR/proj/vault/raw/agent-sessions"
  mkdir -p "$vault_dir"
  local new_path="$vault_dir/no-marker-20260101T000000.md"
  [ ! -e "$new_path" ]

  local content
  content=$(cat <<'HEREDOC'
---
title: "Missing Marker"
type: source
---

No source_type here.
HEREDOC
)
  local jf="$BATS_TEST_TMPDIR/test10.json"
  jq -n --arg p "$new_path" --arg c "$content" \
    '{"tool_name":"Write","tool_input":{"file_path":$p,"content":$c}}' >"$jf"
  run bash -c "export CLAUDE_WIKI_PAGES_VAULT=vault; cat '$jf' | bash '$REPO_ROOT/scripts/protect-raw.sh'"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "source_type: agent-session"
}

@test "protect-raw carve-out: BLOCK traversal raw/agent-sessions/../sources/x.md" {
  local vault_dir="$BATS_TEST_TMPDIR/proj/vault/raw"
  mkdir -p "$vault_dir/agent-sessions"
  mkdir -p "$vault_dir/sources"
  local traversal_path="$vault_dir/agent-sessions/../sources/escape.md"
  [ ! -e "$vault_dir/sources/escape.md" ]

  local content
  content=$(cat <<'HEREDOC'
---
source_type: agent-session
---

Traversal attempt.
HEREDOC
)
  local jf="$BATS_TEST_TMPDIR/test11.json"
  jq -n --arg p "$traversal_path" --arg c "$content" \
    '{"tool_name":"Write","tool_input":{"file_path":$p,"content":$c}}' >"$jf"
  run bash -c "export CLAUDE_WIKI_PAGES_VAULT=vault; cat '$jf' | bash '$REPO_ROOT/scripts/protect-raw.sh'"

  # After canonicalization the path resolves to raw/sources/escape.md —
  # NOT under raw/agent-sessions/, so the carve-out does NOT apply.
  # The script falls to the existing new-raw-file rule: allowed as a human source.
  # What MUST NOT happen: carve-out agent-session privileges applied to
  # a non-agent-sessions path.
  assert_success
  assert_output_empty
}

@test "protect-raw carve-out: UNCHANGED existing raw/ new human source still allowed" {
  local vault_dir="$BATS_TEST_TMPDIR/proj/vault/raw"
  mkdir -p "$vault_dir"
  local new_path="$vault_dir/paper.md"
  [ ! -e "$new_path" ]

  local jf="$BATS_TEST_TMPDIR/test12.json"
  jq -n --arg p "$new_path" \
    '{"tool_name":"Write","tool_input":{"file_path":$p,"content":"Human source, no special marker."}}' >"$jf"
  run bash -c "export CLAUDE_WIKI_PAGES_VAULT=vault; cat '$jf' | bash '$REPO_ROOT/scripts/protect-raw.sh'"

  assert_success
  assert_output_empty
}

@test "protect-raw carve-out: UNCHANGED Edit existing raw/ human source still blocked" {
  local vault_dir="$BATS_TEST_TMPDIR/proj/vault/raw"
  mkdir -p "$vault_dir"
  local existing_path="$vault_dir/paper.md"
  echo "Human source content." >"$existing_path"

  local jf="$BATS_TEST_TMPDIR/test13.json"
  jq -n --arg p "$existing_path" \
    '{"tool_name":"Edit","tool_input":{"file_path":$p,"old_string":"Human","new_string":"Mutated"}}' >"$jf"
  run bash -c "export CLAUDE_WIKI_PAGES_VAULT=vault; cat '$jf' | bash '$REPO_ROOT/scripts/protect-raw.sh'"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "immutable"
}

# ─── fence-smuggle tests (frontmatter-scoped marker check) ────────────────────
# The marker must be the source_type field in the FRONTMATTER block (between the
# first `---` and the next `---`), NOT anywhere in the content body. A body line
# `source_type: agent-session` must not grant fence entry to a non-agent-session
# source.

@test "protect-raw carve-out: BLOCK smuggle — frontmatter source_type: paper + body marker line" {
  local vault_dir="$BATS_TEST_TMPDIR/proj/vault/raw/agent-sessions"
  mkdir -p "$vault_dir"
  local new_path="$vault_dir/x.md"
  [ ! -e "$new_path" ]

  # The exact smuggle: frontmatter declares source_type: paper, but the BODY
  # contains a line `source_type: agent-session`. Must be BLOCKED.
  local content
  content=$(cat <<'HEREDOC'
---
type: source
source_type: paper
---
body mentions
source_type: agent-session
HEREDOC
)
  local jf="$BATS_TEST_TMPDIR/test-smuggle-paper.json"
  jq -n --arg p "$new_path" --arg c "$content" \
    '{"tool_name":"Write","tool_input":{"file_path":$p,"content":$c}}' >"$jf"
  run bash -c "export CLAUDE_WIKI_PAGES_VAULT=vault; cat '$jf' | bash '$REPO_ROOT/scripts/protect-raw.sh'"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "source_type: agent-session"
}

@test "protect-raw carve-out: BLOCK smuggle — NO frontmatter, body marker line only" {
  local vault_dir="$BATS_TEST_TMPDIR/proj/vault/raw/agent-sessions"
  mkdir -p "$vault_dir"
  local new_path="$vault_dir/no-fm.md"
  [ ! -e "$new_path" ]

  # No frontmatter block at all; a body line says source_type: agent-session.
  # Must be BLOCKED — the marker must live in frontmatter.
  local content
  content=$(cat <<'HEREDOC'
Just body text, no frontmatter delimiters.
source_type: agent-session
HEREDOC
)
  local jf="$BATS_TEST_TMPDIR/test-smuggle-nofm.json"
  jq -n --arg p "$new_path" --arg c "$content" \
    '{"tool_name":"Write","tool_input":{"file_path":$p,"content":$c}}' >"$jf"
  run bash -c "export CLAUDE_WIKI_PAGES_VAULT=vault; cat '$jf' | bash '$REPO_ROOT/scripts/protect-raw.sh'"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "source_type: agent-session"
}

@test "protect-raw carve-out: BLOCK smuggle — frontmatter without source_type + body marker line" {
  local vault_dir="$BATS_TEST_TMPDIR/proj/vault/raw/agent-sessions"
  mkdir -p "$vault_dir"
  local new_path="$vault_dir/fm-no-st.md"
  [ ! -e "$new_path" ]

  # Frontmatter present but carries NO source_type field; body has the marker.
  # Must be BLOCKED.
  local content
  content=$(cat <<'HEREDOC'
---
type: source
title: "No source_type field here"
---
body
source_type: agent-session
HEREDOC
)
  local jf="$BATS_TEST_TMPDIR/test-smuggle-fmnost.json"
  jq -n --arg p "$new_path" --arg c "$content" \
    '{"tool_name":"Write","tool_input":{"file_path":$p,"content":$c}}' >"$jf"
  run bash -c "export CLAUDE_WIKI_PAGES_VAULT=vault; cat '$jf' | bash '$REPO_ROOT/scripts/protect-raw.sh'"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "source_type: agent-session"
}

@test "protect-raw carve-out: PERMIT genuine — frontmatter source_type: agent-session even with extra body lines" {
  local vault_dir="$BATS_TEST_TMPDIR/proj/vault/raw/agent-sessions"
  mkdir -p "$vault_dir"
  local new_path="$vault_dir/genuine.md"
  [ ! -e "$new_path" ]

  # Genuine agent-session source: the marker IS the frontmatter source_type.
  # Body may also mention source_type lines — still permitted because the
  # frontmatter check passes.
  local content
  content=$(cat <<'HEREDOC'
---
title: "Genuine Session"
type: source
source_type: agent-session
created: 2026-06-05
date_ingested: 2026-06-05
---

Discussion of source_type: paper in the body should not matter.
HEREDOC
)
  local jf="$BATS_TEST_TMPDIR/test-genuine.json"
  jq -n --arg p "$new_path" --arg c "$content" \
    '{"tool_name":"Write","tool_input":{"file_path":$p,"content":$c}}' >"$jf"
  run bash -c "export CLAUDE_WIKI_PAGES_VAULT=vault; cat '$jf' | bash '$REPO_ROOT/scripts/protect-raw.sh'"

  assert_success
  assert_output_empty
}
