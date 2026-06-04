---
name: search
description: >
  Find wiki pages by keyword with a deterministic, reproducible ranking and
  [[wikilink]]-ready results. Trigger when the user or an agent wants to locate
  pages ("find pages about X", "which pages mention Y", "list notes tagged Z")
  or needs a candidate set before a deeper query/synthesis. Backed by the
  engine `search` command; read-only. For a cited natural-language answer, use
  /claude-wiki-pages:query instead. Tier-2 recall: synonym expansion via
  _vocabulary.md and Porter stemming eliminate zero-overlap misses without
  embeddings.
allowed-tools: Read Bash Glob Grep
---

# LLM Wiki — Search

Locate wiki pages by keyword. This is the **retrieval substrate**: it returns a
ranked candidate set, not a synthesised answer. Use it to find the right pages,
then read them (or hand them to `query`/`synthesize`) for the actual reasoning.

Unlike `query`, search does not compose an answer or guarantee citations — it
ranks pages so you know where to look.

## When to invoke

- The user wants to find or list pages by term, alias, or tag.
- An agent (`claude-wiki-pages-analyst-agent`) needs a candidate set before
  query, synthesize, or compile.

## How to run

The engine owns the ranking so results are reproducible:

```sh
bash scripts/engine.sh search "<query>" --target <vault> --json
```

### R1 candidate filters

Three optional flags prune the candidate page set **before** scoring. They compose with AND; absent flags match everything.

| Flag | Behaviour |
| --- | --- |
| `--type <T>` | Keep only pages whose frontmatter `type` equals `T` exactly. Validation strategy: **filter-only** — the page-type enum is single-sourced in `ontology-profile-v1` (`docs/vault-example/CLAUDE.md §Enum list`); the engine carries no copy. An unknown `T` simply returns zero hits. |
| `--folder <path>` | Keep only pages whose vault-relative file path starts with `<path>/` (path-prefix match; trailing slash normalised). Example: `--folder wiki/ai` restricts to `wiki/ai/*`. |
| `--tag <tag>` | Best-effort filter: keep only pages whose frontmatter `tags` list contains `<tag>` as an exact member. Precision only; tag-vocabulary validation is a later item (governed taxonomy). |

```sh
# Only concept pages mentioning "retrieval":
bash scripts/engine.sh search "retrieval" --type concept --target <vault> --json

# Pages under wiki/ai/ only:
bash scripts/engine.sh search "retrieval" --folder wiki/ai --target <vault> --json

# Pages tagged "retrieval":
bash scripts/engine.sh search "retrieval" --tag retrieval --target <vault> --json

# Combined (AND): concept pages in wiki/ai/ tagged "retrieval":
bash scripts/engine.sh search "retrieval" --type concept --folder wiki/ai --tag retrieval --target <vault> --json
```

`--json` returns:

```json
{
  "command": "search",
  "vault": "…",
  "query": "graph rag",
  "hits": [
    {
      "title": "Graph RAG",
      "wikilink": "[[Graph RAG]]",
      "file": "wiki/ai/graph-rag.md",
      "type": "concept",
      "score": 18,
      "snippet": "Graph RAG walks the knowledge graph…",
      "matched": [
        { "channel": "title-phrase", "term": "",      "hits": 1, "points": 10 },
        { "channel": "title-term",   "term": "graph", "hits": 1, "points": 5  },
        { "channel": "title-term",   "term": "rag",   "hits": 1, "points": 5  },
        { "channel": "body-term",    "term": "graph", "hits": 3, "points": 3  }
      ]
    }
  ]
}
```

`matched` is the score breakdown: **one `MatchComponent` per scoring site**,
sorted by `points` desc → `channel` (union literal order: `title-phrase`,
`title-term`, `alias-term`, `tag-term`, `body-term`) → `term` lexicographic.
Hard invariant: `hit.score === hit.matched.reduce((s,m) => s+m.points, 0)`.
JSON-only — the human text output (`search` without `--json`) does not emit it.

`alias-term` and `graph-edge` are reserved channel names (forward-compat for
Phase 2 alias-tracking and graph-edge contributions); they are not emitted now.

Scoring is fixed and transparent: a title/alias phrase match outranks a
per-term title match, which outranks a tag match, which outranks body-frequency
hits (capped). Ties break alphabetically by title, so the ranking is stable.

If Bun is unavailable, fall back to `Grep` over `vault/wiki/**` and rank by hand
using the same priority (title/alias > tag > body).

## Output

- Report the top hits as `[[wikilink]]` so the user can open them directly.
- Every hit resolves to a real page — never invent titles.
- When the next step is a cited answer, escalate to `/claude-wiki-pages:query`.

## Tier-2 deterministic recall

When a query term has no exact match in a page, the engine expands it before
scoring using two deterministic mechanisms — no embeddings, no network, no ML.

### Synonym lexicon (`_vocabulary.md`)

Place `_vocabulary.md` at the vault root (sibling of `wiki/`, outside
wiki-scoped checks). The engine reads it at query time; humans curate it; the
engine never writes it.

```yaml
---
title: "Vault Vocabulary"
groups:
  - canonical: "automobile"
    variants: ["car", "auto", "motorcar"]
  - canonical: "machine learning"
    variants: ["ml", "machine-learning"]
---
```

A query for `"car"` will also match pages that contain `"automobile"`, `"auto"`,
or `"motorcar"`. Synonym matches score lower than exact matches
(`W_TERM_TITLE_SYNONYM=2` vs `W_TERM_TITLE=5`), so exact-match pages rank first.

The lexicon is **filename-addressed** (`_vocabulary.md`) — no `type:` frontmatter
field is required and none is added to the page-type enum.

When `_vocabulary.md` is absent, search degrades silently to exact-only behavior
(the pre-Tier-2 contract). The engine never throws on an absent lexicon.

> **Conceptual synonyms vs aliases:** the `aliases` frontmatter field records
> known alternate names for a *specific page* (consumed page-side by `titleHay`).
> The lexicon records cross-page synonym classes consumed *query-side*. Ingest and
> curator record conceptual synonyms in `aliases`; the lexicon records vocabulary
> expansions. Do NOT copy `aliases` into the lexicon or vice versa.

### Porter stemmer

The engine applies a pure Porter 1980 stemmer to each query term. A page whose
title or body contains a morphological variant (`"running"` → stem `"run"`,
`"ponies"` → stem `"poni"`, `"caresses"` → stem `"caress"`) will be found even
if the query uses the base form. Stem matches score at `W_TERM_*_STEM=1` —
lower than synonyms.

The stemmer is a pure TypeScript function: no data files, no network, no ML
model. `stem(stem(x)) === stem(x)` (idempotent) and `stem("")===""` (total).

### Score invariant under expansion

`score === matched.reduce((s,m) => s+m.points, 0)` is preserved. Each synonym
or stem match emits exactly one `MatchComponent` per `(source query term, field)`
pair. De-duplication: if the source query term already scored a field exactly,
the synonym/stem channel is suppressed for that `(source, field)` pair.

### Channel order (including Tier-2)

```
title-phrase → title-term → alias-term → tag-term → body-term
→ synonym-term → stem-term
```

Exact channels precede Tier-2 channels so exact matches win ties.

## GraphRAG (later phase)

`search` is the substrate for graph-aware retrieval: a future `search --graph`
expands each hit along the wikilink graph (`sources`, `related`, `depends_on`)
to return its N-hop neighbourhood. The graph already exists in frontmatter; the
expansion is traversal, not a new index.
