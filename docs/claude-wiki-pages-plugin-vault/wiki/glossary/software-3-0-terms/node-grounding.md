---
title: "node grounding"
type: concept
aliases: []
parent: "[[software-3-0-terms|Software 3.0 and design terms]]"
path: "glossary/software-3-0-terms"
sources: ["[[docs-glossary|Canonical Glossary]]"]
related: []
tags: ["glossary", "software-3-0-terms", "terminology"]
created: 2026-06-26
updated: 2026-06-26
update_count: 1
status: active
confidence: 0.9
---

# node grounding

## Definition

The requirement that every path-shaped token (a directory form or a known-extension file reference) inside a mermaid fence resolves to a real repo path or is covered by a `[speculative]` marker. Prose labels with no path-shaped token contribute nothing to grounding (the false-positive bound). See `design-drift gate`.

## Key Principles

- The requirement that every path-shaped token (a directory form or a known-extension file reference) inside a mermaid fence resolves to a real repo path or is covered by a `[speculative]` marker.
- Canonical term in the claude-wiki-pages **Software 3.0 and design terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `[speculative]`
- `design-drift gate`

## Related Concepts

Part of the **Software 3.0 and design terms** group: Software 3.0, dual entry point, parity gate, design-drift gate, [speculative].
