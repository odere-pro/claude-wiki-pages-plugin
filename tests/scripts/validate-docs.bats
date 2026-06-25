#!/usr/bin/env bats
# Tests for scripts/validate-docs.sh
#
# Behavior under test:
#   - Pass on a clean tree (the current repo, which must stay green).
#   - Fail when retired glossary (`second-brain`, `second brain`,
#     `vault-synthesize`, `vault-index`) leaks outside BAN_EXEMPT.
#   - Allow retired glossary inside BAN_EXEMPT (GLOSSARY.md, CHANGELOG.md).
#   - Fail on SEO-register leaks ("knowledge management") outside SEO_EXEMPT.
#   - Allow SEO-register leaks inside the exempt set (e.g. README.md).
#   - Fail on /claude-wiki-pages:<name> references that do not resolve to a
#     skill directory or agent .md file.
#   Check 5 — design-drift (ADR-0013):
#   - 5a: renamed/nonexistent script in mermaid fence → FAIL
#   - 5b: dead relative link in design doc → FAIL
#   - 5d: wrong count in 06-feature-relations.md → FAIL
#   - 5f: single-ramped router row in SOFTWARE-3-0.md table → FAIL
#   - 5a: [speculative] doc/fence → PASS (exempt from grounding)
#   - 5c (PreToolUse order): reordered PreToolUse scripts → WARN, exit 0
#
# Since the docs-finish migration unit, validate-docs.sh is a THIN WRAPPER over
# `engine lint --check docs` (src/core/docs-check.ts + src/core/design-drift.ts).
# These tests therefore pin the engine's behaviour through the wrapper: the
# finding messages are unchanged (banned string / dead link / unresolved mermaid
# token / count mismatch / single-ramped …); only the clean-tree summary line is
# the engine's "OK: all checks passed". Retirement of the bash logic was gated on
# a whole-repo dual-run proving byte/count/file-identical results bash vs engine.
#
# The engine scopes its scan with `git ls-files` (via a git-backed RepoIO), so
# every test that needs a file visible to the scan still creates an isolated git
# repo with that file committed (see setup_isolated_repo /
# commit_file_in_isolated_repo in tests/test_helper/common.bash). The isolated
# repo copies .claude-plugin/, so the engine resolves it as its own repo root.

load '../test_helper/common'

setup() {
  _load_helpers
}

# -----------------------------------------------------------------------------
# Happy path against the real repo
# -----------------------------------------------------------------------------

@test "Glossary gate: the gate passes on a clean tree (the real repo stays green)" {
  # Run against the real repo root. If this fails, the repo itself has a
  # glossary violation and the tests should surface that before CI does.
  run bash "$SCRIPTS_DIR/validate-docs.sh" "$REPO_ROOT"

  assert_success
  assert_output_contains "OK: all checks passed"
}

# -----------------------------------------------------------------------------
# Banned strings (retired glossary)
# -----------------------------------------------------------------------------

@test "Glossary gate: a retired 'second-brain' identifier outside the exempt set is flagged as a banned string" {
  setup_isolated_repo
  rm -f "$ISOLATED_REPO/docs/architecture.md"
  commit_file_in_isolated_repo "docs/architecture.md" \
    "# Architecture\n\nThe second-brain-ingest skill processes sources.\n"

  run bash "$SCRIPTS_DIR/validate-docs.sh" "$ISOLATED_REPO"
  local rc=$status
  local out="$output"

  teardown_isolated_repo

  assert_eq "$rc" 1
  assert_contains "$out" "banned string"
  assert_contains "$out" "architecture.md"
}

@test "Glossary gate: a retired 'vault-synthesize' identifier outside the exempt set is flagged as a banned string" {
  setup_isolated_repo
  rm -f "$ISOLATED_REPO/docs/architecture.md"
  commit_file_in_isolated_repo "docs/architecture.md" \
    "# Architecture\n\nThe vault-synthesize command writes syntheses.\n"

  run bash "$SCRIPTS_DIR/validate-docs.sh" "$ISOLATED_REPO"
  local rc=$status
  local out="$output"

  teardown_isolated_repo

  assert_eq "$rc" 1
  assert_contains "$out" "banned string"
}

