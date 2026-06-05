# ADR-0008: One graph-traversal primitive — bodyless N-hop link-walk, and R2 `--graph`

- **Status:** Accepted
- **Date:** 2026-06-05
- **SPEC anchor:** §4 (efficient retrieval), §10 (ontology — typed predicates); Brief §6 (one graph-traversal primitive)

## Context

Keyword recall (ADR-0007) lifts pages above the zero-overlap cliff via the lexicon and stemmer, but it still cannot surface a page that shares *no* terms with the query yet is *structurally* adjacent to a hit — e.g. a tool page reached only through a `related` wikilink from a concept the query matched. The wiki already encodes those relationships as typed wikilinks in frontmatter (`sources`/`related`/`depends_on` and the rest of the `ontology-profile-v1` predicate table, `docs/vault-example/CLAUDE.md:327-345`). The decision is to exploit them as a deterministic link-walk — never vectors.

Two design hazards. First, multiple consumers want a walk — R2 for recall, C1 for descent discovery, R3 for neighbourhood context — and if each forks its own traversal they will diverge on edge set, hop limit, and determinism (the second-source-of-truth failure Brief §6 forbids). Second, a graph walk that reads page *bodies* would be expensive, would pull text into a context budget that C1 is trying to ration, and would blur the line between a structural link-walk and a content-similarity step. Brief §6 is explicit: the primitive returns scored page references, never bodies, and walks the edge set from the ontology profile.

## Decision

Add one shared primitive — `src/core/graph.ts:walk()` — and consume it from R2's opt-in `--graph` flag.

- **The primitive** is a deterministic, bounded breadth-first walk over typed wikilinks in page frontmatter, reusing the existing frontmatter parser (no new parser). It returns **bodyless scored page references** — `GraphRef { wikilink; file; type; hop; via; score }` (`src/core/graph.ts:58-66`) — and never reads page prose. The edge set is a closed union, `GraphEdge` (`src/core/graph.ts:39`), every member of which is a row in the `ontology-profile-v1` predicate table; the type makes it impossible to ask the walker to follow a field that is not a defined predicate. R2's default edge set is the provenance/association core, `R2_EDGES = ["sources", "related", "depends_on"]` (`src/core/graph.ts:52`).
- **Determinism is total.** Breadth-first, hop-by-hop, with every iteration point sorted: frontier pages in path order, predicates in fixed edge-array order, resolved targets in title order. Nearest-hop dedup (a page reached at hop-1 is never re-recorded at hop-2) is first-wins under that total order. Output `refs` are sorted by `(hop asc, score desc, file asc)` (`src/core/graph.ts:13-14`). Same vault + seeds + edges + N → byte-identical output. The hop ceiling is clamped to N ≤ 2 structurally — there is no code path that expands a third hop — and a `visited` set makes the walk cycle-safe (a page linking back to a seed is a no-op). A dangling wikilink resolves to nothing and is skipped, never an error.
- **Domain/range is not enforced at traversal time.** The walker follows any *present* legal-predicate link; whether that edge respects the profile's domain→range is a future S1-check lint concern (`docs/vault-example/CLAUDE.md:345`), not the walker's job to silently drop at query time. The walker follows the predicate; the linter judges the edge.
- **R2 `--graph`** is opt-in and off by default. When absent, `search` behaves exactly as the keyword+Tier-2 path — the default retrieval path stays pure. When set, after keyword scoring it walks from the hits to N ≤ 2 and either *augments* an existing hit (appending a `graph-edge` component and adding its points) or adds a new **bodyless** graph-only hit (`snippet: ""`) for a page a keyword miss would have dropped. Graph is the **weakest** signal: hop-decayed fixed weights strictly below synonym (hop-1 → `W_GRAPH_HOP1`, hop-2 → `W_GRAPH_HOP2`), emitted on the reserved `graph-edge` channel which sits **last** in `CHANNEL_ORDER` (`src/commands/search/search.ts:154`). `term` carries the predicate and `hits` the hop distance, so the breakdown reads "reached via `depends_on` at hop 1" — and `score === sum(matched[].points)` still holds because every graph `score +=` is paired with a component push.
- **One primitive, many consumers.** R2 calls `walk()`; C1 and R3 call the *same* function with a different `edges` parameter (e.g. MOC-descent edges for C1) and the same determinism and bodyless contract. C1 uses it for *discovery* — which adjacent pages exist, to decide what to descend into — and reads the returned `score` as read-only ranking input; it never folds graph points back into the keyword score or re-ranks the result set. The graph provenance rides the JSON-only `matched[]` (ADR-0006), so R3's agent-facing output explains the reach while the human render stays clean.

