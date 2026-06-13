---
title: "Node Grounding"
type: concept
aliases: ["Node Grounding", "node grounding", "mermaid node grounding", "grounded node", "speculative marker"]
parent: "[[Decisions]]"
path: "decisions"
sources: ["[[ADR-0013: Design-Drift Gate]]", "[[Design README]]", "[[Design Diagram Template]]"]
related: ["[[Design-Drift Gate]]", "[[Parity Gate]]", "[[Software 3.0]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "ci", "gates", "design"]
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Node Grounding

> [!summary]
> Node grounding is the property of a mermaid diagram node naming a file or path that exists on disk at CI gate time. Ungrounded nodes (paths that do not exist) are a drift violation caught by Check 5 of `scripts/validate-docs.sh`. A node annotated `[speculative]` is explicitly exempted from the grounding check.

## Definition

Mermaid diagrams in `docs/design/*.md` serve as architectural blueprints that are expected to reflect the implemented codebase. Node grounding is the CI-enforced contract that keeps them honest: every node that names a file or directory path must resolve to a real path on disk.

A node is considered ungrounded when:
- It names a path (e.g., `scripts/missing.sh`) that does not exist under the repo root
- It names a module or component (e.g., `src/core/missing.ts`) that has been removed or renamed

**The check runs at CI time (gate time), not at document-write time.** This means a diagram can be correct when written and become ungrounded later when the named path is deleted or renamed. This is the "drift" that ADR-0013 was designed to catch.

## The `[speculative]` Exemption

Design documents legitimately contain aspirational content — paths or components that are planned but not yet built. Requiring every aspirational node to be immediately grounded would make it impossible to use diagrams as design tools.

The solution: nodes annotated with `[speculative]` in the mermaid source are exempted from the grounding check. The annotation must be explicit and load-bearing — the CI gate looks for it literally. An unexempted ungrounded node fails the gate.

Example:
```mermaid
flowchart LR
  A[scripts/firewall.sh] --> B[scripts/vault-merge.sh [speculative]]
```

`scripts/firewall.sh` must exist on disk. `scripts/vault-merge.sh` is speculative and is skipped.

## What the Check Covers

The `validate-docs.sh` Check 5 scans mermaid blocks in `docs/design/*.md` and `SOFTWARE-3-0.md` for:

1. Node labels that look like paths (contain `/` or `.sh`/`.ts`/`.md` extensions)
2. For each path-like node: does the path exist under the repo root?
3. If not: is the node annotated `[speculative]`?
4. If neither: emit an error with path:line and exit non-zero

The check uses only `grep`, `awk`, and `bash` — no mermaid parser library. This keeps it in Tier 0 (no external dependencies).

## Relationship to the Design-Drift Gate

Node grounding is one of five categories in the [[Design-Drift Gate]] (ADR-0013):

1. Mermaid node grounding ← this page
2. Dead relative links
3. Hook/script name mismatches
4. Count assertion drift
5. Missing Authority links

## Related Concepts

- [[Design-Drift Gate]] — the overall CI check that enforces node grounding among other drift categories
- [[Parity Gate]] — a companion check that enforces human/agent symmetry in the dual-entry router table
- [[Software 3.0]] — the design posture that all project surfaces must be equally usable by humans and agents
