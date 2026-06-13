---
title: "Design Diagrams"
type: concept
aliases: ["Design Diagrams", "design diagrams", "C4 diagrams", "mermaid diagrams"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Design README]]", "[[Design: System Context]]", "[[Design: Component Design]]", "[[Design: Sequences]]", "[[Design: Teams and Agents]]", "[[Design: Claude Config and Security]]", "[[Design: Feature Relations]]", "[[Design: Ontology]]", "[[Design Diagram Template]]"]
related: ["[[Four-Layer Stack]]", "[[Design-Drift Gate]]", "[[Node Grounding]]"]
tags: ["concept", "design"]
created: 2026-06-13
updated: 2026-06-13
update_count: 9
status: active
confidence: 1.0
---

# Design Diagrams

## Definition

The design diagrams are committed mermaid markdown files in `docs/design/` that visualize the plugin architecture at C4-style zoom levels. They are the visual half of the `SOFTWARE-3-0.md` dual entry point and stay DRY by linking authorities rather than restating them.

## Key Principles

- **C4 zoom levels:** L0 (Context — who uses it), L1 (Containers/Layers — four-layer stack), L2 (Components — skills/agents/hooks wired), L3 (Sequences — step-by-step flows).
- **Node grounding:** every node in a diagram must reference a real repo entity. Ungrounded nodes use the `[speculative]` marker.
- **Layer names are Title Case:** "Layer 1 — Data", not "data layer" or "layer-1".
- **No RAG/embeddings** anywhere in the design — retrieval is wiki pages + wikilinks + frontmatter.
- **Gate-checked:** the design-drift gate (ADR-0013) scans diagrams for five categories of drift.

## Examples

Seven diagram files cover seven perspectives:

| File | Perspective |
| --- | --- |
| `01-system-context.md` | L0/L1 — who uses the system, four-layer stack |
| `02-component-design.md` | L2 — hooks, skills, engine as components |
| `03-sequences.md` | L3 — ingest write-path, agent write-back |
| `04-teams-and-agents.md` | Dev teams + 7 runtime agents |
| `05-claude-config-security.md` | Config, security, isolation, multi-vault |
| `06-feature-relations.md` | Claude Code platform vs plugin-defined features |
| `07-ontology.md` | ER-style ontology predicate diagram |

## Related Concepts

- [[Four-Layer Stack]] — what the diagrams visualize
- [[Design-Drift Gate]] — the CI check that keeps diagrams grounded
- [[Node Grounding]] — the requirement every node references a real entity