@test "Glossary gate: retired glossary terms are allowed inside CHANGELOG.md (a BAN_EXEMPT historical record)" {
  setup_isolated_repo
  # CHANGELOG.md IS in BAN_EXEMPT — historical record is preserved.
  rm -f "$ISOLATED_REPO/CHANGELOG.md"
  commit_file_in_isolated_repo "CHANGELOG.md" \
    "# Changelog\n\n## 0.1.0\n- Initial skills: second-brain, vault-synthesize, vault-index.\n"

  run bash "$SCRIPTS_DIR/validate-docs.sh" "$ISOLATED_REPO"
  local rc=$status
  local out="$output"

  teardown_isolated_repo

  assert_eq "$rc" 0
  assert_contains "$out" "OK: all checks passed"
}

# -----------------------------------------------------------------------------
# SEO-register leaks
# -----------------------------------------------------------------------------

@test "Glossary gate: an SEO-register term outside the allowlist is flagged as a leak" {
  setup_isolated_repo
  # docs/architecture.md is NOT in SEO_EXEMPT, so "knowledge management" leaks.
  rm -f "$ISOLATED_REPO/docs/architecture.md"
  commit_file_in_isolated_repo "docs/architecture.md" \
    "# Architecture\n\nA knowledge management approach is useful here.\n"

  run bash "$SCRIPTS_DIR/validate-docs.sh" "$ISOLATED_REPO"
  local rc=$status
  local out="$output"

  teardown_isolated_repo

  assert_eq "$rc" 1
  assert_contains "$out" "SEO-register term"
  assert_contains "$out" "architecture.md"
}

@test "Glossary gate: an SEO-register term is allowed in README (an allowlisted file)" {
  setup_isolated_repo
  # README.md IS in SEO_EXEMPT.
  rm -f "$ISOLATED_REPO/README.md"
  commit_file_in_isolated_repo "README.md" \
    "# claude-wiki-pages\n\nA knowledge management stack for Claude Code.\n"

  run bash "$SCRIPTS_DIR/validate-docs.sh" "$ISOLATED_REPO"
  local rc=$status
  local out="$output"

  teardown_isolated_repo

  assert_eq "$rc" 0
  assert_contains "$out" "OK: all checks passed"
}

# -----------------------------------------------------------------------------
# Slash-command resolution
# -----------------------------------------------------------------------------

@test "Glossary gate: a /claude-wiki-pages slash command that resolves to no skill or agent is flagged" {
  setup_isolated_repo
  commit_file_in_isolated_repo "docs/broken-ref.md" \
    "# Broken\n\nSee /claude-wiki-pages:nonexistent-skill for details.\n"

  run bash "$SCRIPTS_DIR/validate-docs.sh" "$ISOLATED_REPO"
  local rc=$status
  local out="$output"

  teardown_isolated_repo

  assert_eq "$rc" 1
  assert_contains "$out" "/claude-wiki-pages:nonexistent-skill"
  assert_contains "$out" "does not resolve"
}

@test "Glossary gate: a slash command reference that resolves to a real skill is allowed" {
  setup_isolated_repo
  # /claude-wiki-pages:init resolves to skills/llm-wiki/ (after rename).
  commit_file_in_isolated_repo "docs/valid-ref.md" \
    "# Valid\n\nRun /claude-wiki-pages:init to start.\n"

  run bash "$SCRIPTS_DIR/validate-docs.sh" "$ISOLATED_REPO"
  local rc=$status
  local out="$output"

  teardown_isolated_repo

  assert_eq "$rc" 0
  assert_contains "$out" "OK: all checks passed"
}

# -----------------------------------------------------------------------------
# Check 5a — mermaid node grounding (renamed/stale script)
# -----------------------------------------------------------------------------

@test "Glossary gate: a stale script name in a mermaid fence fails as an unresolved token" { # spec check5a
  # A design doc names old-firewall.sh inside a mermaid fence.
  # old-firewall.sh does not exist in scripts/ or anywhere in the repo.
  # The gate must flag it.
  setup_isolated_repo
  commit_file_in_isolated_repo "docs/design/stale-hook.md" \
    "# Stale hook doc\n\n> Authority: [CLAUDE.md](../../CLAUDE.md)\n\n\`\`\`mermaid\ngraph LR\n    pre --> fw[\"old-firewall.sh\"]\n\`\`\`\n"
  commit_file_in_isolated_repo "hooks/hooks.json" \
    "{\n  \"hooks\": {\n    \"SessionStart\": [{\"hooks\": [{\"type\": \"command\", \"command\": \"bash scripts/session-start.sh\"}]}]\n  }\n}"

  run bash "$SCRIPTS_DIR/validate-docs.sh" "$ISOLATED_REPO"
  local rc=$status
  local out="$output"

  teardown_isolated_repo

  assert_eq "$rc" 1
  assert_contains "$out" "old-firewall.sh"
  assert_contains "$out" "unresolved mermaid token"
}

