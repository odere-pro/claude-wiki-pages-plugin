---
title: "Plugin Architecture Synthesis"
type: synthesis
synthesis_type: theme
path: "_synthesis"
scope:
  - "[[Four-Layer Stack]]"
  - "[[Deterministic Engine]]"
  - "[[NO-RAG Principle]]"
  - "[[Firewall]]"
  - "[[Git Checkpoint]]"
  - "[[Ontology Profile v1]]"
  - "[[Scaffolding Ablation]]"
  - "[[Local Model Quality Gate]]"
sources:
  - "[[Architecture Documentation]]"
  - "[[Glossary]]"
  - "[[ADR-0001: Four-Layer Orchestrator]]"
  - "[[ADR-0007: Wiki-Native Recall]]"
  - "[[ADR-0009: Multi-Vault Registry]]"
  - "[[ADR-0011: Local-Model Quality Gate]]"
  - "[[ADR-0020: Scaffolding Ablation]]"
  - "[[ADR-0023: Wiki-Only Graph]]"
  - "[[Features]]"
tags: ["synthesis", "architecture", "design-principles"]
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 0.8
---

# Plugin Architecture Synthesis

## Overview

The `claude-wiki-pages` plugin is built around three interlocking design themes: **determinism**, **provenance**, and **fail-closed safety**. Every architectural decision traces back to at least one of these themes. The plugin is not a general-purpose AI framework — it is a narrowly scoped tool that makes one thing excellent: transforming raw documentation into a structured, auditable, cross-linked knowledge wiki.

The four-layer stack (Data / Skills / Agents / Orchestration) is the organizational backbone. Crucially, the layers are not just organizational — they enforce boundaries. The firewall confines writes to the active vault. The hook system blocks invalid writes before they land. Git checkpoints make every write phase individually revertible. The combination means that even aggressive autonomous operations (the curator's auto-heal, the maintenance agent's catch-up loop) are safe to run without approval, because git revert is always available.

The plugin's quality discipline extends to local models: the quality gate (ADR-0011) measures four metrics and applies a zero-fabrication hard floor. `qwen3-coder:30b` is the only approved model today — not because Ollama models are generally weak, but because the gate is specific and evidence-based. The scaffolding ablation (ADR-0020) proves that the plugin scaffolding itself — the schema, provenance contract, and citation rules — is what drives quality, not the model alone.

## Key Findings

1. **Determinism is a non-negotiable.** The NO-RAG principle (ADR-0007) eliminates embeddings from the retrieval path entirely. Every search operation is keyword matching, frontmatter parsing, or graph traversal — same input, same output, always auditable. The deterministic engine (`src/cli/cli.ts`) enforces this in code, not just convention.

2. **Provenance is the primary quality signal.** The `sources:` field is required on every non-source wiki page. The `source_quotes` optional field pins specific claims to verbatim source sentences. The `confidence` field tracks evidential strength. Together, they make every claim traceable from a wiki page back through `_sources/` to `raw/`. The quality gate's verbatim partition (ADR-0017) distinguishes over-citation from fabrication using the same traceability principle.

3. **Fail-closed defaults prevent silent drift.** The multi-vault registry fails closed on malformed JSON or invariant violation (ADR-0016). The firewall blocks cross-vault writes unconditionally. Local model routes are BLOCKED for unapproved tiers (ADR-0018) with a teaching message rather than silently running. The hook system uses exit code 2 to block bad writes before they land. This composable fail-closed posture means that the worst case for any operation is a clean error, not silent corruption.

4. **The scaffolding gap is real and measurable.** The ablation evaluation (ADR-0020) shows that the same model, given a generic prompt vs. the full plugin scaffolding (schema, provenance, anti-fabrication rules), produces measurably better output with scaffolding on every metric: schema-validity, fidelity, field accuracy, and dedup. The plugin's value is not primarily the LLM — it's the contractual scaffolding around the LLM.

5. **Graph quality is maintained by regeneration, not repair.** ADR-0023 declares graph config (``.obsidian/graph.json``) regenerable cache rather than precious state. The wiki-only graph contract (exclude raw/, _templates/, _proposed/) is asserted idempotently by the polish agent after every write. This eliminates the class of "graph got out of sync" bugs — the config is always freshly derived from the topic tree.

6. **The specialist pattern enables independent evolution.** The orchestrator probes state once; specialists trust its payload and never re-probe. This boundary means each specialist agent can be tested, improved, or replaced without touching the others. The curator can apply more aggressive auto-heals; the analyst can add new modes; the ingest agent can handle new source formats — all without changing the orchestrator or the other specialists.

## Relationships

The [[Four-Layer Stack]] is the spine. [[Deterministic Engine]] is Layer 4's enforcement peer. [[Firewall]] + [[Git Checkpoint]] are the safety mechanisms that make autonomous operation safe. [[NO-RAG Principle]] + [[Wiki-Native Recall]] are the retrieval philosophy. [[Ontology Profile v1]] is the single named contract for typed relationships. [[Local Model Quality Gate]] + [[Scaffolding Ablation]] are the evidence-based quality discipline.

The [[Orchestrator Agent]] routes to [[Ingest Agent]] → [[Curator Agent]] → [[Polish Agent]] in sequence. The ingest agent follows the 13-step [[Ingest Pipeline]] and the [[Entity Distribution Model]] (update, don't duplicate). The curator runs [[Lint Rules]] and [[Auto-Heal]]. The polish agent maintains the [[Obsidian Experience]] and the [[Wiki-Only Graph]].

## Gaps

- **Local model coverage is thin.** Only `qwen3-coder:30b` is approved, and only for `ingest-extract` and `query` tiers. The `draft` tier is WIRED but BLOCKED — no golden-set eval is defined. Full ingest / curator / synthesis tiers are not wired. This is by design (capability progression gated on evidence), but it limits the plugin's usefulness in Claude-unavailable scenarios.
- **Vault merge is unimplemented.** ADR-0012 accepted the design but deferred implementation. Users managing multiple related vaults cannot consolidate them through the plugin.
- **No deeper L3 sequences for maintenance loop.** The design diagrams (`docs/design/`) lack the maintenance agent's sequence and the per-vault firewall decision tree.
- **Stemmer and synonym lexicon are not documented in the wiki** beyond the ADR reference. A concept page for "Synonym Lexicon" and "Porter Stemmer" would improve searchability.

## Recommendations

1. **Run the `draft` tier golden-set eval** to unblock the `prefer-local` path for users without Claude API access. The machinery is wired; only the evidence artifact is missing.
2. **Add the vault merge implementation** as a Phase 4 milestone. The design is settled (ADR-0012); the `dedup-and-flag` approach is clear.
3. **Write the missing L3 sequence diagrams** for the maintenance loop and the firewall decision tree. The design-drift gate (ADR-0013) will enforce them once written.
4. **Add "Synonym Lexicon" and "Stemmer" concept pages** to `wiki/decisions/` to make the retrieval pipeline fully browsable from the wiki.
5. **Consider a `doctor` sub-check** that validates the `.obsidian/app.json` `userIgnoreFilters` match the expected set. Currently the polish agent asserts them idempotently, but there is no doctor check for drift.
