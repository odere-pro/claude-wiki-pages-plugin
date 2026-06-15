---
title: "NO-RAG Principle"
type: concept
aliases: ["NO-RAG Principle", "NO-RAG", "no embeddings", "no-rag"]
parent: "[[LLM]]"
path: "llm"
sources: ["[[ADR-0007: Wiki-Native Recall]]", "[[ADR-0019: Query Tier and Answer Verification]]", "[[Architecture Documentation]]", "[[Glossary]]"]
related: ["[[Wiki-Native Recall]]", "[[Deterministic Engine]]", "[[Query Rules]]", "[[Search Score Object]]", "[[Ingest Pipeline]]", "[[Approved Local Model]]", "[[Local Model Quality Gate]]"]
contradicts: []
tags: ["concept", "retrieval", "non-negotiable"]
created: 2026-06-13
updated: 2026-06-13
update_count: 5
status: active
confidence: 1.0
---

# NO-RAG Principle

> [!summary]
> The NO-RAG principle is a project non-negotiable (§5): no vector embeddings on the default retrieval path, ever. Retrieval is wiki pages + wikilinks + frontmatter, implemented as deterministic keyword matching, synonym expansion, Porter-style stemming, and graph traversal. It is enforced at the CI level by `gate-13-no-rag.sh`, which scans retrieval source files for forbidden imports and self-tests against a planted violation. The rationale: embeddings require external services, drift silently, and cannot be audited. Deterministic search is reproducible, explainable, and auditable.

## Key Principles

- NO-RAG is §5 of the project SPEC — an absolute non-negotiable, not a revisitable design preference.
- The rationale is structural: embeddings introduce external service dependencies, drift silently between model versions, and cannot be audited.
- The positive alternative is deterministic wiki-native recall: keyword matching + curated synonym lexicon + Porter-style stemming + graph link-walk.
- CI enforcement (`gate-13-no-rag.sh`) scans retrieval source files for forbidden imports and self-tests by planting a known violation.
- The NO-RAG rule extends to the test layer: golden-set eval scores output by exact structural comparison, never by embedding similarity.

## Examples

How `gate-13-no-rag.sh` works (self-tests against a planted violation):

```bash
# The gate scans these files for forbidden imports:
# src/commands/search/search.ts
# src/core/vocabulary.ts
# src/core/stem.ts
# src/core/graph.ts

# --self-test plants "import { createEmbedding } from 'openai'" in a temp copy
# and asserts the gate catches it
bash tests/gates/gate-13-no-rag.sh --self-test
```

Search result with a fully auditable score breakdown (no hidden similarity scores):

```json
{
  "page": "Firewall",
  "score": 4.7,
  "matched": [
    { "channel": "title-term", "term": "firewall", "points": 4.0 },
    { "channel": "body-term", "term": "confinement", "points": 0.7 }
  ]
}
```

## Definition

The NO-RAG principle is the hard non-negotiable that the plugin will never use vector stores, embedding models, or similarity scoring on the retrieval path. "RAG" (Retrieval-Augmented Generation with semantic search) is explicitly ruled out, not as a design preference but as a named invariant analogous to "no hardcoded credentials" in a security policy.

This is stated as §5 in the project's SPEC: "NO embeddings ever — absolute." The word "absolute" distinguishes it from a revisitable trade-off.

## Why Not RAG

The reasons are structural, not aesthetic:

1. **External service dependency.** Embeddings require an embedding model (local or hosted). A hosted model introduces a network dependency that breaks offline use. A local embedding model needs to be shipped, versioned, and updated separately from the plugin.
2. **Silent drift.** Two embedding runs on the same text with different model versions can produce different vectors — affecting retrieval results with no visible change in the source data. Deterministic keyword search produces identical results given identical inputs, forever.
3. **Auditability.** When a page appears in a search result, the user can see exactly why: `title-phrase: 5 points, synonym-term: 2 points`. When a page appears because its embedding is "close" to the query, the reason is a latent vector that no human can read.
4. **Test-layer purity.** The [[Local Model Quality Gate]] (ADR-0011) scores model output by exact structural comparison. Allowing embedding-based scoring in the test layer would smuggle the forbidden mechanism into CI — scoring "correctness" by semantic similarity rather than field-by-field exact match.