# -----------------------------------------------------------------------------
# Check 5b — dead relative link in design doc
# -----------------------------------------------------------------------------

@test "Glossary gate: a dead relative link in a design doc fails" { # spec check5b
  # A design doc has a relative link to a file that does not exist.
  setup_isolated_repo
  commit_file_in_isolated_repo "docs/design/broken-links.md" \
    "# Broken links\n\n> Authority: [CLAUDE.md](../../CLAUDE.md)\n\nSee [missing file](./nonexistent-design-file.md) for details.\n"
  commit_file_in_isolated_repo "hooks/hooks.json" \
    "{\n  \"hooks\": {\n    \"SessionStart\": [{\"hooks\": [{\"type\": \"command\", \"command\": \"bash scripts/session-start.sh\"}]}]\n  }\n}"

  run bash "$SCRIPTS_DIR/validate-docs.sh" "$ISOLATED_REPO"
  local rc=$status
  local out="$output"

  teardown_isolated_repo

  assert_eq "$rc" 1
  assert_contains "$out" "nonexistent-design-file.md"
  assert_contains "$out" "dead link"
}

# -----------------------------------------------------------------------------
# Check 5d — wrong count in 06-feature-relations.md
# -----------------------------------------------------------------------------

@test "Glossary gate: a wrong agent count in feature-relations fails as a count mismatch" { # spec check5d
  # A 06-feature-relations.md states Agents (99) but the repo has 7 agents.
  setup_isolated_repo
  commit_file_in_isolated_repo "docs/design/06-feature-relations.md" \
    "# Feature relations\n\n> Authority: [\`CLAUDE.md\`](../../CLAUDE.md), [\`hooks/hooks.json\`](../../hooks/hooks.json)\n\n\`\`\`mermaid\ngraph TB\n    agents[\"Agents (99)<br/>orchestrator + 6\"]\n    skills[\"Skills (23)<br/>action + teaching\"]\n    hooks[\"Hooks (7 events)\"]\n\`\`\`\n\n| Feature | In this repo? | Where |\n| --- | --- | --- |\n| **Commands** | 3 | [\`commands/\`](../../commands/) |\n| **Agents** | 99 | [\`agents/\`](../../agents/) |\n| **Skills** | 23 | [\`skills/\`](../../skills/) |\n| **Hooks** | 7 events | [\`hooks/hooks.json\`](../../hooks/hooks.json) |\n"
  commit_file_in_isolated_repo "hooks/hooks.json" \
    "{\n  \"hooks\": {\n    \"SessionStart\": [{\"hooks\": [{\"type\": \"command\", \"command\": \"bash scripts/session-start.sh\"}]}],\n    \"UserPromptSubmit\": [{\"hooks\": [{\"type\": \"command\", \"command\": \"bash scripts/prompt-guard.sh\"}]}],\n    \"PreToolUse\": [{\"hooks\": [{\"type\": \"command\", \"command\": \"bash scripts/firewall.sh\"}]}],\n    \"PostToolUse\": [{\"hooks\": [{\"type\": \"command\", \"command\": \"bash scripts/post-wiki-write.sh\"}]}],\n    \"SubagentStop\": [{\"hooks\": [{\"type\": \"command\", \"command\": \"bash scripts/subagent-lint-gate.sh\"}]}],\n    \"Stop\": [{\"hooks\": [{\"type\": \"command\", \"command\": \"bash scripts/session-memory.sh\"}]}],\n    \"SessionEnd\": [{\"hooks\": [{\"type\": \"command\", \"command\": \"bash scripts/session-memory.sh\"}]}]\n  }\n}"

  run bash "$SCRIPTS_DIR/validate-docs.sh" "$ISOLATED_REPO"
  local rc=$status
  local out="$output"

  teardown_isolated_repo

  assert_eq "$rc" 1
  assert_contains "$out" "count mismatch"
}

