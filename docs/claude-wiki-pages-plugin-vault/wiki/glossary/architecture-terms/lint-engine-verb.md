---
title: "lint (engine verb)"
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

# lint (engine verb)

## Definition

The WARN-tier advisory-audit verb of the deterministic engine (new — `src/commands/lint/`). Reports quality/curation/drift signals as `warn`-severity findings only; WARN never changes the exit code, so `lint` **advises** and never blocks a write or fails a gate. The advisory twin of `verify (engine verb)`; the deterministic engine-side of the Layer-2 `lint` skill, which delegates its mechanical audit to it rather than re-implementing it. See ADR-0034.

## Key Principles

- The WARN-tier advisory-audit verb of the deterministic engine (new — `src/commands/lint/`).
- Canonical term in the claude-wiki-pages **Architecture terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `src/commands/lint/`
- `warn`
- `lint`
- `verify (engine verb)`

## Related Concepts

Part of the **Architecture terms** group: claude-wiki-pages, deterministic engine, verify (engine verb), fail-closed engine bridge, four-layer stack, Layer 1 — Data, Layer 2 — Skills, Layer 3 — Agents, Layer 4 — Orchestration, skill, agent, command.
