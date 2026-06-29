---
title: "context contract"
type: concept
aliases: []
parent: "[[context-okf-terms|Context layering and OKF interop terms]]"
path: "glossary/context-okf-terms"
sources: ["[[docs-glossary|Canonical Glossary]]"]
related: []
tags: ["glossary", "context-okf-terms", "terminology"]
created: 2026-06-26
updated: 2026-06-26
update_count: 1
status: active
confidence: 0.9
---

# context contract

## Definition

A machine-readable `## Context contract` table in a maintenance skill or agent `SKILL.md` that declares which vault paths the skill reads (inputs L4), which it uses for schema reference (reference L3), and which it writes (outputs). Parsed by `parseContextContract()` in `src/core/ontology-profile.ts` and consumed by the `engine context` verb.

## Key Principles

- A machine-readable `## Context contract` table in a maintenance skill or agent `SKILL.md` that declares which vault paths the skill reads (inputs L4), which it uses for schema reference (reference L3), and which it writes (outputs).
- Canonical term in the claude-wiki-pages **Context layering and OKF interop terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `## Context contract`
- `SKILL.md`
- `parseContextContract()`
- `src/core/ontology-profile.ts`
- `engine context`

## Related Concepts

Part of the **Context layering and OKF interop terms** group: OKF, OKF bundle, context layers.