# -----------------------------------------------------------------------------
# Check 5f — single-ramped router row in SOFTWARE-3-0.md
# -----------------------------------------------------------------------------

@test "Glossary gate: a single-ramped router row (human on-ramp but empty agent on-ramp) fails" { # spec check5f
  # SOFTWARE-3-0.md has a table row with a human on-ramp but empty agent on-ramp.
  setup_isolated_repo
  commit_file_in_isolated_repo "SOFTWARE-3-0.md" \
    "# SOFTWARE-3-0\n\n> Authority: [CLAUDE.md](./CLAUDE.md), [docs/architecture.md](./docs/architecture.md)\n\n## Six surfaces, two readers\n\n| Surface | Human on-ramp | Agent on-ramp |\n| --- | --- | --- |\n| **Docs** | [docs/architecture.md](./docs/architecture.md) | [docs/architecture.md](./docs/architecture.md) |\n| **Missing agent** | [docs/architecture.md](./docs/architecture.md) | |\n"
  commit_file_in_isolated_repo "hooks/hooks.json" \
    "{\n  \"hooks\": {\n    \"SessionStart\": [{\"hooks\": [{\"type\": \"command\", \"command\": \"bash scripts/session-start.sh\"}]}]\n  }\n}"

  run bash "$SCRIPTS_DIR/validate-docs.sh" "$ISOLATED_REPO"
  local rc=$status
  local out="$output"

  teardown_isolated_repo

  assert_eq "$rc" 1
  assert_contains "$out" "single-ramped"
  assert_contains "$out" "Missing agent"
}

# -----------------------------------------------------------------------------
# Check 5a — [speculative] doc exemption passes
# -----------------------------------------------------------------------------

@test "Glossary gate: a [speculative]-marked doc with an unresolved mermaid token passes (exempt from grounding)" { # spec check5a
  # A design doc has [speculative] marker and a nonexistent script token in a
  # mermaid fence. The gate must pass because the doc is marked speculative.
  # Use a minimal isolated repo: remove real design docs (which reference files
  # absent from the isolated repo and would cause spurious failures), then add
  # only the specific test fixture.
  setup_isolated_repo
  # Remove real design docs so only the test fixture is scanned by Check 5.
  (cd "$ISOLATED_REPO" && git rm -qr --cached --ignore-unmatch docs/design/ && \
    rm -rf docs/design && git commit -q -m "clear design docs")
  mkdir -p "$ISOLATED_REPO/docs/design"
  # The design doc depicts session-start.sh (which exists in scripts/) alongside
  # future-gate.sh (which does not exist yet). The [speculative] marker exempts
  # the unresolvable token from 5a FAIL. 5c parity passes because session-start.sh
  # (the only wired script) appears in the fence's Set A.
  commit_file_in_isolated_repo "docs/design/future-design.md" \
    "# Future design\n\n> \`[speculative]\` — planned, not yet built.\n> Authority: [CLAUDE.md](../../CLAUDE.md)\n\n\`\`\`mermaid\ngraph LR\n    ss --> p_ss[\"session-start.sh\"]\n    pre --> fw[\"future-gate.sh (not-yet-implemented)\"]\n\`\`\`\n"
  commit_file_in_isolated_repo "hooks/hooks.json" \
    "{\n  \"hooks\": {\n    \"SessionStart\": [\n      {\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"bash scripts/session-start.sh\"\n          }\n        ]\n      }\n    ]\n  }\n}"

  run bash "$SCRIPTS_DIR/validate-docs.sh" "$ISOLATED_REPO"
  local rc=$status
  local out="$output"

  teardown_isolated_repo

  assert_eq "$rc" 0
}

# -----------------------------------------------------------------------------
# Check 5c — PreToolUse ordering delta → WARN only (exit 0)
# -----------------------------------------------------------------------------

