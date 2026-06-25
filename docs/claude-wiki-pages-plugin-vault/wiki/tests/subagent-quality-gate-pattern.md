---
title: "Subagent Quality Gate Pattern"
type: concept
aliases: ["Subagent Quality Gate Pattern", "SubagentStop gate", "ingest quality gate", "post-agent verification"]
parent: "[[tests|Tests]]"
path: "tests"
sources: ["[[tests-subagent-ingest-gate-bats|tests/scripts/subagent-ingest-gate.bats]]", "[[tests-extract-worker-frontmatter-bats|tests/scripts/extract-worker-frontmatter.bats]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["tests", "agents", "quality-gate"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Subagent Quality Gate Pattern

A pattern for post-execution verification of specialist agents via the SubagentStop hook event.

## Definition

A SubagentStop hook that fires when a named specialist agent completes, runs a verification script against the vault, and emits a "QUALITY GATE" diagnostic if verification fails. The gate does not block the agent's completion — it reports after the fact.

## Key Principles

**Agent-name scoping.** The gate is silent for all agents except the one it targets (e.g., `claude-wiki-pages-ingest-gate.sh` only fires for `agent_name == claude-wiki-pages-ingest-agent`). This prevents cross-contamination between hooks for different agents.

**Graceful degradation.** If the vault path does not exist, or the verify script path cannot be resolved, the gate exits 0 cleanly. Missing infrastructure never crashes the hook.

**Two SubagentStop gates:**

- `subagent-ingest-gate.sh` — runs `verify-ingest.sh` after the ingest agent; catches structural errors introduced during ingestion.
- `subagent-lint-gate.sh` — runs after the curator agent; warns on unresolved lint errors.

**Tool restriction gate (extract-worker-frontmatter.bats).** A distinct class of subagent gate that verifies structural invariants in agent frontmatter files rather than vault state. The extract-worker Bats test is a compile-time (grep-based) enforcement that the extract worker agent's `tools:` line contains only Read, Glob, Grep — a safety boundary preventing write-capable workers in the read-only fan-out.

## Examples

The Bats test for the ingest gate stubs a `verify-ingest.sh` that exits 1 to confirm the QUALITY GATE output fires:

```bash
cat >"$plugin/scripts/verify-ingest.sh" <<'EOF'
#!/bin/bash
echo "ERROR: stub verify-ingest marker" >&2
exit 1
EOF
```

Then asserts:

```bash
assert_output_contains "QUALITY GATE"
assert_output_contains "stub verify-ingest marker"
```

## Related Concepts

The SubagentStop hook is defined in `hooks/hooks.json`. The ingest quality gate feeds back into the ingest pipeline described in `skills/ingest-pipeline/SKILL.md` — when the gate fires, the ingest agent receives the verify output as context for a follow-up heal pass.
