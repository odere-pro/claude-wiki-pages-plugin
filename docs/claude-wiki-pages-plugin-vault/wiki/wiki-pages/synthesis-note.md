---
title: "Synthesis Note"
type: concept
aliases: ["Synthesis Note", "synthesis note", "synthesis notes", "_synthesis", "cross-topic analysis"]
parent: "[[Wiki Pages]]"
path: "wiki-pages"
sources: ["[[User Guide 05: Export Outputs]]", "[[User Guide 07: Query the Wiki]]", "[[Analyst Agent]]"]
related: ["[[Analyst Agent]]", "[[Challenge Mode]]", "[[Query Rules]]", "[[Grounded Retrieval]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "wiki-pages", "synthesis"]
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Synthesis Note

> [!summary]
> A synthesis note is a higher-order analysis page stored in `wiki/_synthesis/`. It is the wiki's permanent record of a multi-page reasoning result — a cross-topic comparison, theme, contradiction, gap analysis, or timeline — produced by the [[Analyst Agent]] and offered for permanent filing when a query answer reveals novel insight. Synthesis notes are distinct from `vault/output/` deliverables: they are schema-tracked knowledge, not scratch deliverables.

## Definition

Synthesis notes (`type: synthesis`) live in `wiki/_synthesis/` and represent the wiki's reasoning tier. Where an entity or concept page records what is known about a single thing, a synthesis note records what follows when multiple things are compared, contrasted, or traced through time.

Five synthesis types are defined:
- `comparison` — contrasting two or more entities, decisions, or approaches
- `theme` — a pattern or recurring principle across multiple sources
- `contradiction` — a conflict between two or more sourced claims
- `gap` — something the wiki does not yet cover that evidence points to
- `timeline` — a chronological narrative of how a concept evolved

## Frontmatter Schema

```yaml
---
title: "Synthesis Title"
type: synthesis
synthesis_type: comparison | theme | contradiction | gap | timeline
path: "_synthesis"
scope: ["[[Firewall]]", "[[Multi-Vault Registry]]", "[[Deterministic Engine]]"]
sources: ["[[ADR-0009: Multi-Vault Registry and Per-Vault Write Confinement]]", "[[ADR-0016: Simultaneous Multi-Vault Management]]"]
tags: []
created: 2026-04-16
updated: 2026-04-16
status: active | draft | stale
confidence: 0.7
---
```

`scope` lists the pages that were consulted during the synthesis. `sources` lists the raw source notes that grounded those pages. Synthesis notes typically carry a lower `confidence` than entity or concept pages because they represent inference, not direct statement.

## Relationship to Query Output

The [[Analyst Agent]] produces synthesis output as part of its `query` and `document compile` modes. When a query answer reveals a cross-cutting insight that the wiki does not already capture, the agent offers to file it as a synthesis note. This is not automatic: the user must explicitly request filing. The reasoning is that many query answers are context-specific and do not belong in the permanent knowledge base.

The key distinction drawn by User Guide 05: **synthesis goes in `wiki/_synthesis/`, deliverables go in `vault/output/`**. A synthesis note is reasoning the wiki should remember. A `vault/output/` file is a document produced for a specific audience and purpose.

## Synthesis Notes vs. Outputs

| Property | Synthesis Note | `vault/output/` file |
| --- | --- | --- |
| Location | `wiki/_synthesis/` | `vault/output/` |
| Schema | Full frontmatter required | None — plain markdown |
| Tracked by index | Yes | No |
| Validated by lint | Yes | No |
| Git-tracked | Yes | No (gitignored) |
| Purpose | Permanent wiki knowledge | Context-specific deliverable |

## Related Concepts

- [[Analyst Agent]] — produces synthesis output and offers to file it
- [[Challenge Mode]] — a query mode that surfaces contradictions and gaps, often resulting in synthesis notes
- [[Query Rules]] — the full query workflow including the `## Sources` section contract
- [[Grounded Retrieval]] — how pages are selected for the context window that feeds synthesis
