---
title: "Vault Vocabulary"
groups: []
---

# Vault Vocabulary

A curation template for synonym groups. The search engine reads this file at
query time and expands a query term to its synonyms before scoring — a search
for an abbreviation can also surface pages that spell the term out, and vice
versa.

This reference vault ships **no synonym groups** (`groups: []`). It is a small,
self-descriptive meta-vault whose terms have no pair that clears every rule
below (its abbreviations — `llm`, `moc`, `cli`, `pdf` — are never spelled out in
prose, and its only same-word candidates are either generic or collide under the
stemmer). An empty lexicon is valid and treated as clean: not every vault needs
synonym expansion. Add groups when your own vault has term pairs that qualify.

## How a group is reached (read before adding one)

The engine tokenizes the query on non-alphanumeric boundaries
(`src/commands/search/search.ts`, `terms()`), then looks up each token in this
lexicon. A group therefore only fires when **at least one form is a single
token** that appears as a whole query word — a multi-word phrase
("ingest pipeline") tokenizes to its parts (`ingest`, `pipeline`) and its
multi-word key is never looked up. So a usable group needs a single-word form
(an abbreviation, or one word of a same-sense pair) as its entry point.

## Standard for every group

A group ships ONLY if every form clears all five rules. Bias to leaving the list
empty: a correct empty template beats a borderline group that pollutes recall.

1. **Genuine, same-sense synonymy** — interchangeable surface forms of the SAME
   concept, so expanding a query from one form to the others is always correct.
   Read every occurrence and reject false friends. (`directory` looks like a
   synonym of `folder`, but in this vault its one use means the shell working
   directory — a different referent — so the pair is unsafe.) Merely related or
   co-occurring terms do NOT qualify (listing `agent` under `llm` would pollute
   recall — they co-occur but are different things).
2. **Single-token reachability** — at least one form must be a single word, or
   the group is dead code (the engine never looks up a multi-word key).
3. **Attested in prose** — every form appears in `wiki/` in real prose (not just
   an `aliases:` line), or `scripts/lint-vocabulary.sh` flags it as orphaned
   drift.
4. **Not a high-frequency generic** — reject any form that appears on a large
   fraction of pages (here, `wiki`, `vault`, `source`, and even `folder` at
   ~46% are too common): expanding toward it matches almost everything and
   destroys precision. Prefer specific, mid-frequency synonyms.
5. **Stemmer-distinct** — the forms must stem to different roots
   (`src/core/stem.ts`). If the Porter stemmer already collapses them (e.g.
   `wikilink`/`wikilinks`, `moc`/`mocs`), the stem channel covers the match for
   free and the group adds nothing.

## Usage

The engine reads this file automatically at query time. Human editors curate it;
the engine never writes here.

- Each `canonical` form is the preferred display term.
- `variants` lists alternate single-word spellings, abbreviations, and true
  same-sense aliases of the SAME concept.
- All forms are treated as equivalent for retrieval; exact matches still score
  higher than synonym matches.

## Updating

Add a group only when its forms clear all five rules above. Keep the list DRY:
one group per concept. Overlapping groups are union-merged automatically.
