# ADR-0007: Wiki-native recall — embedding-free query expansion over a curated lexicon and a fixed stemmer

- **Status:** Accepted
- **Date:** 2026-06-05
- **SPEC anchor:** §4 (efficient retrieval), §5 (NO embeddings — precompiled wiki pages); Brief §5 (NO embeddings, ever — absolute), §6

## Context

The demonstrated recall failure is the zero-overlap miss: `search` (`src/commands/search/search.ts`) drops any page that scores zero, so a query for "car" never finds a page titled "Automobile" — there is no shared token, so no score, so the page is invisible. The obvious industry fix — embed query and pages into a vector space and rank by similarity — is **forbidden by an absolute non-negotiable** (Brief §5, decision #11.1): no vector store, no embeddings, no similarity over latent vectors, ever. The Tier-3 local-embedding re-ranker was dropped permanently.

So recall has to be solved the wiki-native way: make the wiki's *own structure* the recall substrate, deterministically, in the Bun engine. The levers are candidate filters, aliases-as-synonyms, a curated synonym lexicon, and deterministic stemming, all applied as query expansion *before* scoring, with expanded matches scored at a strictly lower fixed weight so transparent ranking is preserved. The constraint that makes this defensible to the most skeptical reviewer is that every step must be a *lookup table or a fixed algorithm* — auditable, offline, and byte-identical across runs — never a learned model.

## Decision

Implement recall as a deterministic expansion of the query *term set* that runs strictly before the existing scoring loop. The scorer, the weight table, and the score object (ADR-0006) are unchanged in kind; they gain channels and two lower weight tiers. Three pieces:

1. **A curated synonym lexicon — `vault/_vocabulary.md`.** A checked-in, human-edited, git-versioned Data-layer file (a sibling of `wiki/`, like `_proposed/` and `_templates/`), outside every wiki-scoped check. Its frontmatter carries synonym groups (concept → variants); the engine loads it via `src/core/vocabulary.ts`, reusing the existing frontmatter parser — no new file syntax. Each group is an unordered equivalence class of surface forms; querying any member expands to the whole class. Overlapping groups merge by union-find closure so the parse is **order-independent** (two files with the same groups in any order yield the same lexicon). An absent file degrades to exact-match (empty lexicon), never an error.
2. **A pure deterministic stemmer — `src/core/stem.ts`.** A fixed Porter-style algorithm — a sequence of suffix-rewrite rules, no data files, no network, no ML — applied symmetrically to query terms and page tokens so "running"/"ran"/"runs" collapse. `stem` is a pure, total, idempotent function: same input → same output, forever.
3. **Pre-scoring query expansion with a strict weight ladder.** Before scoring, each query term fans out to: itself (exact), its lexicon synonyms, and its stem. Matches from expansion score at strictly-lower fixed weights than a direct match — title direct `5`, title synonym `2`, title/everything stem `1` (`src/commands/search/search.ts:130-142`) — so **direct > synonym > stem** on any field, and a synonym hit can only *rescue* a page from the zero cliff, never outrank a real keyword hit. Expanded matches are emitted on the `synonym-term` and `stem-term` channels of the ADR-0006 score object (`src/commands/search/search.ts:42-50`), each paired with its points, so `score === sum(matched[].points)` still holds and the breakdown shows *why* a synonym hit ranked where it did. Expansion is de-duplicated by highest-precedence origin (exact beats synonym beats stem) so a term arising two ways is scored once, never double-counted.

The whole path is enforced offline by **gate-13** (`tests/gates/gate-13-no-rag.sh`): it scans the retrieval files — `search.ts`, `vocabulary.ts`, `stem.ts`, `graph.ts` (`tests/gates/gate-13-no-rag.sh:176-183`) — and fails if any imports an embedding/vector/HTTP/similarity library or calls a forbidden token on the path. The gate ships with a `--self-test` that plants a forbidden token and asserts the gate catches it, so it can never silently regress to fail-open.

## Alternatives considered

- **Any vector / embedding / similarity ranker (local or hosted).** Rejected — it violates the absolute NO-embeddings non-negotiable (Brief §5, decision #11.1). This is not a tradeoff to weigh; it is out by definition. Recall is solved with lookup tables and fixed algorithms instead, and gate-13 makes that a CI invariant rather than a promise.
- **A learned or statistical query expander (word2vec neighbours, co-occurrence model, trained synonym miner).** Rejected. It reintroduces latent-vector similarity by the back door and is non-deterministic across training runs. A *curated* lexicon a human edits in `vault/_vocabulary.md` is auditable, governed, and byte-identical every run — the property the PM scrutinises hardest.
- **Equal weight for synonym/stem and direct matches.** Rejected. It would let a synonym match outrank an exact title hit, destroying the transparent ranking. The strict ladder (direct > synonym > stem) keeps exact lexical hits on top and uses expansion only to lift pages above the zero cliff.
- **Fold synonyms into each page's frontmatter `aliases` instead of a vault-global lexicon.** Rejected as the sole mechanism. `aliases` are the *page-side* advertisement of a page's own alternate names (already matched via the title haystack); the lexicon is the *query-side* expansion of cross-page concept synonyms. These are the two ends of one handshake meeting at the same string match — keeping both in their single home avoids a second synonym store. Recording conceptual synonyms in `aliases` during ingest remains a curator discipline, not a second engine mechanism.
- **A separate vocabulary store (JSON/SQLite) outside the vault.** Rejected. It puts the lexicon outside schema + frontmatter + wikilinks and splits truth from the vault it governs. A frontmatter-carrying markdown file in the vault is human-editable, git-versioned with the data, and parsed by the existing parser.

## Consequences

**Positive.**

- The zero-overlap miss is fixed without embeddings: "car" now finds "Automobile" via the curated lexicon, surfaced at a low synonym weight beneath any direct hit, with a `synonym-term` component spelling out the reason.
- Determinism is structural: a curated table plus a pure stemmer means same query + same vault + same lexicon → byte-identical hits *and* breakdown. There is no model, no network, no training seed to vary.
- NO-RAG is a CI invariant. gate-13 scans the whole retrieval path and self-tests against the fail-open regression, so a future contributor cannot quietly add a similarity shortcut.
- It composes cleanly with the one score object (ADR-0006): expansion only adds channels and lower weights; the scorer and `score === sum(points)` invariant are unchanged.

**Negative.**

- **The lexicon is a curation burden.** Recall is only as good as the synonym groups a human maintains in `vault/_vocabulary.md`. Accepted: that is the point — governed, auditable recall over opaque similarity. Lint can later flag stale or orphaned groups.
- **Substring matching does not compose with stemming**, so the stem channel matches on a tokenized word set rather than the existing haystack-substring approach. Mitigated by keeping the exact channels' substring behaviour unchanged and running the stem channel as a separate tokenized pass, so existing exact-match scores do not shift.
- **Two new channels and six new weight constants** widen the scoring surface. Accepted: each is a fixed literal in one file, ordered explicitly in `CHANNEL_ORDER`, and covered by the `score === sum(points)` invariant.

## Revisit when

- Recall still misses a class of queries the lexicon and stemmer cannot reach (e.g. multi-word paraphrase). Outcome: extend the *deterministic* levers (graph/predicate expansion already lands in ADR-0008) — never reach for vectors.
- The lexicon grows large enough that hand-curation drifts. Outcome: add lint conformance and freshness evaluations for `vault/_vocabulary.md` (the tag-taxonomy work already contemplates this) — governance, not learning.
- A non-English vault needs stemming. Outcome: parameterise the stemmer by a fixed per-language rule set, keeping it a pure algorithm with no data files that vary.
