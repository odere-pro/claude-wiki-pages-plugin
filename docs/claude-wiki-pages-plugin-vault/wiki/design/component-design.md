---
title: "Component Design"
type: concept
aliases: ["Component Design", "component design", "L2 component design"]
parent: "[[Design]]"
path: "design"
sources: ["[[02-component-design]]"]
related: ["[[System Context]]", "[[Hook System]]", "[[Orchestration Layer]]"]
tags: [design, components, hooks]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 0.9
---

# Component Design

L2 — Component design zooms into the layers. Components are real files; patterns are the recurring shapes that keep the system coherent.

## Orchestration Components (Layer 4) — Hooks → Scripts

Every hook event fans out to deterministic bash scripts. This is the enforcement spine.

**`SessionStart`** → `session-start.sh` (resolve vault, emit MOC pointer), `heartbeat.sh` (backlog advisory)

**`UserPromptSubmit`** → `prompt-guard.sh` (untrusted-input guard)

**`PreToolUse` (Write/Edit)** → in order: `firewall.sh`, `validate-frontmatter.sh`, `check-wikilinks.sh`, `protect-raw.sh`, `validate-attachments.sh`, `enforce-dmi.sh`, `enforce-must-rule.sh`

**`PostToolUse` (Write/Edit)** → `post-wiki-write.sh` (index reminder), `post-ingest-summary.sh` (count summary)

**`SubagentStop`** → `subagent-lint-gate.sh`, `subagent-ingest-gate.sh`, `subagent-commit-gate.sh`

**`Stop` / `SessionEnd`** → `session-memory.sh`

## Agent Components (Layer 3)

Seven agents, each a markdown file in `agents/`. The orchestrator reads vault state and dispatches; specialists execute. No specialist re-probes state.

## Skills Components (Layer 2)

24 skills, each a directory in `skills/` with a `SKILL.md` contract file. Each skill is single-responsibility and independently testable in Tier 1 Bats.

## Engine (Layer 4 Tool)

The Bun CLI (`src/cli/cli.ts`) implements ten verified verbs: `verify`, `fix`, `search`, `backlog`, `propose`, `migrate`, `route`, `doctor`, `snapshot`, `firewall`. Self-describes via `capabilities --json` (ADR-0015). No inference, no embeddings — every operation is a deterministic parse or check.

See [[Hook System]] for the full hook contract, and [[System Context]] for the layer diagram.
