---
title: "verify (engine verb)"
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

# verify (engine verb)

## Definition

The error-tier integrity verb of the deterministic engine (`src/commands/verify/`). Checks structural validity — schema, provenance, required fields; ERROR-severity findings drive a non-zero exit code, so `verify` **gates** a write. The error-tier twin of `lint (engine verb)`; both compose from the one `src/core/report.ts` Report model. Distinct from the Layer-2 `lint` skill and the user-facing `lint` verb. See ADR-0034.

## Key Principles

- The error-tier integrity verb of the deterministic engine (`src/commands/verify/`).
- Canonical term in the claude-wiki-pages **Architecture terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `src/commands/verify/`
- `verify`
- `lint (engine verb)`
- `src/core/report.ts`
- `lint`

## Related Concepts

Part of the **Architecture terms** group: claude-wiki-pages, deterministic engine, lint (engine verb), fail-closed engine bridge, four-layer stack, Layer 1 — Data, Layer 2 — Skills, Layer 3 — Agents, Layer 4 — Orchestration, skill, agent, command.
