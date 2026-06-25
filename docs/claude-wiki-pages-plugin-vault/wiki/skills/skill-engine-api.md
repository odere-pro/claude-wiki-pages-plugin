---
title: "Engine API Skill"
type: entity
entity_type: tool
aliases: ["Engine API Skill", "engine-api", "/claude-wiki-pages:engine-api", "engine contract"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-engine-api|Engine API Skill — SKILL.md]]"]
related: []
tags: ["skills", "layer-2", "engine-api", "deterministic-engine"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Engine API Skill

The `engine-api` skill documents the LLM-facing contract for the deterministic Bun engine (`scripts/engine.sh`) — how any agent should call it, what each subcommand returns, and when to call each on the write path.

## Overview

Reference material, not an action. Agents call the engine and reason over its structured output instead of eyeballing the vault. Always pass `--json` for machine use; always pass `--target <vault>` when a registry is configured.

## Key Facts

**Invocation pattern**: `bash "${CLAUDE_PLUGIN_ROOT}/scripts/engine.sh" <command> --target <vault> --json`

**Subcommands**:

| Command | Role | Exit codes |
|---|---|---|
| `verify` | Read-only integrity check; ports `verify-ingest.sh` CHECK 0–3 | 0 = clean, 1 = errors |
| `fix` | Deterministic safe repairs; idempotent | 0 always |
| `heal` | Git-checkpointed self-heal (verify→fix→re-verify loop) | 0 = clean, 1 = errors remain |
| `doctor` | Environment + vault health (D01–D10) | 0/1/2/3 by severity |
| `config` | Effective configuration (show/validate/path) | 0 or 1 |
| `migrate` | Upgrade schema_version in place | 0 always |
| `search` | Deterministic keyword retrieval | 0 always |
| `snapshot` | Git-checkpoint pre/post a write phase | 0 always |
| `route` | Claude vs. local model routing decision | 0 always |

**`heal` is the write-path closer**: checkpoints vault in git, loops until clean or no progress, commits. Rollback: `git revert <healCommit>`.

**`migrate` v2→v3**: `rename-index` action renames each `_index.md` to `<folder>/<folder>.md` and rewrites wikilinks. A name conflict is reported and skipped, never overwritten.

**Bun-missing fallback**: engine.sh prints a warning and exits 0; degrade to bash verifiers (`verify-ingest.sh`) rather than failing.

**`verify` JSON output fields**: `findings[]` (severity, check, message, file), `errors`, `warnings`, `clean`.

## Related

Described in the `[[skill-maintain-contract|Maintain Contract Skill]]` which sequences these commands safely.
