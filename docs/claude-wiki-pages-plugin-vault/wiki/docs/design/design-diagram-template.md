---
title: "Design Diagram Template"
type: concept
aliases: ["design-diagram-template", "Design Diagram Template", "C4 diagram template"]
parent: "[[design|Design]]"
path: "docs/design"
sources: ["[[docs-design-template|Design Diagram Template]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "design", "conventions"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Design Diagram Template

The canonical template for all C4-style mermaid diagrams in `docs/design/` — defines required front matter, standard sections, and the node grounding convention.

## Definition

The `_template.md` file in `docs/design/` is the single source of truth for how to author a new diagram in the design directory. Every diagram must have: a zoom level label, a perspective label, an authority link, and grounded nodes.

## Key Principles

**Required sections:** Purpose (one sentence: what question does this diagram answer?), Diagram (one mermaid fence with grounded nodes), Reading guide (three bullets or fewer: key invariants enforced), See also (cross-link to adjacent zoom level or authority doc).

**Four zoom levels:** L0 Context (who uses the system and what does it touch?), L1 Containers/Layers (what are the big moving parts?), L2 Components (what is inside each layer?), L3 Sequences (step-by-step key flows).

**Node grounding convention.** Every node in a diagram must reference a real repo entity — a file, skill, agent, hook, or script that exists in the tree. A node that names nothing real must be marked `[speculative]`. The `[speculative]` marker exempts the doc from Check 5a (node grounding) of the design-drift gate (ADR-0013).

**One fence per diagram.** If a diagram needs a second idea, start a new diagram rather than overloading one. Keep diagrams focused.

## Examples

The `[speculative]` marker is the documented escape hatch for placeholder diagrams during active development. Once every node is grounded in a real repo entity, the marker is removed and the design-drift gate begins enforcing the doc.

## Related Concepts

The design-drift gate (ADR-0013 Check 5a) enforces node grounding as a CI requirement. The design README (`docs/design/README.md`) describes all seven perspectives and their zoom levels.
