---
title: "speculative"
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

# speculative

## Definition

A design-doc marker that exempts an unresolved mermaid node, fence, or diagram from the node-grounding check (5a of ADR-0013). Used when a diagram depicts a planned-but-not-yet-built path; the marker must appear in the block or doc carrying the ungrounded node. A `[speculative]` node or fence always passes the gate even if its path token does not resolve.

## Key Principles

- A design-doc marker that exempts an unresolved mermaid node, fence, or diagram from the node-grounding check (5a of ADR-0013).
- Canonical term in the claude-wiki-pages **Software 3.0 and design terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `[speculative]`

## Related Concepts

Part of the **Software 3.0 and design terms** group: Software 3.0, dual entry point, parity gate, design-drift gate, node grounding.
