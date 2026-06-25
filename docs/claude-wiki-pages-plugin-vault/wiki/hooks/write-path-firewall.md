---
title: "Write-Path Firewall"
type: concept
aliases: ["Write-Path Firewall", "PreToolUse firewall", "write firewall"]
parent: "[[hooks|Hooks]]"
path: "hooks"
sources: ["[[hooks-json|hooks.json]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["hooks", "security", "firewall", "fail-closed"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Write-Path Firewall

The fail-closed PreToolUse gate that blocks any Write/Edit/MultiEdit tool call that violates vault safety rules before it executes.

## Definition

The write-path firewall is the set of PreToolUse hooks that run synchronously before every Write, Edit, or MultiEdit tool call. The hooks run in sequence; any one of them can block the write. The firewall is the primary enforcement mechanism for the vault's safety invariants — no write escapes it.

Five scripts form the core firewall chain:

1. **`firewall.sh`** — path confinement: blocks writes that target paths outside the active vault.
2. **`validate-frontmatter.sh`** — schema check: blocks writes that produce frontmatter violating the required-fields table in `vault/CLAUDE.md`.
3. **`check-wikilinks.sh`** — wikilink validity: warns or blocks on dangling links in the written content.
4. **`protect-raw.sh`** — raw immutability: blocks any write to `vault/raw/` (source files are immutable).
5. **`validate-attachments.sh`** — attachment constraint: blocks writes that reference a non-existent `raw/assets/` attachment.

Two additional hooks reinforce the write contract:

- **`enforce-dmi.sh`** — blocks SKILL.md edits that add side-effecting verbs without `disable-model-invocation: true`.
- **`enforce-must-rule.sh`** — warns when a must/never/always rule is added to CLAUDE.md without a corresponding enforcement hook.

## Key Principles

- **Fail-closed by design.** If any script in the chain exits non-zero, the write is blocked before it lands. This is the opposite of the advisory read-path posture.
- **Read-path is advisory only.** The `scope-guard.sh` PreToolUse hook for Read/Grep/Glob emits a notice but never blocks. This distinction is documented in hooks.json: "reads warn; writes are gated."
- **Raw immutability is absolute.** `protect-raw.sh` is a hard block — no LLM write can modify a source file regardless of any other instruction.
- **Schema enforcement at write time.** The frontmatter validator parses the required-fields table from `vault/CLAUDE.md` at validation time; schema changes in CLAUDE.md take effect on the next write.

## Examples

A write to `vault/raw/sample.md` is intercepted by `protect-raw.sh` and blocked. The agent receives a non-zero exit code and must not retry the same write.

A write to `vault/wiki/agents/new-page.md` with `sources: ["Plain String Title"]` is intercepted by `validate-frontmatter.sh` and blocked because `sources:` must contain piped-basename wikilinks, not plain strings.

## Related Concepts

The write-path firewall is the operational realization of the security invariants declared in `vault/CLAUDE.md`. The commit backstop (`subagent-commit-gate.sh`) is the complementary SubagentStop hook that sweeps up any vault changes not yet committed after a write-path agent returns.
