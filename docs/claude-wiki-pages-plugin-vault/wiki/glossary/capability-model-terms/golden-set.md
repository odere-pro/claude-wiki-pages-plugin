---
title: "golden set"
type: concept
aliases: []
parent: "[[capability-model-terms|Capability and model terms]]"
path: "glossary/capability-model-terms"
sources: ["[[docs-glossary|Canonical Glossary]]"]
related: []
tags: ["glossary", "capability-model-terms", "terminology"]
created: 2026-06-26
updated: 2026-06-26
update_count: 1
status: active
confidence: 0.9
---

# golden set

## Definition

A checked-in fixtures set of raw-source inputs paired with their expected structured output (frontmatter plus claims), used as the deterministic reference for the local-model quality-gate eval. Output is scored by exact comparison to the golden set, never by vector similarity.

## Key Principles

- A checked-in fixtures set of raw-source inputs paired with their expected structured output (frontmatter plus claims), used as the deterministic reference for the local-model quality-gate eval.
- Canonical term in the claude-wiki-pages **Capability and model terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- Defined in `docs/GLOSSARY.md`; see the Canonical Glossary overview for usage in context.

## Related Concepts

Part of the **Capability and model terms** group: capability tier, capability progression, degraded mode, model-agnostic, quality gate, over-citation, approved local model, offline policy, reachability probe, degraded-mode routing, offline draft, query tier.