gate-13 (ADR-0007) already scans `src/core/graph.ts` (`tests/gates/gate-13-no-rag.sh:176-183`), so the walk is held to the same NO-embeddings, no-network invariant as the rest of the retrieval path.

## Alternatives considered

- **A content-similarity neighbourhood (embed neighbours, rank by vector closeness).** Rejected — it violates the absolute NO-embeddings non-negotiable (Brief §5) and would require reading bodies. A deterministic typed-link walk delivers structural recall with zero vectors and zero body reads.
- **Per-consumer forked walks (R2 its own, C1 its own).** Rejected — the second-source-of-truth failure Brief §6 exists to prevent. They would drift on edge set, hop limit, and traversal order. One `walk()` parameterised by `edges` serves all consumers with one determinism guarantee.
- **Return page bodies (or snippets read from the page) with each ref.** Rejected. Brief §6 mandates bodyless refs: it keeps the walk cheap, keeps text out of C1's context budget, and keeps the primitive provably distinct from a similarity step. A consumer that wants a body fetches the page by its `wikilink`.
- **Walk to N > 2, or follow `contradicts`/`supersedes` in R2's default set.** Rejected for now. N ≤ 2 over the provenance/association core is the bounded, high-signal neighbourhood; deeper walks and the dialectical predicates (`contradicts`/`supersedes`) are a Phase-3 concern (and `contradicts`/`supersedes` are reserved for R3/synthesis per `docs/vault-example/CLAUDE.md:345`). The hop ceiling is a hard clamp, not a default, so this cannot regress accidentally.
- **Make `--graph` on by default.** Rejected. Graph is an additional recall lever a caller asks for, never a change to the baseline ranking. Off-by-default keeps the default path byte-identical to keyword+Tier-2, which the PM requires.

## Consequences

**Positive.**

- One traversal in the engine. R2 surfaces adjacent pages, C1 discovers descent targets, R3 gathers neighbourhood context — all through the same `walk()`, the same edge-source-of-truth (`ontology-profile-v1`), and the same determinism.
- Bodyless by contract: the walk reads only frontmatter, so it is cheap, stays out of the context budget, and is structurally distinct from any content-similarity step.
- NO-RAG holds on the graph path too — gate-13 scans `graph.ts`, so a future "rank neighbours by relevance" embedding shortcut fails CI.
- The default path is unchanged: `--graph` off reproduces keyword+Tier-2 byte-for-byte, and when on, graph is the weakest hop-decayed signal that can only rescue pages beneath direct hits, never reorder above them. `score === sum(points)` is preserved.

**Negative.**

- **Recall quality depends on link hygiene.** A vault with sparse or wrong typed wikilinks gets little from `--graph`, and a mis-typed edge is followed until S1-check flags it. Accepted: the walker follows links; the linter (future S1-check) judges them — the right separation of concerns.
- **`hits` overloads to hop-distance on the `graph-edge` channel.** Mitigated by documenting the channel's meaning at its emission site so a reader does not expect occurrence-count semantics on graph rows.
- **A new core module and a new flag.** Accepted: it is one primitive and one opt-in boolean, both additive; no existing surface changes, and the channel it emits was already reserved in ADR-0006.

## Revisit when

- A consumer needs a hop beyond 2 or a predicate outside the provenance/association core. Outcome: a Phase-3 decision that widens `R2_EDGES` or raises the clamp deliberately, with its own ADR — not an ad-hoc bump.
- S1-check ships and domain/range violations become enforceable. Outcome: decide whether the walker should also *skip* illegal edges at query time or continue to defer entirely to lint (current choice: defer).
- The walk becomes a measured hotspot on large vaults. Outcome: cache the per-vault title→file index across calls or memoise frontier resolution, keeping the bodyless, deterministic contract intact.
