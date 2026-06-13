---
title: "Wiki-Native Recall"
type: concept
aliases: ["Wiki-Native Recall", "wiki-native recall", "deterministic retrieval", "keyword search"]
parent: "[[Decisions]]"
path: "decisions"
sources: ["[[ADR-0007: Wiki-Native Recall]]", "[[ADR-0006: One Search Score Object]]", "[[ADR-0008: One Graph-Traversal Primitive]]", "[[Glossary]]"]
related: ["[[NO-RAG Principle]]", "[[Deterministic Engine]]", "[[Graph Traversal Primitive]]", "[[Search Score Object]]", "[[Analyst Agent]]"]
tags: ["concept", "retrieval", "search"]
created: 2026-06-13
updated: 2026-06-13
update_count: 5
status: active
confidence: 1.0
---

# Wiki-Native Recall

> [!summary]
> Wiki-native recall is the [[NO-RAG Principle]]'s concrete implementation: a deterministic, embedding-free retrieval pipeline that combines keyword matching, a curated synonym lexicon, a Porter-style stemmer, and graph link-walking into a scored, fully explainable result. Every retrieval operation produces a `score === sum(matched[].points)` breakdown so the user can see exactly why each page ranked. Same query + same vault + same lexicon → byte-identical results every run.

## Problem Statement (ADR-0007)

The demonstrated recall failure was the zero-overlap miss: the engine drops any page that scores zero. A query for "car" returns nothing on a page titled "Automobile" because there is no shared token, no score, and the page is invisible. The obvious fix — embed query and pages into a vector space and rank by similarity — is forbidden by the absolute NO-RAG non-negotiable (§5, Brief decision #11.1): no vector store, no embeddings, no similarity over latent vectors, ever.

Recall had to be solved the wiki-native way: make the wiki's own structure the recall substrate, deterministically, in the Bun engine. The constraint: every step must be a lookup table or a fixed algorithm — auditable, offline, byte-identical across runs.

## Three-Part Implementation

### 1. Curated Synonym Lexicon (`vault/_vocabulary.md`)

A human-edited, git-versioned file at the Data layer (a sibling of `wiki/`, like `_templates/` and `_proposed/`). Its frontmatter carries synonym groups — unordered equivalence classes of surface forms (concept → variants). The engine loads it via `src/core/vocabulary.ts`, reusing the existing frontmatter parser.

Key properties:
- **Order-independent:** overlapping groups merge by union-find closure, so two files with the same groups in any order yield the same lexicon.
- **Absent file = exact-match only:** if `_vocabulary.md` is missing, the engine degrades to exact keyword search rather than erroring.
- **Governed:** adding a synonym requires editing the checked-in file, not a training run.

The lexicon addresses the cross-page concept synonym case: `_vocabulary.md` is the *query-side* expansion of "car → automobile → vehicle"; frontmatter `aliases` are the *page-side* advertisement of a page's own alternate names. These two ends of one handshake meet at the same string match — no second engine mechanism.

### 2. Porter-Style Stemmer (`src/core/stem.ts`)

A pure, total, idempotent function: a sequence of suffix-rewrite rules (no data files, no network, no ML) applied symmetrically to query terms and page tokens. "running"/"ran"/"runs" all collapse to "run." Same input → same output, forever.

The stemmer operates on tokenized word sets rather than substrings, keeping it distinct from the exact-match channels (which use substring matching). This means existing exact-match scores do not shift when stemming is added.

### 3. Pre-Scoring Query Expansion with Strict Weight Ladder

Before the scoring loop, each query term fans out to three candidates:
1. Itself (exact)
2. Its lexicon synonyms
3. Its stem

Matches from expansion score at strictly-lower fixed weights so **direct > synonym > stem** on any field:

| Channel | Weight (title) | Example |
| --- | --- | --- |
| `title-phrase` | 5 | Exact title match |
| `title-term` | 4 | Title contains exact term |
| `alias-term` | 3 | Alias contains exact term |
| `tag-term` | 2 | Tag matches term |
| `body-term` | 1 | Body contains term |
| `synonym-term` | 2 (title) | Synonym expansion match |
| `stem-term` | 1 | Stem match |
| `graph-edge` | variable (hop-decayed) | Reached via wikilink walk |

A synonym hit can only rescue a page from the zero cliff; it can never outrank a real keyword hit on the same field. Expanded matches are de-duplicated by highest-precedence origin so a term matched two ways is scored once.

## Score Object (ADR-0006)

Every search result carries a `SearchHit` with:
```typescript
{
  page: string,
  score: number,
  matched: Array<{ channel: string, term: string, points: number }>
}
```

The invariant `score === sum(matched[].points)` is enforced. Every point is accounted for. A user can read the `matched[]` array and see exactly why a page ranked where it did — "title-phrase: 5 points because 'automobile' matched the title directly."

## Graph Link-Walk (ADR-0008)

The retrieval pipeline extends into the wiki's link graph via `src/core/graph.ts:walk()`. Starting from a set of seed pages found by keyword matching, the walk follows typed wikilinks:
- `sources` — provenance edges (page → source note)
- `related` — association edges
- `depends_on` — dependency edges

Hop distance penalises score: a page reached in 1 hop scores at 50% of its direct-match score; at 2 hops, 25%. N is capped at 2.

One shared `walk()` function handles all graph traversal in the engine. No second traversal implementation exists — a constraint enforced by code review and named in ADR-0008.

## CI Enforcement

`tests/gates/gate-13-no-rag.sh` scans `src/commands/search/search.ts`, `src/core/vocabulary.ts`, `src/core/stem.ts`, and `src/core/graph.ts` for forbidden imports (HTTP clients, embedding libraries, similarity functions). The gate ships with a `--self-test` that plants a forbidden token and asserts the gate catches it. A gate that cannot fail cannot be trusted.

## Known Trade-Offs

- **Curation burden.** Recall is only as good as the synonym groups in `_vocabulary.md`. Lint can later flag stale groups. This is the point: governed, auditable recall over opaque similarity.
- **No multi-word paraphrase.** A query "multi-hop retrieval" does not match "graph traversal" unless a synonym group explicitly connects them. The solution is to extend the lexicon, never to reach for vectors.
- **Non-English vaults.** The Porter-style stemmer is English-specific. Parameterising by a fixed per-language rule set is the planned extension path (no data files that vary, still a pure algorithm).

## Related

- [[NO-RAG Principle]] — the non-negotiable that mandates this approach
- [[Deterministic Engine]] — the Bun CLI that implements wiki-native recall
- [[Graph Traversal Primitive]] — `src/core/graph.ts:walk()` used in graph-link scoring
- [[Search Score Object]] — the `SearchHit.matched[]` breakdown
- [[Analyst Agent]] — the primary consumer of wiki-native recall for query answers
