---
title: "Approved Local Model"
type: concept
aliases: ["Approved Local Model", "approved local model", "qwen3-coder:30b", "APPROVED_LOCAL_MODELS"]
parent: "[[Reference]]"
path: "reference"
sources: ["[[ADR-0011: Local-Model Quality Gate]]", "[[ADR-0017: Fabrication Floor — Verbatim Partition]]", "[[ADR-0019: Query Tier and Answer Verification]]", "[[Local Models]]"]
related: ["[[Local Model Quality Gate]]", "[[Capability Tier]]", "[[Offline Policy]]", "[[Golden Set]]", "[[Zero-Fabrication Floor]]", "[[Scaffolding Ablation]]"]
tags: ["concept", "local-model"]
created: 2026-06-13
updated: 2026-06-13
update_count: 5
status: active
confidence: 1.0
---

# Approved Local Model

> [!summary]
> An approved local model is a local model (Ollama or LM Studio) that has passed the [[Local Model Quality Gate]] with committed, reproducible evidence and is on the `APPROVED_LOCAL_MODELS_BY_TIER` allow-list in `src/data/config/config.ts`. The engine enforces this list fail-closed: an unapproved model is blocked with a teaching message, never run silently. Claude Code stays primary by default. Currently approved: `qwen3-coder:30b` for both `ingest-extract` and `query` tiers.

## Definition

"Approved local model" is not a marketing category — it is a specific code construct: an entry in the `APPROVED_LOCAL_MODELS_BY_TIER` map in `src/data/config/config.ts`. If a model's `name:tag` is not in that map for the requested tier, the engine exits non-zero with a teaching message, regardless of how capable the model is.

The allow-list is enforced at three points:
1. **`claude-wiki-pages config validate`** — fails closed (exit 1, teaching message) when `localModel.enabled` is true and the configured model is not on the list.
2. **`engine route`** — the routing decision function calls `checkLocalModelApproval`, which reads the allow-list. An unapproved tier is `blocked`, not `local`.
3. **`scripts/offline-draft.sh`** — refuses to run if the configured model is not approved at the `ingest-extract` tier.

## Currently Approved Models

| Model | Tier | Evidence |
| --- | --- | --- |
| `qwen3-coder:30b` | `ingest-extract` | `tests/eval/runs/ingest-extract/qwen3-coder-30b/` — both golden-set cases pass, `--verify-artifact` reproducible |
| `qwen3-coder:30b` | `query` | `tests/eval/runs/query/qwen3-coder-30b/` — both ADR-0019 cases pass: recall 1.0, quote coverage 1.0, fabricated 0 |

`qwen3-coder:30b` is currently the only model on the list. It is a code-tuned model — the pattern observed is that code-tuned models are strong at exact structured output (YAML/frontmatter, file layout), which is precisely what the ingest-extract task requires.

## Capability Tiers

Local-model scope widens one capability tier at a time, each gated on its own measured evidence:

| Tier | Status | Description |
| --- | --- | --- |
| `ingest-extract` | UNLOCKED | Local model drafts wiki stubs into `_proposed/` for review |
| `query` | UNLOCKED | Local model answers queries with runtime answer verification |
| `draft` | WIRED but BLOCKED | No golden-set eval defined yet; config accepted, engine refuses |
| full ingest / curator / synthesis | Not wired | Future tiers; each needs its own golden set and ADR |

"WIRED but BLOCKED" means the configuration schema accepts the tier name, but the engine fails closed with an explanation until a model passes the gate for that tier.

## Tested and Rejected Models

All six models measured on 2026-06-11 (Ollama 0.30.7, Apple M1 Pro, 32 GB), both golden-set cases:

| Model | Verdict | Key failure |
| --- | --- | --- |
| `qwen3.5:27b` | Rejected | Fails dedup (0.33): emits more pages than the gold set |
| `gemma4:31b` | Rejected | Dedup 0.00, schema-validity 0.63 |
| `gemma4:26b` | Rejected | Output-protocol unstable; malformed file stream on one case |
| `qwen3-vl:30b` | Rejected | Vision model; claim-source fidelity 0.00 on text task |
| `gpt-oss:20b` | Rejected | Only fabricator: invented a sourced claim on the provenance trap |

The pattern: five of six models invent nothing — provenance discipline is widespread among modern local models. The real wall is structural: producing exactly the right page-set with schema-valid frontmatter as-emitted and following the output protocol without drift.

`qwen3.5:27b` is the closest near-miss. Its dedup failure (emitting more pages than the gold set) is a page-cardinality issue, not a provenance one. A dedup-focused prompt or a post-extract page-merge step could plausibly clear it in a future evaluation.

## How to Add a Model to the Allow-List

1. Run the tier's eval script:
   ```bash
   bash scripts/eval-compare-ollama.sh --models "<name:tag>" --retries 2
   ```
2. Review the scorecard: all four thresholds must be met, zero fabricated sourced claims.
3. Commit the reproducible artifacts to `tests/eval/runs/<tier>/<model-slug>/`.
4. Add the `name:tag` to `APPROVED_LOCAL_MODELS_BY_TIER` in `src/data/config/config.ts` under the appropriate tier.
5. Amend the relevant ADR (ADR-0011 for `ingest-extract`, ADR-0019 for `query`) with the new model entry.
6. All in one change — the evidence, the code change, and the ADR amendment are inseparable.

A vendor benchmark or screenshot is not acceptable evidence. The artifact must be machine-checkable and reproducible by a reviewer against the cited `golden_set_sha`.

## Claude Stays Primary

Even with approved local models, Claude Code is the default for every tier. Local model use requires explicit opt-in via `localModel.enabled: true` in config and an `offlinePolicy` other than `off` (the default). See [[Offline Policy]] for the routing decision logic.

For the `ingest-extract` tier, approved local model output goes to `_proposed/` for human review before reaching `wiki/`. The model does not write to `wiki/` directly — it drafts, and the human promotes via the review gate.

For the `query` tier, every local model answer is checked by runtime answer verification (ADR-0019): each cited quote must be a verbatim substring of the cited page. A non-verifying answer is denied, never shown.

## Related

- [[Local Model Quality Gate]] — the evaluation methodology
- [[Capability Tier]] — the tier a model is approved for (independent per tier)
- [[Offline Policy]] — governs when local models stand in for Claude
- [[Golden Set]] — the eval fixtures used to score the model
- [[Zero-Fabrication Floor]] — the hard floor a model must clear (no sourced fabrications)
