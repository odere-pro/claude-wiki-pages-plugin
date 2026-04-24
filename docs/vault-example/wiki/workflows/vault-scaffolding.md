---
title: "Vault Scaffolding"
type: concept
aliases: ["Vault Scaffolding", "vault-scaffolding"]
parent: "[[Workflows — Index]]"
path: "workflows"
sources:
  - "[[Getting Started]]"
  - "[[Create a New Vault]]"
related: ["[[Ingest Pipeline]]", "[[llm-wiki-stack]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["workflow", "onboarding"]
created: 2026-04-24
updated: 2026-04-24
update_count: 1
status: active
confidence: 0.8
---

# Vault Scaffolding

## Definition

The one-time workflow for standing up a new `vault/` in a project. Invoked as `/llm-wiki-stack:llm-wiki`. Copies an empty starter scaffold into the project, writes the per-vault `CLAUDE.md`, and persists the chosen vault path into `.claude/llm-wiki-stack/settings.json` so subsequent sessions resolve it automatically.

## Key Principles

- Runs once per project. Re-running on a populated vault is a no-op that reports the current state.
- The scaffold contains `CLAUDE.md`, `_templates/`, empty `raw/` + `raw/assets/`, and a `wiki/` with empty `_sources/`, `_synthesis/`, and minimal valid `index.md` / `log.md`. No sample content.
- Topic folders (`patterns/`, `tools/`, etc.) are not created up front — the ingest pipeline creates them on demand when a source introduces a new topic.
- Two vaults from the same plugin install in different projects are fully independent.

## Examples

- Fresh project: `/llm-wiki-stack:llm-wiki` — scaffolds at the default path `docs/vault`.
- Custom path: `/llm-wiki-stack:llm-wiki my vault is docs/my-research`.
- Second vault in a second project: run the same command from that project's directory.

## Related Concepts

- [[Ingest Pipeline]] — the next step after scaffolding.
