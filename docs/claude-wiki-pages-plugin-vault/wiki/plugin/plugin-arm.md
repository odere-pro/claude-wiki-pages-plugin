---
title: "Plugin Arm"
type: concept
aliases: ["Plugin Arm", "plugin arm", "plugin scaffolding arm", "full scaffolding arm"]
parent: "[[claude-wiki-pages Plugin]]"
path: "plugin"
sources: ["[[ADR-0020: The Scaffolding Ablation]]", "[[Features]]"]
related: ["[[Baseline Arm]]", "[[Scaffolding Ablation]]", "[[Golden Set]]", "[[Zero-Fabrication Floor]]", "[[Local Model Quality Gate]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "eval", "scaffolding", "ablation"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Plugin Arm

> [!summary]
> The plugin arm is one of two evaluation conditions in the [[Scaffolding Ablation]] (ADR-0020). It runs the same model on the same golden inputs but with the full plugin scaffolding: schema excerpt, provenance contract, verbatim `source_quotes` rule, and anti-fabrication hard rules. The plugin arm's results are compared against the [[Baseline Arm]] to measure what the scaffolding buys.

## Definition

The scaffolding ablation (ADR-0020) is a controlled experiment with two arms:

- **Plugin arm (this page)** — the model receives the full plugin scaffolding as its prompt: a schema excerpt from `vault/CLAUDE.md`, the provenance contract requiring every claim to be sourceable, the verbatim `source_quotes` rule, and the anti-fabrication hard rules.
- **[[Baseline Arm]]** — the same model on the same inputs, but with only a generic prompt ("extract the knowledge into well-organized notes") and no schema, no provenance contract.

The plugin arm represents what the model produces when properly scaffolded. The baseline arm represents what any capable LLM produces without the plugin's structure.

## What the Plugin Arm Prompts Include

1. **Schema excerpt** — the relevant portions of `vault/CLAUDE.md`: frontmatter field definitions, required fields by type, and the entity/concept/source type enum.
2. **Provenance contract** — explicit instruction that every claim in the wiki must link back to a source; `sources:` is non-negotiable.
3. **`source_quotes` rule** — the verbatim substring requirement: a `source_quotes` entry's `quote` field must be a verbatim (whitespace-normalized) substring of the raw input. No paraphrase.
4. **Anti-fabrication hard rules** — the zero-fabrication floor stated as an explicit rule the model must not violate.

## Measured Results

From `docs/features.md` (measured 2026-06-11):

| Metric | Plugin Arm | Baseline Arm |
| --- | --- | --- |
| Schema-validity | ≥ 0.98 | — (no schema to validate against) |
| Claim-source fidelity | ≥ 0.97 | — (no provenance contract) |
| Frontmatter-field accuracy | ≥ 0.90 | — |
| Dedup correctness | ≥ 0.90 | Lower (baseline tends to spawn duplicates) |
| Zero fabrications | Enforced | Vacuous (nothing is sourced, so nothing can fabricate) |

The baseline arm's zero-fabrication floor is vacuous because the baseline produces no `sources` fields — nothing it claims is sourced, so fabrication cannot be detected by the same mechanism.

## Interpretation

The plugin arm's advantage is structural, not luck: the schema prompt forces the model to organize knowledge in a form the engine can validate, lint, and traverse. The provenance contract forces attribution. The `source_quotes` rule forces verbatim grounding. Without these constraints, even a capable model produces output that is harder to verify, harder to maintain, and harder to search.

## Related Concepts

- [[Baseline Arm]] — the control condition (no scaffolding) in the ablation
- [[Scaffolding Ablation]] — the overall experiment design and reporting
- [[Golden Set]] — the shared input fixtures both arms run against
- [[Zero-Fabrication Floor]] — the floor the plugin arm enforces; vacuous in the baseline arm
- [[Local Model Quality Gate]] — uses the same golden set as the ablation for local model evaluation
