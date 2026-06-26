---
title: "context layers"
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

# context layers

## Definition

The L0–L4 decomposition of the file set available to a skill turn: L0 = vault schema + vocabulary, L1 = MOC hierarchy, L2 = topic pages, L3 = source summaries, L4 = raw sources. The `engine context` verb resolves each layer for a named skill and reports the file lists plus a token estimate.

## Key Principles

- The L0–L4 decomposition of the file set available to a skill turn: L0 = vault schema + vocabulary, L1 = MOC hierarchy, L2 = topic pages, L3 = source summaries, L4 = raw sources.
- Canonical term in the claude-wiki-pages **Context layering and OKF interop terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `engine context`

## Related Concepts

Part of the **Context layering and OKF interop terms** group: context contract, OKF, OKF bundle.
