---
title: "Dual Entry Point"
type: concept
aliases: ["Dual Entry Point", "dual entry point", "SOFTWARE-3-0 pattern", "front door pattern", "dual reader"]
parent: "[[LLM]]"
path: "llm"
sources: ["[[SOFTWARE-3-0: Dual Entry Point]]"]
related: ["[[Six Surfaces Dual-Reader Contract]]", "[[Plugin Dev-Time vs Runtime]]", "[[Draft Review Surface]]", "[[Ingest Pipeline]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "architecture", "entry-point", "agent-contract"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Dual Entry Point

## Definition

The Dual Entry Point is the `SOFTWARE-3-0.md` pattern: a single file that serves as the front door to the `claude-wiki-pages` plugin repository for both a person and an agent. The file enforces one rule — it links, it never restates. Every surface of the project must be reachable from it with both a human and an agent on-ramp per row.

The pattern is dev-time only. `SOFTWARE-3-0.md` describes the plugin repository for contributors and for agents working on the project. It is not copied into a user's vault on install. At runtime, the session's on-ramp is the resolved vault's `CLAUDE.md`, surfaced by `scripts/session-start.sh`.

## Key Principles

**A file, not a portal.** The dual entry point is a plain markdown file, not a web page or an interactive menu. Its value is that it is equally readable by a human scrolling through it and by an agent loading it as context. The six-surfaces table (see [[Six Surfaces Dual-Reader Contract]]) is the file's core structure.

**Secure and traceable by construction.** The file documents three construction principles that make the plugin's writes safe and auditable:

1. **Write confinement** — every write is fenced to the resolved vault by `scripts/firewall.sh` (a PreToolUse hook). `raw/` is immutable. Vault resolution is handled by `scripts/resolve-vault.sh`.
2. **Structural provenance** — every claim traces to `raw/` via the schema's `sources`, `source_quotes`, `derived`, and `confidence` fields. No embeddings, no vector store: retrieval is wiki pages + wikilinks + frontmatter.
3. **Audit trail** — agent session learnings land as committed `source_type: agent-session` raw sources through the ADR-0010 carve-out and the `_proposed/` gate; maintenance activity is logged to `wiki/log.md`.

**Authoring flow.** A person and an agent author the same way: typed template → `skills/draft` writes to `_proposed/` → `skills/review` gates promotion into `wiki/`. Nothing reaches the wiki unreviewed. The ontology a page must conform to is the `ontology-profile-v1` contract in `docs/vault-example/CLAUDE.md` — read it, do not fork it.

**Dev-time vs runtime boundary.** The dual entry point is accessible at dev-time (contributor view). At runtime, a user's session on-ramp is the resolved vault's `CLAUDE.md`, not `SOFTWARE-3-0.md`. This boundary is maintained by the [[Plugin Dev-Time vs Runtime]] concept: the plugin ships only skills, agents, hooks, scripts, and rules into session context — not docs, tests, or changelogs.

## Examples

When an agent starts a session to work on the plugin repository, it loads `SOFTWARE-3-0.md` as its first orientation step — analogous to a contributor reading a README. The file tells the agent which skill to load next (`skills/engine-api` for tool operations, `skills/maintain-contract` for safe read/write order) before it takes any action.

## Related Concepts

- [[Six Surfaces Dual-Reader Contract]] — the six-row table that is the dual entry point's core structure
- [[Plugin Dev-Time vs Runtime]] — the boundary that determines what this file covers vs. what the runtime vault's CLAUDE.md covers
- [[Draft Review Surface]] — the engine gate that implements the \_proposed/ → wiki/ authoring path mentioned in this file
- [[Ingest Pipeline]] — the agent workflow that runs when new raw sources are added to the vault