## The Positive Alternative: Wiki-Native Recall

The NO-RAG principle is paired with a concrete positive alternative: [[Wiki-Native Recall]]. Rather than embedding-based retrieval, the plugin uses:

- **Curated synonym lexicon** (`vault/_vocabulary.md`): a human-edited, git-versioned file of term→alias mappings. Querying any member of a synonym group expands to the whole group.
- **Porter-style stemmer** (`src/core/stem.ts`): a pure, deterministic suffix-rewrite algorithm that maps "running"/"ran"/"runs" to a common root. Applied symmetrically to query terms and page tokens.
- **Weight ladder:** direct title/alias match scores higher than synonym expansion, which scores higher than stem matching. Expansion only rescues a page from the zero-score cliff; it cannot outrank a real keyword hit.
- **Graph link-walk** (ADR-0008): follows typed wikilinks (`sources`, `related`, `depends_on`) from a seed page to a N-hop neighbourhood (N≤2) with hop-decayed scoring. One shared `walk()` function in `src/core/graph.ts`.

The entire retrieval path is offline, deterministic, and auditable. Same query + same vault + same lexicon → byte-identical results and score breakdown.

## CI Enforcement

`tests/gates/gate-13-no-rag.sh` scans the retrieval source files — `src/commands/search/search.ts`, `src/core/vocabulary.ts`, `src/core/stem.ts`, `src/core/graph.ts` — for forbidden imports:

- Any HTTP client (`fetch`, `axios`, `http`, `https`)
- Any embedding library (`openai`, `@anthropic-ai/sdk` on this path, `faiss`, `@qdrant`)
- Any similarity-scoring function call

The gate ships with a `--self-test` that plants a known forbidden token in a temporary copy and asserts that the gate catches it. A gate that cannot fail cannot be trusted — gate-13 is built to the same standard as gate-11 (firewall parity) and gate-12 (provenance floor).

## Effect on the Query Tier

For local-model query answers (ADR-0019), the NO-RAG principle extends to the verification step: each cited quote in a local model's answer must be a **verbatim substring** of the cited wiki page. The verification is exact string containment — `includes()` — not similarity scoring. A local model that paraphrases a citation (not verbatim) fails verification and its answer is denied.

## Effect on the Golden-Set Eval

ADR-0011 explicitly addresses this: the golden-set eval scores candidate output by exact structural comparison — field-by-field, claim-by-claim — never by embedding the candidate and the gold reference and measuring distance. The gate states: "this must never score output by embedding it and measuring vector similarity; that would smuggle the forbidden mechanism in through the test layer."

## What NO-RAG Does NOT Prohibit

- **Alias matching.** `aliases:` in frontmatter are direct string lookups, not similarity.
- **Dataview queries in Obsidian.** These query frontmatter fields directly (structured data, not vectors).
- **LLM synthesis.** The LLM reads wiki pages and reasons over them. The LLM uses its training to synthesize an answer — that is not "RAG" retrieval; that is the LLM's native capability applied to explicitly retrieved content.
- **The curated lexicon.** Synonyms in `vault/_vocabulary.md` are lookup tables, not learned representations.

## Related Concepts

- [[Wiki-Native Recall]] — the positive, deterministic retrieval alternative
- [[Deterministic Engine]] — the Bun CLI that implements NO-RAG in code
- [[Query Rules]] — the structured query workflow for agents
- [[Search Score Object]] — the `SearchHit.matched[]` breakdown showing exactly why a page ranked
- [[Local Model Quality Gate]] — the gate that enforces NO-RAG in the eval layer too
