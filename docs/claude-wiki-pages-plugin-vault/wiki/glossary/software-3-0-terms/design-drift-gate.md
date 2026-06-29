---
title: "design-drift gate"
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

# design-drift gate

## Definition

Also: `node grounding`. The `validate-docs.sh` Check 5 added by ADR-0013, scanning `docs/design/*.md` and `SOFTWARE-3-0.md` for five categories of drift: (a) mermaid nodes naming a path that no longer exists, (b) dead relative links, (c) hook/script names not matching `hooks/hooks.json`, (d) count assertions in `06-feature-relations.md` differing from reality, (e) missing Authority links. Uses grep/awk/bash only (Tier-0); no mermaid parser.

## Key Principles

- Also: `node grounding`.
- Canonical term in the claude-wiki-pages **Software 3.0 and design terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `node grounding`
- `validate-docs.sh`
- `docs/design/*.md`
- `SOFTWARE-3-0.md`
- `hooks/hooks.json`

## Related Concepts

Part of the **Software 3.0 and design terms** group: Software 3.0, dual entry point, parity gate, node grounding, [speculative].
