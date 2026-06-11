---
title: "Operations (source)"
type: source
source_type: manual
source_format: text
author: ""
publisher: "claude-wiki-pages"
date_published: 2026-06-11
date_ingested: 2026-06-11
tags: [operations, commands, vault-management, hooks]
aliases: ["Operations (source)"]
sources: []
created: 2026-06-11
updated: 2026-06-11
status: active
confidence: 1.0
---

# Operations

## Summary

Day-to-day operating guide for `claude-wiki-pages`. Covers the single verb (`/claude-wiki-pages:wiki`), orchestrator routing table, guided first run via `/claude-wiki-pages:onboarding`, day-to-day verbs, power-user bypasses, single-purpose skills, the draft review gate, offline/degraded mode (ADR-0018), vault location resolution, multi-vault registry, hook event table, and step-by-step walkthroughs in `docs/llm-wiki/`.

## Key Claims

- `/claude-wiki-pages:wiki` is the single recommended entry; the orchestrator probes vault state and dispatches to the right specialist automatically.
- Orchestrator routing: no vault → init wizard; raw files not in log → ingest; previous ingest without lint → curator; analytical prompt → analyst; pending drafts → review gate.
- Doctor: `/claude-wiki-pages:doctor` runs 10 checks (D01–D10); `--fix` auto-repairs the fixable subset.
- Power-user bypasses: call `-ingest-agent`, `-curator-agent`, `-analyst-agent`, or `-polish-agent` directly to skip state probe.
- Draft review gate: all drafted content routes through a single `_proposed/` channel; `src/commands/propose/propose.ts`.
- Offline/degraded mode: `offlinePolicy` (off/prefer-local/strict) + `tier`; three Layer 4 pieces implement it (`reachability.sh`, `engine.sh route`, `offline-draft.sh`, `offline-query.sh`).
- Vault resolution: 4-tier order — env var → settings.json → auto-detect → default.
- Multi-vault registry: `.claude/claude-wiki-pages/settings.json`; exactly one active vault; firewall enforces write confinement. Registry invariant: `current_vault_path` must equal exactly one `vaults[].path`.
- Hook events: SessionStart, UserPromptSubmit, any Write/Edit, after Write/Edit, Subagent finishes.

## Entities Mentioned

- [[claude-wiki-pages]]
- [[claude-wiki-pages-orchestrator-agent]]
- `scripts/resolve-vault.sh`
- `scripts/firewall.sh`
- `scripts/reachability.sh`
- `scripts/offline-draft.sh`
- `scripts/offline-query.sh`

## Concepts Covered

- [[One Advertised Path]]
- [[Orchestrator Routing]]
- [[Doctor]]
- [[Draft Review Gate]]
- [[Offline Mode]]
- [[Degraded Mode Routing]]
- [[Vault Location Resolution]]
- [[Multi-Vault Registry]]
- [[Per-Vault Write Confinement]]
- [[Hook-Enforced Safety]]
