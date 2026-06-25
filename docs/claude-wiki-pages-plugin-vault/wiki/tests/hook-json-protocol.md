---
title: "Hook JSON Protocol"
type: concept
aliases: ["Hook JSON Protocol", "hook payload", "PreToolUse contract", "decision block"]
parent: "[[tests|Tests]]"
path: "tests"
sources: ["[[tests-readme|tests/README.md]]", "[[tests-firewall-bats|tests/scripts/firewall.bats]]", "[[tests-validate-frontmatter-bats|tests/scripts/validate-frontmatter.bats]]", "[[tests-protect-raw-bats|tests/scripts/protect-raw.bats]]", "[[tests-check-wikilinks-bats|tests/scripts/check-wikilinks.bats]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["tests", "hooks", "protocol"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Hook JSON Protocol

The input/output contract for the plugin's Claude Code PreToolUse hooks, as exercised by the test suite.

## Definition

Every PreToolUse hook (firewall, validate-frontmatter, check-wikilinks, protect-raw, validate-attachments) reads a JSON tool-call payload from stdin and either exits 0 with no output (allow) or exits 0 with a `{"decision":"block","reason":"..."}` JSON object on stdout (block). Claude Code reads the stdout JSON to decide whether to proceed.

## Key Principles

**Stdin payload shape.** The JSON payload has the form:

```json
{
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/path/to/file.md",
    "content": "..."
  }
}
```

**Block via stdout JSON, not non-zero exit.** Hooks always exit 0. A block is signalled by the presence of `"decision":"block"` in stdout. A non-zero exit from a hook would crash the Claude Code session, not block the write.

**Test helpers.** The `run_hook_with_json <script> <json-file>` helper in `test_helper/common.bash` pipes a JSON fixture file into the named script and populates Bats's `$status` and `$output`. For inline payloads, `run_hook_with_json_string` accepts a JSON string directly.

**Standard test assertion for a block:**

```bash
assert_success                            # hook exits 0
assert_output_contains '"decision":"block"'  # stdout carries the block
assert_output_contains "specific reason"     # pins the branch
```

**Standard test assertion for a pass-through:**

```bash
assert_success
assert_output_empty   # no stdout means allow
```

## Examples

JSON fixtures under `tests/fixtures/json/` cover the key cases:

- `write-good.json` — valid `type: entity` write (allow)
- `write-invalid-no-type.json` — frontmatter without `type:` (block)
- `write-invalid-moc-type.json` — banned legacy `type: moc` (block)
- `write-to-raw.json` — edit targeting `vault/raw/**` (block)

## Related Concepts

The Hook JSON Protocol is the test-side representation of the hooks defined in `hooks/hooks.json`. The adversarial corpus replay in `tests/adversarial/replay-corpus.sh` exercises the full hook chain in hooks.json order using the same JSON payload format.
