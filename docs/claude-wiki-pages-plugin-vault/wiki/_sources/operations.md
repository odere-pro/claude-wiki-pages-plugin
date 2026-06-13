---
title: "Operations Guide"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["reference", "operations", "vault"]
aliases: ["Operations Guide"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Operations Guide

## Summary

The one verb (`/claude-wiki-pages:wiki`), day-to-day verbs, power-user bypasses, single-purpose skills, draft review gate, offline/degraded mode, vault location, multi-vault registry, and hook lifecycle.

## Key Claims

- Entry verb: `/claude-wiki-pages:wiki` — orchestrator routes to: init wizard, ingest pipeline, curator, analyst, or review gate, based on vault state.
- Power-user bypasses: call agents directly to skip orchestrator state probe.
- Single-purpose skills: ingest, lint, fix, synthesize, index, markdown, obsidian-graph-colors.
- Offline mode: `offlinePolicy` + `tier` config; `reachability.sh` + `engine route` + `offline-draft.sh`.
- Vault resolution 4-tier: env var > settings.json > auto-detect > default `docs/vault`.
- Registry invariant: `current_vault_path` must be in `vaults[]`; violation = fail-closed.
- Hook lifecycle: SessionStart, UserPromptSubmit, any Write/Edit (multiple hooks), after Write/Edit (post hooks), SubagentStop (lint gate + ingest gate + commit backstop).

## Entities Mentioned

- [[Orchestrator Agent]]
- [[Ingest Agent]]
- [[Curator Agent]]
- [[Analyst Agent]]
- [[Firewall]]

## Concepts Covered

- [[Vault Resolution]]
- [[Multi-Vault Registry]]
- [[Offline Policy]]
- [[Hook System]]
