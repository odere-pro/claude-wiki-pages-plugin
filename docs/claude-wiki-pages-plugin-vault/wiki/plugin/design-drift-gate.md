---
title: "Design-Drift Gate"
type: concept
aliases: ["Design-Drift Gate", "design-drift gate", "validate-docs Check 5", "drift gate"]
parent: "[[plugin|claude-wiki-pages Plugin]]"
path: "plugin"
sources: ["[[_sources/adr-0013-design-drift-gate|ADR-0013: Design-Drift Gate]]", "[[design-readme|Design README]]", "[[design-template|Design Diagram Template]]", "[[design-06-feature-relations|Design: Feature Relations]]"]
related: ["[[parity-gate|Parity Gate]]", "[[llm/software-3-0|Software 3.0]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "ci", "gates", "design"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Design-Drift Gate

> [!summary]
> The design-drift gate is Check 5 of `scripts/validate-docs.sh` — the Tier-0 CI gate that scans `docs/design/*.md` and `SOFTWARE-3-0.md` for five categories of drift between the design documents and the actual codebase. It uses only grep/awk/bash (no mermaid parser) and runs in CI Tier 0, making it the fastest correctness signal in the pipeline.

## Key Principles

- The gate uses bash/grep/awk only — no mermaid parser, no Bun — keeping it in Tier 0 (runs in every CI environment, even without Node installed).
- A mermaid node annotated `[speculative]` is exempted from the grounding check, allowing in-progress design without breaking CI.
- The five categories of drift checked: mermaid node grounding, dead relative links, hook/script name mismatches, count assertion drift, missing Authority links.
- The parity gate sub-check enforces that every dual-entry router row has both a human form and an agent form with resolving links.
- Node grounding is evaluated at CI run time, not at document-write time — a grounded node that is later deleted becomes a drift violation.

## Examples

The gate running in CI Tier 0:

```bash
bash scripts/validate-docs.sh
# Check 5 runs on: docs/design/*.md and SOFTWARE-3-0.md
```

A grounded mermaid node vs a speculative one:

```
graph LR
  A[skills/ingest/SKILL.md]          %% grounded: path exists
  B[skills/future-verb/SKILL.md [speculative]]  %% exempt from grounding check
```

## Definition

The design-drift gate (ADR-0013) was introduced to close the gap between ambitious design documentation and the implemented codebase. Design documents accumulate five categories of drift:

1. **Mermaid node grounding** — a mermaid diagram node names a file or path that does not exist on disk.
2. **Dead relative links** — a link in a design doc resolves to a missing file.
3. **Hook/script name mismatches** — a hook or script name in the design doc does not match the name in `hooks.json` or `scripts/`.
4. **Count assertion drift** — a sentence like "there are N skills" or "7 agents" has become stale as the codebase grew.
5. **Missing Authority links** — a design doc claims a decision is documented in an ADR, but no link to that ADR exists.

## Key Design Decisions

**Bash-only (Tier-0).** The gate uses grep, awk, and bash only — no external parsers, no mermaid library, no Bun. This keeps it in Tier 0 (runs in every CI environment, even without Node installed) and makes it auditable in a single read of the script.

**`[speculative]` marker.** A mermaid node annotated `[speculative]` is exempted from the grounding check. This allows design documents to include not-yet-built paths without tripping the gate. It is explicit and load-bearing: every speculative node must be marked or the gate fails.

**Parity gate.** The dual-entry router table (human column / agent column) is a special case: every row must have a non-empty human cell and a non-empty agent cell, and both cells must contain resolving links. This enforces the Software 3.0 posture — every project surface is equally usable by humans and agents.

**Node grounding.** A mermaid node is "grounded" when the path it names resolves to an existing file or directory on disk. Grounding is evaluated at gate time (CI run time), not at document-write time. A grounded node that is later deleted becomes a drift violation.

## Scope

The gate scans `docs/design/*.md` and `SOFTWARE-3-0.md`. It does not scan `docs/architecture.md`, `docs/GLOSSARY.md`, or other doc files — those have their own gates (glossary gate = Check 1; architecture link check = Check 2). The design-drift gate focuses specifically on the richer, diagram-heavy design documents where drift is most likely to accumulate silently.

## Consequences

- Design documents that claim a path exists are machine-verified at commit time.
- Speculative design (nodes marked `[speculative]`) is explicitly demarcated and does not block CI.
- The parity gate enforces the dual-entry contract: if a design table lists a surface for humans, it must list the agent-callable equivalent, and vice versa.

## Related Concepts

- Node Grounding — the property of a mermaid node naming a real on-disk path
- [[parity-gate|Parity Gate]] — the dual-entry router row check enforcing human/agent symmetry
- [[llm/software-3-0|Software 3.0]] — the posture that every project surface must be equally usable by humans and agents
- Architecture Decision Record — the ADR format that governs design decisions
