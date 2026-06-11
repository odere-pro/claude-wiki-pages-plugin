---
title: "Fail-Closed by Design: Architecture and Local-Model Governance"
type: synthesis
synthesis_type: theme
path: "_synthesis"
aliases: ["Fail-Closed by Design: Architecture and Local-Model Governance", "Fail-Closed by Design", "fail-closed-by-design"]
scope:
  - "[[Four-Layer Stack]]"
  - "[[Hook-Enforced Safety]]"
  - "[[Provenance]]"
  - "[[Capability Tier]]"
  - "[[Quality Gate]]"
  - "[[Zero Fabrication Floor]]"
  - "[[Answer Verification]]"
  - "[[Degraded Mode Routing]]"
  - "[[Per-Vault Write Confinement]]"
sources:
  - "[[Architecture (source)]]"
  - "[[Features]]"
  - "[[Local Models (source)]]"
  - "[[Operations (source)]]"
  - "[[Glossary]]"
tags: [synthesis, architecture, local-models, safety, provenance]
created: 2026-06-11
updated: 2026-06-11
status: active
confidence: 0.85
---

# Fail-Closed by Design: Architecture and Local-Model Governance

> [!summary]
> `claude-wiki-pages` is built around a single governing principle applied consistently across every layer and every feature: when in doubt, fail closed. This synthesis traces that principle from the [[Four-Layer Stack]] through local-model governance, showing that the same design posture that protects the wiki from structural corruption also protects it from model-generated fabrication.

## Overview

The [[Four-Layer Stack]] was designed because each layer fails differently — and the solution to each failure mode is to place a gate at the only layer where that failure can be observed. Data corruption is caught by Layer 4 validation scripts. Agent misbehavior is caught by `SubagentStop` hooks. Skill misbehavior is caught by human re-runs. This is not defensive programming; it is structural — each gate is in the only place it can work.

The same logic governs local-model integration. When Claude is unavailable and a local model might stand in, the plugin does not guess or degrade silently. The `offlinePolicy` config defaults to `off` (no probe, no fallback). When set to `prefer-local`, the engine `route` command returns `blocked` if the configured model has not passed the [[Quality Gate]] for the configured [[Capability Tier]]. A model that later regresses is removed from the allow-list by the reverse edit. The [[Zero Fabrication Floor]] (ADR-0017) is a hard cut: a single fabricated sourced claim fails the gate, even if all structural metrics are strong.

Both systems — the four-layer architecture and the local-model governance process — share a common interface: the fail-closed gate with a teaching message. When a write violates the schema, `validate-frontmatter.sh` exits with code 2 and names the problem. When a local model is blocked, the engine exits non-zero with a teaching message explaining what would need to be true for the tier to unlock.

## Key Findings

1. **Structural provenance and zero fabrication are the same guarantee at different layers.** [[Provenance]] requires every wiki page to link back to at least one raw source. The [[Zero Fabrication Floor]] requires every cited source quote to be a verbatim substring of the raw input. Both guards prevent the same class of error: claims that appear in the wiki but cannot be traced to evidence.

2. **The local-model capability tier map mirrors the four-layer trust model.** Tier unlocks require committed, reproducible evidence, not subjective confidence. The `APPROVED_LOCAL_MODELS_BY_TIER` allow-list is enforced in code (`src/data/config/config.ts`), not in documentation. This is the same posture as the hook scripts: behavior is enforced structurally, not culturally.

3. **[[qwen3-coder:30b]] cleared the gate because code-tuned models are structurally reliable.** The failure analysis of rejected models shows that five of six invent nothing — provenance discipline is widespread. The real wall is structural: dedup correctness (exact page-set), schema-validity (frontmatter as-emitted), and output-protocol stability. Code-tuned models are better at exact structured output, which is the same reason the plugin uses YAML frontmatter (not free-form JSON) as its schema format.

4. **Per-answer [[Answer Verification]] extends fail-closed to query-time output.** The [[Query Tier]] does not trust that a locally-generated answer is correct because the model passed the golden-set eval. Every answer is verified at runtime: each citation must name an existing wiki page, each quote must be verbatim. An unverified answer is denied, never shown. This closes the gap between batch eval (offline) and production (online).

5. **The firewall ([[Per-Vault Write Confinement]]) and the `protect-raw.sh` hook are fail-closed at the I/O level.** No amount of correct prompt engineering prevents writes to `raw/` or cross-vault writes — the hooks block them at the tool call level before any LLM output reaches disk.

## Relationships

- [[Four-Layer Stack]] → [[Hook-Enforced Safety]]: The orchestration layer is where the fail-closed contract is enforced. Skills and agents follow the schema by convention; hooks enforce it by construction.
- [[Capability Tier]] → [[Quality Gate]] → [[Approved Local Model]]: Tier widening is the governance act. A model cannot self-certify; the golden-set evidence must be committed and reproducible.
- [[Provenance]] ↔ [[Zero Fabrication Floor]]: These are two expressions of the same principle — the wiki must not contain claims that cannot be traced to evidence.
- [[Degraded Mode Routing]] → [[Draft Review Gate]]: Even in offline mode, local-model output goes through `_proposed/` for human review. The fail-closed principle persists through the full offline path.

## Gaps

The following areas are not yet covered by the ingested sources and represent knowledge gaps in this wiki:

- **ADR content** (19 ADRs are in `raw/adr/` but not yet ingested): the specific design decisions behind each gate, threshold, and trade-off are not yet in the wiki.
- **Design documents** (`raw/design/`): the component design, sequence diagrams, ontology design, and teams-and-agents structure are not yet ingested.
- **User guides** (`raw/llm-wiki/`): the step-by-step walkthroughs (getting started through querying) are not yet ingested.
- **Security model**: `SECURITY.md` is referenced in sources but not yet in the raw directory; the threat model and per-threat test mapping are not yet in the wiki.
- **Test harness detail**: the five-tier test structure is mentioned at the feature level but the specific test contracts, Bats test organization, and coverage requirements are not ingested.

## Recommendations

1. **Ingest the ADR directory** (`raw/adr/`): the 19 ADRs contain the design rationale behind every key decision. They are the most information-dense pending sources.
2. **Ingest the design documents** (`raw/design/`): the sequence diagrams (03-sequences.md) and feature-relations (06-feature-relations.md) would add structural knowledge not available from the overview docs alone.
3. **Create a timeline synthesis** after the ADRs are ingested to trace the evolution of the architecture from ADR-0001 (four-layer orchestrator) through ADR-0019 (query tier and answer verification).
4. **When the security threat model is available**, create a gap synthesis comparing the documented threats against the hook-enforced controls — the fail-closed-by-design theme maps directly to the security surface.