@test "Glossary gate: a PreToolUse reorder in a design doc warns but exits 0 (WARN does not increment VIOLATIONS)" { # spec check5c
  # A design doc shows PreToolUse scripts in a different order than hooks.json.
  # This must emit a WARN line but must NOT increment VIOLATIONS (exit 0).
  # Use a minimal isolated repo: remove real design docs (which reference files
  # absent from the isolated repo) then add only the test fixture.
  setup_isolated_repo
  # Remove real design docs so only the test fixture is scanned by Check 5.
  (cd "$ISOLATED_REPO" && git rm -qr --cached --ignore-unmatch docs/design/ && \
    rm -rf docs/design && git commit -q -m "clear design docs")
  mkdir -p "$ISOLATED_REPO/docs/design"
  # hooks.json has firewall.sh first, then validate-frontmatter.sh.
  # Use multi-line format so each "command" is on its own line — the awk
  # extractor captures one script per "command" line.
  commit_file_in_isolated_repo "hooks/hooks.json" \
    "{\n  \"hooks\": {\n    \"SessionStart\": [\n      {\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"bash \${CLAUDE_PLUGIN_ROOT}/scripts/session-start.sh\"\n          }\n        ]\n      }\n    ],\n    \"UserPromptSubmit\": [\n      {\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"bash \${CLAUDE_PLUGIN_ROOT}/scripts/prompt-guard.sh\"\n          }\n        ]\n      }\n    ],\n    \"PreToolUse\": [\n      {\n        \"matcher\": \"Write|Edit\",\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"bash \${CLAUDE_PLUGIN_ROOT}/scripts/firewall.sh\"\n          },\n          {\n            \"type\": \"command\",\n            \"command\": \"bash \${CLAUDE_PLUGIN_ROOT}/scripts/validate-frontmatter.sh\"\n          }\n        ]\n      }\n    ],\n    \"PostToolUse\": [\n      {\n        \"matcher\": \"Write|Edit\",\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"bash \${CLAUDE_PLUGIN_ROOT}/scripts/post-wiki-write.sh\"\n          }\n        ]\n      }\n    ],\n    \"SubagentStop\": [\n      {\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"bash \${CLAUDE_PLUGIN_ROOT}/scripts/subagent-lint-gate.sh\"\n          }\n        ]\n      }\n    ],\n    \"Stop\": [\n      {\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"bash \${CLAUDE_PLUGIN_ROOT}/scripts/session-memory.sh\"\n          }\n        ]\n      }\n    ],\n    \"SessionEnd\": [\n      {\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"bash \${CLAUDE_PLUGIN_ROOT}/scripts/session-memory.sh\"\n          }\n        ]\n      }\n    ]\n  }\n}"
  # Design doc shows validate-frontmatter.sh BEFORE firewall.sh (reversed order).
  # The subgraph lists 7 hook event nodes so the PreToolUse-order detection
  # finds this as the authoritative hook-chain fence (≥5 hook event names).
  commit_file_in_isolated_repo "docs/design/02-component-design.md" \
    "# Component design\n\n> Authority: [\`docs/architecture.md\`](../architecture.md), [\`hooks/hooks.json\`](../../hooks/hooks.json)\n\n## Hooks\n\n\`\`\`mermaid\ngraph LR\n    subgraph events[\"hooks/hooks.json events\"]\n        ss[\"SessionStart\"]\n        ups[\"UserPromptSubmit\"]\n        pre[\"PreToolUse\"]\n        post[\"PostToolUse\"]\n        sub[\"SubagentStop\"]\n        stop[\"Stop\"]\n        send[\"SessionEnd\"]\n    end\n    ss --> p_ss[\"session-start.sh\"]\n    ups --> p_pg[\"prompt-guard.sh\"]\n    pre --> p_vf[\"validate-frontmatter.sh\"]\n    pre --> p_fw[\"firewall.sh\"]\n    post --> p_pw[\"post-wiki-write.sh\"]\n    sub --> p_lg[\"subagent-lint-gate.sh\"]\n    stop --> p_sm[\"session-memory.sh\"]\n    send --> p_sm\n\`\`\`\n"

  run bash "$SCRIPTS_DIR/validate-docs.sh" "$ISOLATED_REPO"
  local rc=$status
  local out="$output"

  teardown_isolated_repo

  # Must exit 0 (WARN does not increment VIOLATIONS)
  assert_eq "$rc" 0
  # Must emit a WARN line mentioning the ordering delta
  assert_contains "$out" "WARN"
  assert_contains "$out" "PreToolUse"
}

