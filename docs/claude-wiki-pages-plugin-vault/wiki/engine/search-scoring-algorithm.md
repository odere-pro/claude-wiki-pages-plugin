---
title: "Search Scoring Algorithm"
type: concept
aliases: ["Search Scoring Algorithm", "search scoring", "scoring channels", "MatchComponent"]
parent: "[[Engine — Index]]"
path: "engine"
sources: ["[[search.ts Source]]", "[[Engine API Skill (SKILL.md)]]", "[[graph.ts Source]]"]
related: ["[[Tier-2 Deterministic Recall]]", "[[Graph Walk Algorithm]]", "[[Synonym Lexicon]]", "[[Porter Stemmer]]", "[[Wiki-Native Recall]]", "[[Deterministic Engine]]"]
contradicts: []
supersedes: []
depends_on: ["[[Tier-2 Deterministic Recall]]", "[[Graph Walk Algorithm]]"]
tags: ["engine", "search", "scoring"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Search Scoring Algorithm

## Definition

The Search Scoring Algorithm is the transparent, fixed-weight scoring function inside `src/commands/search/search.ts`. It assigns points to each wiki page based on how query terms match across eight scoring channels. Same query over the same vault always yields the same ranking — the algorithm is deterministic and gate-testable. No embeddings, no network, no ML.

## Key Principles

- **Reproducibility**: all weights are compile-time constants. Same input → same ranking.
- **R4 invariant**: `score === sum(matched[].points)` holds at all times. Every `score +=` is paired with a `components.push()`.
- **Channel hierarchy**: exact channels score highest; synonym channels score lower; stem channels score lowest; graph-edge is the weakest signal.
- **Deduplication**: a `(source term, field)` pair is only emitted once for synonym/stem channels, preventing score inflation when multiple synonyms all match the same field.

## Scoring Channels and Weights

| Channel                | Weight | Notes                                                          |
| ---------------------- | ------ | -------------------------------------------------------------- |
| `title-phrase`         | 10     | Full query phrase found in title/aliases                       |
| `title-term`           | 5      | Individual query term in title/aliases                         |
| `tag-term`             | 3      | Term in frontmatter tags                                       |
| `body-term`            | 1      | Term in body (capped at `BODY_HITS_CAP=5` occurrences)         |
| `synonym-term` (title) | 2      | Synonym of query term in title                                 |
| `synonym-term` (tag)   | 1      | Synonym of query term in tags                                  |
| `synonym-term` (body)  | 1      | Synonym in body (capped)                                       |
| `stem-term`            | 1      | Stemmed form of query term (title/tag/body; set equality only) |
| `graph-edge` hop-1     | 2      | R2 graph neighbor at 1 hop                                     |
| `graph-edge` hop-2     | 1      | R2 graph neighbor at 2 hops                                    |

## Examples

For query `"graph rag"`:

- A page with title `"Graph RAG"` scores `10 (phrase) + 5 (graph) + 5 (rag) = 20`.
- A page with tag `"graph"` but no title match scores `3`.
- A graph neighbor of a seed hit at hop-1 scores `2`.

## Related Concepts

- [[Tier-2 Deterministic Recall]] — the synonym and stem channels layered into this algorithm
- [[Graph Walk Algorithm]] — the R2 graph channel (opt-in via `--graph`)
- [[Synonym Lexicon]] — provides synonym expansion for `synonym-term` channels
- [[Porter Stemmer]] — provides stem forms for `stem-term` channel
- [[Wiki-Native Recall]] — the broader design principle this implements
