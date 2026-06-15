---
title: "Tier-2 Deterministic Recall"
type: concept
aliases: ["Tier-2 Deterministic Recall", "Tier-2 recall", "synonym+stemming expansion", "tier 2"]
parent: "[[engine-index|Engine — Index]]"
path: "engine"
sources: ["[[search-ts-source|search.ts Source]]", "[[vocabulary-ts-source|vocabulary.ts Source]]", "[[stem-ts-source|stem.ts Source]]", "[[engine-api-skill|Engine API Skill (SKILL.md)]]"]
related: ["[[search-scoring-algorithm|Search Scoring Algorithm]]", "[[synonym-lexicon|Synonym Lexicon]]", "[[porter-stemmer|Porter Stemmer]]", "[[deterministic-engine|Deterministic Engine]]", "[[graph-traversal-primitive|Graph Traversal Primitive]]"]
contradicts: []
supersedes: []
depends_on: ["[[synonym-lexicon|Synonym Lexicon]]", "[[porter-stemmer|Porter Stemmer]]"]
tags: ["engine", "search", "recall", "nlp"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Tier-2 Deterministic Recall

## Definition

Tier-2 Deterministic Recall is the query-expansion layer added to the engine's search command that widens recall beyond exact keyword matching using two purely deterministic mechanisms: synonym expansion from a curated lexicon and Porter stemming. Both mechanisms are applied before the scoring loop; they produce additional query terms that flow through the same ranker — no second mechanism, no vectors, no network.

The design sits inside the Wiki-Native Recall architecture: no RAG pipeline, no embedding store, no network call. The entire retrieval stack is deterministic: same query, same vault state, same ranked output.

## Key Principles

- **Zero network, zero ML**: synonym expansion uses a human-curated `_vocabulary.md` lexicon; stemming uses a pure algorithmic Porter 1980 implementation. Both are deterministic: same query, same vault, same expansion, same ranking.
- **Lower-weighted channels**: synonym and stem matches score lower than exact matches. This ensures Tier-2 expansion adds recall without displacing exact hits at the top.
- **Deduplication contract**: if an exact match already scored a `(query term, field)` pair, the synonym/stem channel does NOT emit an additional component for that pair. This prevents double-counting.
- **Graceful absence**: if `_vocabulary.md` is missing or unreadable, `loadLexicon()` returns an empty lexicon and the synonym channel emits nothing. Exact-match-only behavior is the baseline — Tier-2 degrades to Tier-1 transparently.
- **Stem channel uses set equality**: the stem channel tokenizes the field into a stem set and checks `stemSet.has(stem(term))` — NOT a substring `includes()`. This avoids false matches where a short stem is a substring of an unrelated word.

## Scoring Weights

The three channels and their per-field weights:

| Channel       | Title | Tags | Body |
| ------------- | ----- | ---- | ---- |
| Exact match   | 5     | 3    | 1    |
| Synonym match | 2     | 1.5  | 0.5  |
| Stem match    | 1     | 0.5  | 0.25 |

Exact title hits always rank above synonym or stem hits on any other field. The scoring function is additive across all matched `(term, field, channel)` triples, with the deduplication contract ensuring no triple is counted twice.

## Three-Channel Architecture

```
Query text
    │
    ├─ Exact channel ──────── tokenize → match title/tags/body (weight 5/3/1)
    │
    ├─ Synonym channel ─────── loadLexicon() → expand groups → match (weight 2/1.5/0.5)
    │      │
    │      └─ if _vocabulary.md absent: channel emits nothing
    │
    └─ Stem channel ────────── stemTokens() → set membership check (weight 1/0.5/0.25)
           │
           └─ always active (Porter 1980 needs no external file)
```

The synonym channel and stem channel are additive — both run independently and their scores sum. The dedup contract applies per `(original query term, field)` pair: if the exact channel already scored a pair, the expansion channels skip it.

## Graph Traversal Complement

After the scoring loop returns a ranked hit list, the `--graph` flag enables [[graph-traversal-primitive|Graph Traversal Primitive]] to expand the result set by following `sources`, `related`, and `depends_on` links up to N≤2 hops. This is distinct from Tier-2 expansion: Tier-2 widens the query, graph traversal widens the page set from existing hits.

## Examples

Given query `"healing"` and synonym group `{canonical:"heal", variants:["fix","repair"]}`:

- The stem channel converts `"healing"` → `"heal"` and matches pages containing the token `"heal"`.
- The synonym channel matches pages whose title/tags/body contain `"heal"`, `"fix"`, or `"repair"` (but not `"healing"` itself, which the exact channel covers).

Given `_vocabulary.md` absent: only exact matching and stemming run; synonym channel emits nothing.

## Related Concepts

- [[search-scoring-algorithm|Search Scoring Algorithm]] — the scoring framework this tier feeds into
- [[synonym-lexicon|Synonym Lexicon]] — the `_vocabulary.md` lexicon and its union-find compilation
- [[porter-stemmer|Porter Stemmer]] — the pure algorithmic stemmer used by the stem channel
- Wiki-Native Recall — the broader NO-RAG retrieval design that Tier-2 extends
- [[graph-traversal-primitive|Graph Traversal Primitive]] — the graph-walk expansion that follows from Tier-2 hits