# -----------------------------------------------------------------------------
# CRITICAL-1 — token resolution must be path-boundary-anchored (no suffix match)
# -----------------------------------------------------------------------------

@test "Glossary gate: a suffix-only script name in a fence fails (token resolution is path-boundary-anchored, no substring match)" { # spec check5a-suffix
  # 'docs.sh' is a suffix of 'validate-docs.sh' which exists in scripts/.
  # Unanchored grep -qF would resolve it via substring match (false negative).
  # After the anchor fix it must NOT resolve and the gate must FAIL.
  setup_isolated_repo
  (cd "$ISOLATED_REPO" && git rm -qr --cached --ignore-unmatch docs/design/ && \
    rm -rf docs/design && git commit -q -m "clear design docs")
  mkdir -p "$ISOLATED_REPO/docs/design"
  commit_file_in_isolated_repo "docs/design/stale-suffix.md" \
    "# Stale suffix\n\n> Authority: [CLAUDE.md](../../CLAUDE.md)\n\n\`\`\`mermaid\ngraph LR\n    pre --> fw[\"docs.sh\"]\n\`\`\`\n"
  commit_file_in_isolated_repo "hooks/hooks.json" \
    "{\n  \"hooks\": {\n    \"SessionStart\": [\n      {\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"bash scripts/docs.sh\"\n          }\n        ]\n      }\n    ]\n  }\n}"

  run bash "$SCRIPTS_DIR/validate-docs.sh" "$ISOLATED_REPO"
  local rc=$status
  local out="$output"

  teardown_isolated_repo

  assert_eq "$rc" 1
  assert_contains "$out" "docs.sh"
  assert_contains "$out" "unresolved mermaid token"
}

# -----------------------------------------------------------------------------
# HIGH-1 — dead links with #anchors must be caught by 5b/5e/5f
# -----------------------------------------------------------------------------

@test "Glossary gate: a dead link with a #hash-anchor in a design doc fails (the regex no longer stops at '#')" { # spec check5b-anchor
  # [x](./missing.md#section) — the regex was stopping at '#' so the link
  # never reached _resolve_link. After the fix it must FAIL.
  # session-start.sh is shown in the fence so 5c parity passes; the only
  # expected failure is the anchored dead link caught by 5b.
  setup_isolated_repo
  (cd "$ISOLATED_REPO" && git rm -qr --cached --ignore-unmatch docs/design/ && \
    rm -rf docs/design && git commit -q -m "clear design docs")
  mkdir -p "$ISOLATED_REPO/docs/design"
  commit_file_in_isolated_repo "docs/design/anchored-link.md" \
    "# Anchored link\n\n> Authority: [CLAUDE.md](../../CLAUDE.md)\n\n\`\`\`mermaid\ngraph LR\n    ss --> p[\"session-start.sh\"]\n\`\`\`\n\nSee [missing section](./nonexistent-file.md#heading) for details.\n"
  commit_file_in_isolated_repo "hooks/hooks.json" \
    "{\n  \"hooks\": {\n    \"SessionStart\": [\n      {\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"bash scripts/session-start.sh\"\n          }\n        ]\n      }\n    ]\n  }\n}"

  run bash "$SCRIPTS_DIR/validate-docs.sh" "$ISOLATED_REPO"
  local rc=$status
  local out="$output"

  teardown_isolated_repo

  assert_eq "$rc" 1
  assert_contains "$out" "nonexistent-file.md"
  assert_contains "$out" "dead link"
}

# -----------------------------------------------------------------------------
# HIGH-2 — commands count in the emoji/checkmark cell form must be verified
# -----------------------------------------------------------------------------

