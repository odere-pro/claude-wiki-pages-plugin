---
title: "Design Diagrams"
type: concept
aliases: ["Design Diagrams", "design diagrams", "C4 diagrams", "mermaid diagrams"]
parent: "[[claude-wiki-pages Plugin]]"
path: "plugin"
sources: ["[[Design README]]", "[[Design: System Context]]", "[[Design: Component Design]]", "[[Design: Sequences]]", "[[Design: Teams and Agents]]", "[[Design: Claude Config and Security]]", "[[Design: Feature Relations]]", "[[Design: Ontology]]", "[[Design Diagram Template]]"]
related: ["[[Four-Layer Stack]]", "[[Design-Drift Gate]]", "[[Hook System]]", "[[Orchestrator Agent]]"]
tags: ["concept", "design"]
created: 2026-06-13
updated: 2026-06-13
update_count: 9
status: active
confidence: 1.0
---

# Design Diagrams

> [!summary]
> The design diagrams are committed mermaid markdown files in `docs/design/` that visualize the plugin architecture at C4-style zoom levels across seven perspectives. They are gate-checked by the design-drift gate (ADR-0013) and serve as the visual half of the `SOFTWARE-3-0.md` dual entry point. Every diagram node must reference a real repo entity.

## Definition

The design diagrams are versioned, diffable mermaid diagrams committed as Markdown in `docs/design/`. They are the visual half of the `SOFTWARE-3-0.md` dual-entry-point contract and stay DRY by linking to the authorities (`docs/architecture.md`, the schema, `hooks/hooks.json`) rather than restating them. Diagrams are readable by both humans and agents from the same source.

## Zoom Levels (C4-Style)

C4 is a four-level zoom convention — Context → Container → Component → Code — applied here as:

| Level | Question it answers | Files |
| --- | --- | --- |
| L0 — Context | Who uses the system, and what does it touch? | `01-system-context.md` |
| L1 — Containers/Layers | What are the big moving parts (four-layer stack + engine + vault)? | `01-system-context.md` |
| L2 — Components | What is inside each layer, and how do they wire together? | `02-component-design.md` |
| L3 — Sequences | What happens step by step on the key flows? | `03-sequences.md` |

## Seven Perspectives

| File | Perspective |
| --- | --- |
| `01-system-context.md` | L0/L1 — system context and four-layer stack |
| `02-component-design.md` | L2 — hooks, skills, engine as components; recurring design patterns |
| `03-sequences.md` | L3 — ingest write-path, SessionStart, agent write-back with human approval |
| `04-teams-and-agents.md` | Dev teams + 7 runtime agents and how they relate |
| `05-claude-config-security.md` | Config, security, isolation, multi-vault structure |
| `06-feature-relations.md` | Claude Code platform features vs plugin-defined features |
| `07-ontology.md` | ER-style predicate diagram from `ontology-profile-v1` |

## Key Conventions

- **One fence per diagram:** one mermaid block, one idea. Zoom in with a new diagram rather than overloading one.
- **Node grounding:** every path-shaped token inside a mermaid fence must resolve to a real repo path or carry a `[speculative]` marker. Prose labels with no path-shaped token are not subject to grounding.
- **Layer names are Title Case:** "Layer 1 — Data", not "data layer" or "layer-1" — enforced by the glossary gate.
- **No RAG / no embeddings** anywhere in the design. If a diagram implies similarity search, it is wrong.
- **Render targets:** GitHub, Obsidian, and most IDEs render mermaid natively. Agents read the fenced source directly.

## What the L0 Diagram Shows

The system has two co-equal first-class users: a person (in Obsidian or a terminal) and an agent (Claude or a local model). Both reach the same surfaces through the `SOFTWARE-3-0.md` dual entry point. External systems are thin: Obsidian renders, git records, Ollama (optional) only generates text — none of them do retrieval (no embeddings).

## Design-Drift Gate

The [[Design-Drift Gate]] (`validate-docs.sh` Check 5, added in ADR-0013) scans `docs/design/*.md` and `SOFTWARE-3-0.md` for five categories of drift:

1. Mermaid nodes naming a path that no longer exists
2. Dead relative links
3. Hook/script names not matching `hooks/hooks.json`
4. Count assertions in `06-feature-relations.md` differing from reality
5. Missing Authority links

The gate runs in CI Tier 0 using grep/awk/bash only — no mermaid parser.

## Related Concepts

- [[Four-Layer Stack]] — what the diagrams visualize at L1
- [[Design-Drift Gate]] — the CI check that keeps diagrams grounded
- [[Hook System]] — whose wiring is visualized in `02-component-design.md`
- [[Orchestrator Agent]] — the agent visualized in `04-teams-and-agents.md`
