---
title: "deterministic engine"
type: concept
aliases: []
parent: "[[architecture-terms|Architecture terms]]"
path: "glossary/architecture-terms"
sources: ["[[docs-glossary|Canonical Glossary]]"]
related: []
tags: ["glossary", "architecture-terms", "terminology"]
created: 2026-06-26
updated: 2026-06-26
update_count: 1
status: active
confidence: 0.9
---

# deterministic engine

## Definition

The Bun CLI (`src/cli/cli.ts`) that validates the vault and runs quality checks. Same input always produces the same result; requires Bun ≥ 1.2. Self-describes via `capabilities --json` and `ontology --json`; no embeddings, no inference — every operation is a deterministic parse or check.

## Key Principles

- The Bun CLI (`src/cli/cli.ts`) that validates the vault and runs quality checks.
- Canonical term in the claude-wiki-pages **Architecture terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `src/cli/cli.ts`
- `capabilities --json`
- `ontology --json`

## Related Concepts

Part of the **Architecture terms** group: claude-wiki-pages, verify (engine verb), lint (engine verb), fail-closed engine bridge, four-layer stack, Layer 1 — Data, Layer 2 — Skills, Layer 3 — Agents, Layer 4 — Orchestration, skill, agent, command.
