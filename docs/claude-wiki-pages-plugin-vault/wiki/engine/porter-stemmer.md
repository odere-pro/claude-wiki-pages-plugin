---
title: "Porter Stemmer"
type: concept
aliases: ["Porter Stemmer", "Porter 1980 stemmer", "stem()", "stemTokens()", "stemmer"]
parent: "[[Engine — Index]]"
path: "engine"
sources: ["[[stem.ts Source]]", "[[search.ts Source]]", "[[Engine API Skill (SKILL.md)]]"]
related:
  [
    "[[Tier-2 Deterministic Recall]]",
    "[[Search Scoring Algorithm]]",
    "[[Synonym Lexicon]]",
    "[[Wiki-Native Recall]]",
  ]
contradicts: []
supersedes: []
depends_on: []
tags: ["engine", "nlp", "stemming"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Porter Stemmer

## Definition

The Porter Stemmer is a pure, deterministic, zero-dependency TypeScript implementation of the Porter 1980 suffix-stripping algorithm, located in `src/core/stem.ts`. It reduces inflected English words to a common stem form, enabling the stem channel of the search scoring algorithm to match morphological variants (e.g. "healing" and "heal" share the stem "heal").

The stemmer is part of the [[Tier-2 Deterministic Recall]] layer. It is one of two expansion mechanisms layered on top of exact-keyword matching; the other is the [[Synonym Lexicon]]. Both are zero-network and zero-ML: the stemmer uses a pure algorithm, the lexicon uses a curated file. No embeddings, no model calls.

## Key Principles

- **Pure**: same input token → same output stem, always. No mutable state, no caching.
- **Total**: never throws; `""` → `""`. Short tokens (length ≤ 2) are returned unchanged.
- **Idempotent**: `stem(stem(x)) === stem(x)` for all inputs.
- **ASCII-lowercase requirement**: callers must pass lowercase ASCII input. `stemTokens()` handles the lowercasing before stemming.
- **Follows Porter 1980 exactly**: the 5-step algorithm (1a, 1b, 1c, 2, 3, 4, 5a, 5b) is implemented without shortcuts or extensions.

## Algorithm Steps

Porter 1980 defines a cascade of suffix-stripping rules parameterized by `m` (the measure — number of VC sequences before the suffix):

| Step | Name                  | Example rule                                                  |
| ---- | --------------------- | ------------------------------------------------------------- |
| 1a   | Plural/sibilant       | `-sses` → `-ss`; `-ies` → `-i`; `-s` → (strip if no s before) |
| 1b   | Past tense / -ing     | `-eed` → `-ee` (m>0); `-ed`/`-ing` → (strip + fixup)          |
| 1c   | `-y` → `-i`           | `happy` → `happi`                                             |
| 2    | Derivational suffixes | `-ational` → `-ate`; `-izer` → `-ize` (m>0)                   |
| 3    | More derivational     | `-icate` → `-ic`; `-ful` → (strip) (m>0)                      |
| 4    | Long suffix removal   | `-ment`, `-ness`, `-ism` → (strip) (m>1)                      |
| 5a   | Final `-e`            | strip if m>1; strip if m=1 and not \*o                        |
| 5b   | Double consonant      | `-ll` → `-l` if m>1                                           |

## Integration

`stemTokens(text: string): Set<string>` is the primary consumer-facing function. It tokenizes the input, lowercases each token, strips punctuation, and applies `stem()` to each. The result is a deduplicated Set of stem forms.

In the scoring loop (`search.ts`), the stem channel:

1. Calls `stemTokens(queryText)` to get a set of query stems.
2. For each wiki page field (title, tags, body), calls `stemTokens(fieldText)` to get the field's stem set.
3. Scores a match if any query stem is in the field's stem set — using set membership, never substring inclusion. This prevents short stems from false-matching long unrelated words.
4. Stem-channel hits score lower than exact hits: stem title = 1 vs exact title = 5.

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
- [[Wiki-Native Recall]] — the no-RAG retrieval design that the Porter Stemmer serves
