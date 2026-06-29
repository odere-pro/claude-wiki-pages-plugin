---
title: "parity gate"
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

# parity gate

## Definition

A CI assertion that enforces the "equally usable" contract: every row of the `SOFTWARE-3-0.md` dual-entry router must have a non-empty human cell and a non-empty agent cell, each with a resolving link. A single-ramped row fails the build and names the offending surface. Implemented as assertion 5f inside `scripts/validate-docs.sh` Check 5 (ADR-0013).

## Key Principles

- A CI assertion that enforces the "equally usable" contract: every row of the `SOFTWARE-3-0.md` dual-entry router must have a non-empty human cell and a non-empty agent cell, each with a resolving link.
- Canonical term in the claude-wiki-pages **Software 3.0 and design terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `SOFTWARE-3-0.md`
- `scripts/validate-docs.sh`

## Related Concepts

Part of the **Software 3.0 and design terms** group: Software 3.0, dual entry point, design-drift gate, node grounding, [speculative].
