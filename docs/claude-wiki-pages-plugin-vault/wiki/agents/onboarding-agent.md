---
title: "Onboarding Agent"
type: entity
entity_type: tool
aliases: ["Onboarding Agent", "onboarding agent", "claude-wiki-pages-onboarding-agent"]
parent: "[[Agent Roles]]"
path: "agents"
sources: ["[[architecture]]", "[[operations]]"]
related: ["[[Orchestrator Agent]]"]
tags: [agent, onboarding, first-run]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 0.9
---

# Onboarding Agent

**`claude-wiki-pages-onboarding-agent`** — guided first-run wizard.

## Responsibilities

Walks a brand-new user from a fresh project to a working, queryable wiki:

1. Health check — verify git is initialized, `CLAUDE.md` is present, `wiki/` exists.
2. Scaffold — create the vault structure if missing (copies `docs/vault-example/` to the resolved vault path).
3. Add a source — prompt the user to drop a source file into `raw/`.
4. Ingest — run one ingest pass (git-checkpointed, auto-heal enabled).
5. First answer — demonstrate a cited query against the freshly ingested wiki.

Plain-language explanation after each step; no technical jargon.

## Invocation

Invoked by the [[Orchestrator Agent]] when no vault exists (first run). Also available directly via `/claude-wiki-pages:onboarding`.

## Idempotency

Probes state before each step and resumes from the first incomplete step. Never restarts work already done. Safe to re-run if onboarding is interrupted.
