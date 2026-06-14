---
title: "Parity Gate"
type: concept
aliases:
  [
    "Parity Gate",
    "parity gate",
    "dual-entry parity",
    "human-agent parity check",
    "router table parity",
  ]
parent: "[[claude-wiki-pages Plugin]]"
path: "plugin"
sources: ["[[ADR-0013: Design-Drift Gate]]", "[[Design: Sequences]]"]
related: ["[[Design-Drift Gate]]", "[[Node Grounding]]", "[[Software 3.0]]", "[[Shell-TS Parity]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "ci", "gates", "design"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Parity Gate

> [!summary]
> The parity gate is a sub-check within the [[Design-Drift Gate]] (ADR-0013) that validates the dual-entry router table in design documents. Every row of the table must have a non-empty human cell and a non-empty agent cell, and both cells must contain resolving links. The parity gate enforces the Software 3.0 posture: every project surface is equally usable by humans and agents.

## Key Principles

- Every dual-entry router row must have a non-empty human cell AND a non-empty agent cell, both containing resolving links — a row missing either cell fails the gate.
- The parity gate is a sub-check of the [[Design-Drift Gate]] (Check 5); it enforces the [[Software 3.0]] posture that every project surface is equally usable by humans and agents.
- The parity gate operates on documentation (design-level); [[Shell-TS Parity]] operates on implementation (bash ↔ TypeScript twins) — they are distinct invariants at different layers.
- Without the parity gate, the dual-entry contract degrades silently: developers add one column and leave the other blank because there is no CI consequence.
- The gate uses bash/grep/awk (no mermaid parser) so it runs in every CI environment, even without Node.

## Examples

A valid dual-entry row (parity gate passes):

| Surface      | Human                       | Agent                               |
| ------------ | --------------------------- | ----------------------------------- |
| Ingest       | `/claude-wiki-pages:wiki`   | `claude-wiki-pages-ingest-agent`    |
| Query        | `/claude-wiki-pages:query`  | `engine.sh search --json`           |

A failing row (human cell empty — gate rejects):

| Surface  | Human | Agent                            |
| -------- | ----- | -------------------------------- |
| Maintain |       | `claude-wiki-pages-maintenance-agent` |

## Definition

The dual-entry router table appears in design documents and maps each operation surface to both its human-invocable form and its agent-callable equivalent. Example:

| Surface      | Human                       | Agent                               |
| ------------ | --------------------------- | ----------------------------------- |
| Ingest       | `/claude-wiki-pages:wiki`   | `claude-wiki-pages-ingest-agent`    |
| Query        | `/claude-wiki-pages:query`  | `engine.sh search --json`           |
| Health check | `/claude-wiki-pages:doctor` | `verify-ingest.sh --target <vault>` |

The parity gate checks every row of this table:

1. **Non-empty human cell** — the human column must not be blank.
2. **Non-empty agent cell** — the agent column must not be blank.
3. **Resolving links** — any wikilinks or file paths in the cells must resolve (exist on disk or in the wiki).

A row where either cell is empty or contains a broken link fails the gate.

## Why Parity Matters

The [[Software 3.0]] posture (ADR-0013) states that every project surface must be equally usable by humans and agents. A surface with a human form but no agent form is incomplete — an agent cannot invoke it. A surface with an agent form but no human form lacks documentation for the human who needs to understand, audit, or debug it.

The parity gate is the mechanical enforcement of this principle. Without it, the dual-entry contract degrades silently: developers add one column and leave the other empty because there is no immediate CI consequence.

## Relationship to Shell-TS Parity

The parity gate (design-level) and [[Shell-TS Parity]] (implementation-level) enforce related but distinct invariants:

- **Parity gate**: every design-level operation surface has both a human form and an agent form, both documented.
- **Shell-TS parity**: the bash twin and TypeScript twin of a given enforcement script produce byte-aligned equivalent outputs.

Both are "parity" in the sense of "two things that must agree," but they operate at different layers. The parity gate operates on documentation; shell-TS parity operates on implementation.

## Related Concepts

- [[Design-Drift Gate]] — the overall Check 5 that contains the parity gate as one of five sub-checks
- [[Node Grounding]] — another sub-check in Check 5 that validates mermaid diagram nodes
- [[Software 3.0]] — the architectural posture that motivates the parity requirement
- [[Shell-TS Parity]] — the implementation-level analogue: bash and TypeScript twins must agree