@test "Glossary gate: a wrong commands count in the emoji-checkmark cell form fails as a count mismatch" { # spec check5d-emoji
  # Real 06-feature-relations.md uses '| **Commands** | ✅ 3 |' format.
  # The old regex skipped the number because of the emoji, returning empty
  # STATED_CMDS and silently skipping the check. After the fix a wrong count
  # (e.g. 99) must FAIL.
  setup_isolated_repo
  (cd "$ISOLATED_REPO" && git rm -qr --cached --ignore-unmatch docs/design/ && \
    rm -rf docs/design && git commit -q -m "clear design docs")
  mkdir -p "$ISOLATED_REPO/docs/design"
  commit_file_in_isolated_repo "docs/design/06-feature-relations.md" \
    "# Feature relations\n\n> Authority: [\`CLAUDE.md\`](../../CLAUDE.md), [\`hooks/hooks.json\`](../../hooks/hooks.json)\n\n\`\`\`mermaid\ngraph TB\n    agents[\"Agents (7)\"]\n    skills[\"Skills (23)\"]\n    hooks[\"Hooks (7 events)\"]\n\`\`\`\n\n| Feature | In this repo? | Where |\n| --- | --- | --- |\n| **Commands** | \xE2\x9C\x85 99 | [\`commands/\`](../../commands/) |\n| **Agents** | \xE2\x9C\x85 7 | [\`agents/\`](../../agents/) |\n| **Skills** | \xE2\x9C\x85 23 | [\`skills/\`](../../skills/) |\n| **Hooks** | \xE2\x9C\x85 7 events | [\`hooks/hooks.json\`](../../hooks/hooks.json) |\n"
  commit_file_in_isolated_repo "hooks/hooks.json" \
    "{\n  \"hooks\": {\n    \"SessionStart\": [\n      {\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"bash scripts/session-start.sh\"\n          }\n        ]\n      }\n    ],\n    \"UserPromptSubmit\": [\n      {\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"bash scripts/prompt-guard.sh\"\n          }\n        ]\n      }\n    ],\n    \"PreToolUse\": [\n      {\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"bash scripts/firewall.sh\"\n          }\n        ]\n      }\n    ],\n    \"PostToolUse\": [\n      {\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"bash scripts/post-wiki-write.sh\"\n          }\n        ]\n      }\n    ],\n    \"SubagentStop\": [\n      {\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"bash scripts/subagent-lint-gate.sh\"\n          }\n        ]\n      }\n    ],\n    \"Stop\": [\n      {\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"bash scripts/session-memory.sh\"\n          }\n        ]\n      }\n    ],\n    \"SessionEnd\": [\n      {\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"bash scripts/session-memory.sh\"\n          }\n        ]\n      }\n    ]\n  }\n}"

  run bash "$SCRIPTS_DIR/validate-docs.sh" "$ISOLATED_REPO"
  local rc=$status
  local out="$output"

  teardown_isolated_repo

  assert_eq "$rc" 1
  assert_contains "$out" "count mismatch"
  assert_contains "$out" "commands"
}

# -----------------------------------------------------------------------------
# MEDIUM-2 — router emptiness check must reject markup-only placeholder cells
# -----------------------------------------------------------------------------

@test "Glossary gate: a router row with an &nbsp; placeholder agent cell still counts as empty and fails by surface name" { # spec check5f-placeholder
  # A router row whose agent cell contains only '&nbsp;' (or em-dash) must
  # still count as empty and FAIL with the surface name in the error.
  # Uses minimal isolated repo (real design docs removed) to avoid spurious
  # failures from docs that reference files absent from the stripped repo.
  setup_isolated_repo
  (cd "$ISOLATED_REPO" && git rm -qr --cached --ignore-unmatch docs/design/ && \
    rm -rf docs/design && git commit -q -m "clear design docs")
  commit_file_in_isolated_repo "SOFTWARE-3-0.md" \
    "# SOFTWARE-3-0\n\n> Authority: [CLAUDE.md](./CLAUDE.md), [docs/architecture.md](./docs/architecture.md)\n\n## Six surfaces, two readers\n\n| Surface | Human on-ramp | Agent on-ramp |\n| --- | --- | --- |\n| **Docs** | [docs/architecture.md](./docs/architecture.md) | [docs/architecture.md](./docs/architecture.md) |\n| **Placeholder surface** | [docs/architecture.md](./docs/architecture.md) | &nbsp; |\n"
  commit_file_in_isolated_repo "hooks/hooks.json" \
    "{\n  \"hooks\": {\n    \"SessionStart\": [\n      {\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"bash scripts/session-start.sh\"\n          }\n        ]\n      }\n    ]\n  }\n}"

  run bash "$SCRIPTS_DIR/validate-docs.sh" "$ISOLATED_REPO"
  local rc=$status
  local out="$output"

  teardown_isolated_repo

  assert_eq "$rc" 1
  assert_contains "$out" "single-ramped"
  assert_contains "$out" "Placeholder surface"
}
