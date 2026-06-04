---
name: search
description: >
  Find wiki pages by keyword with a deterministic, reproducible ranking and
  [[wikilink]]-ready results. Trigger when the user or an agent wants to locate
  pages ("find pages about X", "which pages mention Y", "list notes tagged Z")
  or needs a candidate set before a deeper query/synthesis. Backed by the
  engine `search` command; read-only. For a cited natural-language answer, use
  /claude-wiki-pages:query instead.
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

`--json` returns:

```json
{ "command": "search", "vault": "…", "query": "graph rag",
  "hits": [ { "title": "Graph RAG", "wikilink": "[[Graph RAG]]",
             "file": "wiki/ai/graph-rag.md", "type": "concept",
             "score": 18, "snippet": "Graph RAG walks the knowledge graph…" } ] }
```

Scoring is fixed and transparent: a title/alias phrase match outranks a
per-term title match, which outranks a tag match, which outranks body-frequency
hits (capped). Ties break alphabetically by title, so the ranking is stable.

If Bun is unavailable, fall back to `Grep` over `vault/wiki/**` and rank by hand
using the same priority (title/alias > tag > body).

## Output

- Report the top hits as `[[wikilink]]` so the user can open them directly.
- Every hit resolves to a real page — never invent titles.
- When the next step is a cited answer, escalate to `/claude-wiki-pages:query`.

## GraphRAG (later phase)

`search` is the substrate for graph-aware retrieval: a future `search --graph`
expands each hit along the wikilink graph (`sources`, `related`, `depends_on`)
to return its N-hop neighbourhood. The graph already exists in frontmatter; the
expansion is traversal, not a new index.
