---
title: "Design Sequences"
type: concept
aliases: ["design-sequences", "Design Sequences", "L3 sequences", "sequence diagrams"]
parent: "[[design|Design]]"
path: "design"
sources: ["[[docs-design-sequences|Design — Sequences (L3)]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "design", "architecture", "ingest"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Design Sequences

The four key step-by-step interaction flows in the claude-wiki-pages plugin, shown as mermaid sequence diagrams at L3 (code-level) detail.

## Definition

The sequences document (`docs/design/03-sequences.md`) shows when hooks fire and where gates sit across four flows: vault resolution on session start, the ingest write-path through the PreToolUse cluster, agent write-back with human approval, and durable memory on session end.

## Key Principles

**SessionStart flow.** Claude Code calls `session-start.sh`, which calls `resolve-vault.sh` (four-tier resolution). The resolved vault path and an on-ramp pointer are emitted to the session. The vault's `CLAUDE.md` is read as the schema authority.

**Ingest write-path.** A person or agent calls the ingest skill. The skill classifies via `engine.sh`, then issues a `Write page` call. That call passes through the full PreToolUse chain in order: (1) `firewall.sh` — confine to vault; (2) `validate-frontmatter.sh`; (3) `check-wikilinks.sh`; (4) `protect-raw.sh` — raw/ immutable; (5) `validate-attachments.sh`. Any check failure blocks the write (fail-closed). On success, `PostToolUse` runs `post-wiki-write.sh` and `post-ingest-summary.sh`.

**Agent write-back.** An agent drafts to `_proposed/`. The firewall blocks any direct write to `wiki/`. A human reviewer promotes via the review skill (git-checkpointed) or rejects. No agent self-approval on the default path.

**Durable memory.** On `Stop`/`SessionEnd`, if `CLAUDE_WIKI_PAGES_SESSION_SCRATCH` is set, `session-memory.sh` writes to `raw/agent-sessions/` (ADR-0010 carve-out). If the env var is absent, the hook is a no-op.

## Examples

The ingest write-path sequence makes the PreToolUse order explicit: firewall is always first (confinement before validation), and a failure at any stage blocks the write without reaching the vault.

## Related Concepts

The hook ordering is defined in `hooks/hooks.json` (authority for the ingest sequence). The durable-memory carve-out is specified in ADR-0010.
