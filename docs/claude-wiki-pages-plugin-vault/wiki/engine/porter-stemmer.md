---
title: "Porter Stemmer"
type: concept
aliases: ["Porter Stemmer", "Porter 1980 stemmer", "stem()", "stemTokens()", "stemmer"]
parent: "[[Engine — Index]]"
path: "engine"
sources: ["[[stem.ts Source]]", "[[search.ts Source]]"]
related: ["[[Tier-2 Deterministic Recall]]", "[[Search Scoring Algorithm]]", "[[Synonym Lexicon]]", "[[Wiki-Native Recall]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["engine", "nlp", "stemming"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Porter Stemmer

## Definition

The Porter Stemmer is a pure, deterministic, zero-dependency TypeScript implementation of the Porter 1980 suffix-stripping algorithm, located in `src/core/stem.ts`. It reduces inflected English words to a common stem form, enabling the stem channel of the search scoring algorithm to match morphological variants (e.g. "healing" and "heal" share the stem "heal").

## Key Principles

- **Pure**: same input token → same output stem, always. No mutable state, no caching.
- **Total**: never throws; `""` → `""`. Short tokens (length ≤ 2) are returned unchanged.
- **Idempotent**: `stem(stem(x)) === stem(x)` for all inputs.
- **ASCII-lowercase requirement**: callers must pass lowercase ASCII input. `stemTokens()` handles this.
- **Follows Porter 1980 exactly**: the 5-step algorithm (1a, 1b, 1c, 2, 3, 4, 5a, 5b) is implemented without shortcuts or extensions.

## Examples

- Step 1a (plurals): `"caresses"` → `"caress"`, `"ponies"` → `"poni"`, `"cats"` → `"cat"`
- Step 1b (-eed/-ed/-ing): `"agreed"` → `"agree"`, `"plastered"` → `"plaster"`, `"motoring"` → `"motor"`
- Step 2 (derivational): `"conditional"` → `"condition"`, `"rationalize"` → `"rational"`
- Step 4 (m>1 removal): `"conformism"` → `"conform"`, `"activism"` → `"activ"`
- `stemTokens("Search Scoring Algorithm")` → `Set{"search", "score", "algorithm"}`

## Related Concepts

- [[Tier-2 Deterministic Recall]] — the search layer that uses stemTokens() for the stem channel
- [[Search Scoring Algorithm]] — the broader scoring framework the stem channel feeds into
- [[Synonym Lexicon]] — the complementary expansion mechanism (curated synonyms vs algorithmic stems)
