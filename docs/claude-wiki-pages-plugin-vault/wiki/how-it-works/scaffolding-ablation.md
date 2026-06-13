---
title: "Scaffolding Ablation"
type: concept
aliases: ["Scaffolding Ablation", "scaffolding ablation", "ablation eval", "plugin arm vs baseline arm"]
parent: "[[How It Works]]"
path: "how-it-works"
sources: ["[[ADR-0020: The Scaffolding Ablation]]", "[[Features]]"]
related: ["[[Local Model Quality Gate]]", "[[Golden Set]]", "[[claude-wiki-pages Plugin]]", "[[Ingest Pipeline]]", "[[Approved Local Model]]", "[[NO-RAG Principle]]"]
tags: ["concept", "eval", "quality"]
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Scaffolding Ablation

> [!summary]
> The scaffolding ablation is the evaluation that measures what the plugin's scaffolding (schema contract, provenance rules, citation protocol, anti-fabrication rules) buys over plain LLM extraction with no guidance. Same model, same golden inputs, two prompt arms — the prompts are the only ablated variable. It is a report, not a gate: no tier unlocks or locks based on its results. The headline finding: the baseline arm collapses on schema-validity and claim-source fidelity; the plugin arm passes the calibrated bar.

## Problem Statement (ADR-0020)

The plugin's central claim is that its scaffolding — the schema excerpt, the provenance contract, the `source_quotes` verbatim rule, the anti-fabrication hard rules — is what turns a capable LLM into a reliable wiki maintainer. The [[Local Model Quality Gate]] measures whether a specific model clears the bar with the plugin's scaffolding. But until ADR-0020, there was no measurement of what happens without the scaffolding.

The question users actually ask: *what do I lose if I just ask the model to "take notes" without the plugin?*

## Method: Ablate the Contract, Keep the Transport

The evaluation is a **scaffolding ablation**: the same model, the same golden inputs, two prompt arms; the prompts are the only ablated variable. Transport (the delimiter protocols `===FILE:` blocks for ingest; `===ANSWER===`/`===COVERAGE===`/`===CITATIONS===`/`===END===` for query) is kept equal in both arms.

This is a deliberate measurement decision: the scorers fail closed (rc 2 = unscorable) on transport violations, and an unscorable baseline measures nothing. The transport is how the scorers *read* the model's answer; the contract is what the plugin *teaches* it. Only the contract is the experimental variable.

### Plugin Arm

The full scaffolding prompts: authoritative schema excerpt (required-fields table + enum list), the provenance contract, the verbatim `source_quotes` rule, the anti-fabrication hard rules, and (for the query tier) the grounding/attribution/coverage-honesty rules.

### Baseline Arm

The generic prompt a user would write without the plugin: *"Extract the knowledge from this document into well-organized markdown notes under wiki/"* for ingest; *"Answer the question from these notes."* for query.

## The Apparatus

- **`scripts/eval-produce-baseline.sh`** — the baseline-arm produce step. Sources `parse_response` and `query_ollama_chat` from the existing plugin-arm scripts, so the two arms share parser and network path byte-for-byte and differ only in prompts.
- **`scripts/eval-ablation-report.sh`** — renders the arms × tiers × cases matrix. A report, never a gate. Scorer verdicts rc 0 (pass) and rc 1 (fail) are both legitimate measurements — a baseline fail is the expected result and the gap is the finding. Scorer rc ≥ 2 (output violated the answer protocol itself) is recorded as an explicitly labeled **unscorable** cell, never silently dropped.

## Metric Semantics on Baseline Output

Two metrics read differently for baseline-shaped output:

**`fabricated_sourced_claims == 0` is vacuously clean** for a baseline arm that cites nothing. A candidate with no `source_quotes` makes no *sourced* claims, so the zero-fabrication floor cannot trip. A clean floor on the baseline arm is *not* evidence the baseline doesn't fabricate — it is evidence the baseline makes **unauditable** claims. The plugin arm's clean floor is earned against actual sourced claims.

**`frontmatter_field_accuracy` can score 1.0 vacuously** when the baseline emits no frontmatter at all (no fields scored → nothing wrong).

The meaningful baseline metrics are therefore **`schema_validity`** and **`claim_source_fidelity`** for ingest, and **`citation_recall`** / **`quote_coverage`** / **`fabricated_citations`** for query (these are not vacuous — the protocol forces the baseline to cite, and its citations are checked against real pages).

## Measured Results (`qwen3-coder:30b`, M1 Pro, Ollama 0.30.7)

**Ingest-extract tier:**
- Plugin arm: schema-validity 1.0, claim-source fidelity 1.0 — PASSes the calibrated bar.
- Baseline arm: emits readable notes with no schema, no provenance, no auditable claims. `schema_validity` and `claim_source_fidelity` collapse — FAIL. Every factual claim is uncited by construction.

**Query tier:**
- Plugin arm: grounded, verbatim-cited, honest coverage — PASSes.
- Baseline arm: loses the grounding/attribution guarantees. Citations are unchecked paraphrases unless the model happens to quote verbatim.

The measured baseline runs also revealed: the baseline arm is more likely to drift off the answer protocol entirely (unscorable cells). The hard rules being ablated are what held the model on-protocol — a finding in itself.

## What This Is Not

- **Not a gate.** No threshold moves, no tier unlocks or locks based on ablation results. ADR-0011 evidence rules are unchanged.
- **Not a model comparison.** Both arms run the same model per run; cross-model conclusions need their own runs.
- **Not RAG.** Scoring remains exact structural comparison (§5 NO-RAG).

## Value of the Result

"What does the plugin buy?" now has a numbers-backed answer with committed, re-scorable evidence rendered in `docs/features.md`. The baseline produce step gives any future model a one-command control arm: `eval-ablation-report.sh --model <m>`. Reviewers evaluating the plugin can run both arms themselves.

## Related

- [[Local Model Quality Gate]] — the gate that uses the same golden-set methodology for the plugin arm
- [[Golden Set]] — the checked-in fixtures used for both arms
- [[claude-wiki-pages Plugin]] — the plugin whose scaffolding is being measured
- [[NO-RAG Principle]] — scoring in both arms is exact structural comparison, never embedding
