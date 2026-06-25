---
title: "Local Model Support"
type: concept
aliases: ["local model support", "Local Model Support", "Ollama support", "local models"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-local-models|Local Models]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "local-models", "ollama"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Local Model Support

The plugin can use a local model (Ollama / LM Studio) as a fallback, but only for a capability tier that has passed the ADR-0011 quality gate with committed, reproducible evidence.

## Definition

Local model support is opt-in (off by default), fail-closed (an unapproved tier is BLOCKED with a teaching message, never run silently), and always routes through the `_proposed/` human review gate for any content it creates. Claude Code stays primary for every tier regardless.

## Key Principles

**Capability tiers.** Local-model scope widens one tier at a time, each gated on its own measured evidence. The per-tier allow-list is `APPROVED_LOCAL_MODELS_BY_TIER` in `src/data/config/config.ts`. A tier with no gate-approved model is WIRED but BLOCKED.

| Tier | Status | Approved model |
| --- | --- | --- |
| `ingest-extract` | UNLOCKED | `qwen3-coder:30b` |
| `query` | UNLOCKED | `qwen3-coder:30b` |
| `draft` | WIRED but BLOCKED | none yet |
| full ingest / curator / synthesis | not wired | — |

**Quality gate (ADR-0011/0017).** The bar: `schema_validity ≥ 0.98`, `claim_source_fidelity ≥ 0.97`, `frontmatter_field_accuracy ≥ 0.90`, `dedup_correctness ≥ 0.90`, `fabricated_sourced_claims = 0` (hard floor). A model must clear both golden-set cases.

**Why qwen3-coder:30b passes.** Code-tuned models are strong at exact structured output (YAML/frontmatter, file layout). Five of six tested models invent nothing; the real wall is structural (producing exactly the right page-set with schema-valid frontmatter following the output protocol).

**Tested and rejected (measured 2026-06-11):**
- `qwen3.5:27b` — fails dedup (0.33/0.00): emits more pages than the gold page-set.
- `gemma4:31b` — dedup 0.00 both cases + schema_validity 0.63 on extract-basic.
- `gemma4:26b` — output-protocol unstable; schema_validity 0.13.
- `qwen3-vl:30b` — vision model on pure-text task; claim-source-fidelity 0.00.
- `gpt-oss:20b` — only model that fabricated; tripped zero-fabrication floor.

**Adding a model.** Run `eval-compare-ollama.sh`, copy evidence to `tests/eval/runs/`, stamp and verify artifact, add to `APPROVED_LOCAL_MODELS_BY_TIER`, amend ADR — all in one change.

## Examples

To enable a local model: set `localModel.enabled: true`, `localModel.tier: "ingest-extract"`, `localModel.model: "qwen3-coder:30b"` in `.claude/claude-wiki-pages.json`. Drafts produced locally route to `_proposed/` and require review-gate promotion before landing in `wiki/`.

## Related Concepts

The offline policy (ADR-0018) governs when a local model runs (offlinePolicy: prefer-local when Claude unreachable). The fabrication floor (ADR-0017) defines what counts as a fabricated claim. The quality gate (ADR-0011) defines the evaluation methodology.
