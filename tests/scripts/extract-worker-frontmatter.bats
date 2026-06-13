#!/usr/bin/env bats
# P1-A1 gate — extract-worker frontmatter safety boundary.
#
# Behavior under test (D2, D8):
#
#   (a) agents/claude-wiki-pages-extract-worker-agent.md exists.
#
#   (b) Its `tools:` frontmatter line contains exactly the string
#       "Read, Glob, Grep" and NOTHING else — no Write, no Edit, no Bash.
#       This is a hard safety boundary: an extract worker that can write
#       is no longer read-only.
#
#   (c) The file declares `name: claude-wiki-pages-extract-worker-agent`.
#
#   (d) The file does NOT list Write, Edit, or Bash anywhere in its
#       tools line (belt-and-suspenders after (b)).
#
#   (e) The ingest-agent (`agents/claude-wiki-pages-ingest-agent.md`) references
#       the extract-worker agent so that the fan-out step is documented.
#
# These tests FAIL before P1-A1 creates the agent file and PASS after.

load '../test_helper/common'

setup() {
  _load_helpers
  WORKER_AGENT="$REPO_ROOT/agents/claude-wiki-pages-extract-worker-agent.md"
  INGEST_AGENT="$REPO_ROOT/agents/claude-wiki-pages-ingest-agent.md"
}

# ---------------------------------------------------------------------------
# (a) File existence
# ---------------------------------------------------------------------------

@test "extract-worker-frontmatter: agent file exists" {
  [ -f "$WORKER_AGENT" ]
}

# ---------------------------------------------------------------------------
# (b) tools line is exactly Read, Glob, Grep
# ---------------------------------------------------------------------------

@test "extract-worker-frontmatter: tools line contains Read, Glob, Grep" {
  run grep -E "^tools:" "$WORKER_AGENT"
  assert_success
  assert_output_contains "Read"
  assert_output_contains "Glob"
  assert_output_contains "Grep"
}

@test "extract-worker-frontmatter: tools line does NOT contain Write" {
  local tools_line
  tools_line=$(grep -E "^tools:" "$WORKER_AGENT")
  if echo "$tools_line" | grep -q "Write"; then
    printf 'FAIL: tools line must not contain Write: %s\n' "$tools_line" >&2
    return 1
  fi
}

@test "extract-worker-frontmatter: tools line does NOT contain Edit" {
  local tools_line
  tools_line=$(grep -E "^tools:" "$WORKER_AGENT")
  if echo "$tools_line" | grep -q "Edit"; then
    printf 'FAIL: tools line must not contain Edit: %s\n' "$tools_line" >&2
    return 1
  fi
}

@test "extract-worker-frontmatter: tools line does NOT contain Bash" {
  local tools_line
  tools_line=$(grep -E "^tools:" "$WORKER_AGENT")
  if echo "$tools_line" | grep -q "Bash"; then
    printf 'FAIL: tools line must not contain Bash: %s\n' "$tools_line" >&2
    return 1
  fi
}

@test "extract-worker-frontmatter: tools line is exactly Read, Glob, Grep (full value check)" {
  # Extract the value after "tools: " and assert it is Read, Glob, Grep
  # (possibly with surrounding whitespace).
  local tools_value
  tools_value=$(grep -E "^tools:" "$WORKER_AGENT" | sed 's/^tools:[[:space:]]*//')
  if [ "$tools_value" != "Read, Glob, Grep" ]; then
    printf 'FAIL: expected tools value "Read, Glob, Grep", got: "%s"\n' "$tools_value" >&2
    return 1
  fi
}

# ---------------------------------------------------------------------------
# (c) name field
# ---------------------------------------------------------------------------

@test "extract-worker-frontmatter: name field is claude-wiki-pages-extract-worker-agent" {
  run grep -E "^name:" "$WORKER_AGENT"
  assert_success
  assert_output_contains "claude-wiki-pages-extract-worker-agent"
}

# ---------------------------------------------------------------------------
# (d) Belt-and-suspenders: no write-capable tool anywhere in frontmatter
# ---------------------------------------------------------------------------

@test "extract-worker-frontmatter: frontmatter block does not grant Write anywhere" {
  # Extract only the frontmatter block (between first and second ---).
  local fm
  fm=$(awk '/^---$/{if(++c==2) exit} c==1' "$WORKER_AGENT")
  if echo "$fm" | grep -q "Write"; then
    printf 'FAIL: frontmatter must not reference Write:\n%s\n' "$fm" >&2
    return 1
  fi
}

@test "extract-worker-frontmatter: frontmatter block does not grant Edit anywhere" {
  local fm
  fm=$(awk '/^---$/{if(++c==2) exit} c==1' "$WORKER_AGENT")
  if echo "$fm" | grep -q "Edit"; then
    printf 'FAIL: frontmatter must not reference Edit:\n%s\n' "$fm" >&2
    return 1
  fi
}

@test "extract-worker-frontmatter: frontmatter block does not grant Bash anywhere" {
  local fm
  fm=$(awk '/^---$/{if(++c==2) exit} c==1' "$WORKER_AGENT")
  if echo "$fm" | grep -q "Bash"; then
    printf 'FAIL: frontmatter must not reference Bash:\n%s\n' "$fm" >&2
    return 1
  fi
}

# ---------------------------------------------------------------------------
# (e) Ingest-agent references the extract-worker (fan-out is documented)
# ---------------------------------------------------------------------------

@test "extract-worker-frontmatter: ingest-agent references extract-worker agent" {
  run grep -iE "extract.worker|extract-worker" "$INGEST_AGENT"
  assert_success
}

@test "extract-worker-frontmatter: ingest-agent documents maxParallelExtract fan-out condition" {
  run grep -iE "maxParallelExtract|max.*parallel.*extract|parallel.*extract" "$INGEST_AGENT"
  assert_success
}
