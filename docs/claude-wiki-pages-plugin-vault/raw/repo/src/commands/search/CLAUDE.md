# search — deterministic full-text + frontmatter search

`search` is the retrieval substrate the analyst agent reads before it reasons: it
ranks `wiki/` pages by a transparent, reproducible score and returns each hit as a
`[[wikilink]]` so citations resolve. The scoring is the whole point — no
embeddings, no vectors, no network, no ML (the NO-RAG absolute). The same query
over the same vault yields the same ranking, which is exactly what makes it
gate-testable. The handler in [`search.ts`](./search.ts) walks the wiki, scores
each page through a fixed set of channels, and (optionally) expands along the
wikilink graph at a strictly lower weight.

## Input and flags

- `claude-wiki-pages search <query>` — rank pages by relevance to the query.
- `--type <t>` — candidate filter: frontmatter `type` exact match (applied before
  scoring).
- `--folder <prefix>` — candidate filter: vault-relative path prefix.
- `--tag <t>` — candidate filter (best-effort): `tags` membership.
- `--graph` — opt-in N≤2 link-walk expansion (off by default).
- `--json` — emit the full `SearchReport` with the per-hit score breakdown.

Candidate filters compose with AND and prune the page set BEFORE scoring; they do
not change the weights. An unknown `--type` simply matches no pages.

## Scoring channels

Every score is a sum of fixed-weight contributions from transparent channels.
Exact channels score highest; synonym and stem expansions flow through the same
ranker at lower weights — one mechanism, not a bolt-on.

| Channel | Weight | Source |
| --- | --- | --- |
| `title-phrase` | 10 | whole-query substring in title/aliases |
| `title-term` | 5 | per-term title/alias hit |
| `tag-term` | 3 | per-term tag hit |
| `body-term` | 1 (capped at 5 hits) | per-term body occurrences |
| `synonym-term` | 1–2 | via the lexicon in [`../../core/vocabulary.ts`](../../core/vocabulary.ts) |
| `stem-term` | 1 | via the Porter stemmer in [`../../core/stem.ts`](../../core/stem.ts) |
| `graph-edge` | 1–2 (hop-decayed) | via the link-walk in [`../../core/graph.ts`](../../core/graph.ts) |

Synonym and stem channels only fire for a (term, field) pair the exact channel did
NOT already score, which prevents inflation when several synonyms of one term all
match. An absent `_vocabulary.md` degrades gracefully to exact-match-only.

## The matched{} score object

Each hit carries a `matched` array — one `MatchComponent` (`channel`, `term`,
`hits`, `points`) per channel that fired, sorted points-desc then channel order
then term. The hard invariant is `score === sum(matched[].points)`: every `score
+=` in the ranker is paired with a component push. This breakdown is JSON-only —
an agent reads it to make cut-off decisions; the human text renderer never prints
it.

## Optional --graph expansion (NO-RAG)

With `--graph`, after the keyword + synonym + stem hits are computed, `walk()`
(over `sources` + `related` + `depends_on`, the `R2_EDGES` predicate set) expands
from the keyword hits as seeds. Graph is the WEAKEST signal: hop-decayed and
strictly below the synonym weight, with `graph-edge` last in the channel order. A
graph neighbour either augments an existing hit (adds a `graph-edge` component) or
becomes a new bodyless hit. When `--graph` is absent, zero graph code is
observable — the default path is byte-identical to the pre-graph baseline. This is
still deterministic link-walking, not RAG: no vectors, no embeddings, no `fetch()`.

## Agent path vs human path

- Agent path (`--json`): the full `SearchReport` including `matched` per hit.
- Human path (text): one `score  [[wikilink]]  (file)` line per hit, or a
  `no matches` line.

## SearchReport

```ts
interface SearchHit {
  title: string;
  wikilink: string;     // `[[Title]]`, ready to cite
  file: string;         // vault-relative path
  type: string;
  score: number;
  snippet: string;      // first matching body line (human only)
  matched: readonly MatchComponent[]; // JSON-only breakdown
}

interface SearchReport {
  command: "search";
  vault: string;
  query: string;
  hits: readonly SearchHit[]; // sorted score-desc, then title
}
```

## Edge cases

- A query of only stopword-length tokens (length ≤ 1) yields no hits.
- Bookkeeping pages are skipped; only citable wiki pages are ranked.
- Ties break by title lexicographically, so the ranking is a total order — no
  insertion-order nondeterminism.

## Covered by

- [`search.test.ts`](./search.test.ts) — channel weights, the `matched` invariant,
  candidate filters, synonym/stem expansion, and the `--graph` walk.
