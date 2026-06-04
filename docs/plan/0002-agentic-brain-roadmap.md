# claude-wiki-pages: development roadmap (brainstorm output)

> Status: proposal, **decisions resolved (rev5)**. Produced by the `wiki-brainstorm` agent team
> over four sessions, then resolved with the maintainer. Apparatus: `docs/brainstorm/`. A
> `docs/plan/` proposal — promote shipped items to `docs/adr/`.
>
> **Revision history.** rev1 — 7-role 3-round brainstorm. rev2 — NO-RAG stress test + veto
> red-team + peer cross-critique. rev3 — corrected engine facts (stale `dist/cli.js`). rev4 —
> UX/DX "simple to master" section. **rev5 (current)** — the seven open questions are now
> answered by the maintainer; this revision records those decisions and propagates their
> consequences. Resolved decisions marked **[D]**.

## Context

The plugin should grow into the durable memory of an AI harness — written and read by Claude
and other agents, and browsed and edited by humans in Obsidian — that collects and organizes
information into precompiled wiki pages, keeps them grounded and current, and serves precise
topic-scoped retrieval. Per the maintainer's decisions: retrieval stays **strictly
embedding-free** and gets its recall from a *smart, wiki-native* deterministic design;
**git is a required dependency** and every vault is its own versioned repo; the system manages
**one active vault at a time** with full **add/remove/merge/switch** lifecycle; **tags are a
governed taxonomy**; and the architecture stays **model-agnostic** so the whole pipeline can
move from Claude to local Ollama models once they meet a quality bar.

## Resolved decisions [D]

| # | Question | Decision | Key consequence |
|---|---|---|---|
| 1 | Retrieval / embeddings | **No embeddings, ever — absolute.** Solve recall the *smart wiki-native* way (see §"Wiki-native recall"). | Tier-3 local-embedding re-ranker **dropped**. Recall design strengthened, all in the Bun engine. |
| 2 | Tags | **Controlled tag taxonomy** — well-defined, maintained; require quality + freshness evals against the vocabulary. | New governance: a taxonomy file, lint conformance, periodic tag-quality/freshness evals. |
| 3 | Multi-vault | **One active vault at a time** (default one, minimum one) with **add / remove / merge / switch** lifecycle; only ever operate on the active vault. | Firewall's single-active write invariant is **kept** (no relaxation). New work = vault registry + lifecycle commands incl. `merge`. |
| 4 | Durable memory | **Auto-write learnings as `source_type: agent-session`** through the review gate; **git required**, **per-vault repo**, full history. | Git moves from optional → **hard dependency**; undo/checkpoint and memory write-backs ride real git commits. |
| 5 | Session-end hook | **Resolved (factual):** Claude Code exposes `Stop` and `SessionEnd` hooks. | Durable-memory write loop hangs off a real `Stop`/`SessionEnd` hook, not `SubagentStop`. |
| 6 | `entity_type` | **Fixed core enum, vault-owner-calibratable** to steer intent. | Base set is fixed; a vault may declare additions; ingest classifier + lint read the vault's effective set. |
| 7 | Local LLM | **Draft-only now; model-agnostic by design; full Claude→Ollama swap is the north star**, gated on local models proving stable/accurate/quality output. | Add a quality-gated capability progression; don't expand local use until the bar is met. |

## Vision recap (goals → owner)

| # | Goal | Owner |
|---|---|---|
| 1 | Durable memory of an AI harness, used by agents and humans (Obsidian) | context |
| 2 | Data up-to-date, grounded, DRY, metadata-rich | schema |
| 3 | Isolate data in vaults; one active vault with add/remove/merge/switch | schema |
| 4 | Efficient retrieval; advanced search returns only topic-related docs | retrieval |
| 5 | NO embeddings — precompiled wiki pages, smart wiki-native recall | retrieval + skeptic |
| 6 | Collect and organize; core technology is wiki pages | ingest |
| 7 | Convert starter text and image into pages | ingest |
| 8 | Optimize context and memory functions for an AI harness | context |
| 9 | Claude-first; model-agnostic; swap to Ollama when quality proven | portability |
| 10 | Formal ontology — classes, properties, typed predicates | schema |
| 11 | Structured authoring — modular, single-sourced, presentation-independent | schema |

## Current-state baseline (path-cited, condensed)

Four-layer stack (`docs/architecture.md`): Layer 1 — Data (`docs/vault-example/`, schema v2 in
`docs/vault-example/CLAUDE.md`); Layer 2 — Skills (`skills/`); Layer 3 — Agents (`agents/`);
Layer 4 — Orchestration (`hooks/hooks.json`, engine, `scripts/`, `rules/`). Retrieval:
deterministic keyword `search` (`skills/search/SKILL.md`, fixed weights, substring-only —
`src/commands/search/search.ts` drops any page scoring 0) → `query` → `index` (MOC). Multi-vault:
4-tier resolution (`scripts/resolve-vault.sh`), switch-only today; `scripts/firewall.sh` confines
writes to the single resolved vault. Ingestion: text + image; PDF/audio/video deferred. Local
LLM: `skills/draft/SKILL.md` → `_proposed/` → `skills/review/SKILL.md` (the `propose` gate is
implemented in `src/commands/propose/propose.ts`). **Engine note [rev3]:** `scripts/engine.sh`
bridges to the Bun TS engine; `src/cli/cli.ts` implements `verify, fix, heal, doctor, config,
migrate, search, firewall, backlog, propose` and supports schema v1+v2 (`src/core/schema.ts`);
`index`/`link-suggest`/`checkpoint` are PLANNED. **Caveat:** `engine.sh` prefers a prebuilt
`dist/cli.js` that is **stale** (lacks `search`, rejects v2) — rebuild it. Git: currently
optional; **decision #4 makes it required.** Context/memory budgeting: not yet a feature.

## Guiding constraints (non-negotiables)

- **No embeddings, ever [D1].** Retrieval and recall are precompiled wiki pages + wikilinks +
  frontmatter + curated synonyms + deterministic algorithms. No vector store, no similarity over
  latent vectors, no local-embedding re-ranker. The default path stays deterministic and
  auditable.
- **Git is required [D4].** Every vault is its own git repo; structural writes are committed;
  undo, checkpoints, and durable-memory history all ride git.
- **One active vault [D3].** Exactly one vault is active at a time; writes go only to it.
- **Tags are a governed taxonomy [D2].** Tags conform to a maintained controlled vocabulary,
  evaluated for quality and freshness.
- Provenance is structural — every claim traces to `raw/` via `sources`.
- DRY / single-sourcing; ontology in frontmatter + wikilinks (no triplestore); structured
  authoring; KISS / YAGNI; glossary-first.
- **Simplicity principles** (rev4): one advertised path per question; strong defaults over
  decisions; progressive disclosure; errors that teach; no second source of truth.

## Wiki-native recall — the embedding-free answer to synonymy [D1]

The demonstrated failure is the zero-overlap miss (`src/commands/search/search.ts` drops a page
scoring 0 — "car" never finds "automobile"). The fix is to make the *wiki's own structure* the
recall substrate, deterministically, in the Bun engine — no vectors:

1. **Candidate filters** — `--type` / `--folder` (precision; `--tag` once the taxonomy exists).
2. **Aliases as curated synonyms** — `aliases` already resolve wikilinks; extend ingest/curator
   discipline to record conceptual synonyms there, and expand queries over `aliases` at search
   time. Deterministic, auditable.
3. **Synonym / controlled-vocabulary lexicon** — a checked-in `vault/_vocabulary.md` mapping
   concept → variants (and the tag taxonomy from D2), applied as query expansion *before*
   scoring; synonym-matched hits score at a lower fixed weight (transparent ranking preserved).
4. **Deterministic stemming** — a fixed algorithm (Porter-style) so "running"/"ran" collapse.
5. **Graph + predicate query expansion** — expand a hit along typed wikilinks
   (`sources`/`related`/`depends_on`, the ontology predicates) to surface structurally-adjacent
   pages a keyword miss would drop. This is the "GraphRAG" idea **as a deterministic link walk**,
   never vectors.

Same query + same vault + same lexicon → same result, forever. This is the entire recall story;
there is no embedding fallback.

## Phases

### Phase 0 — Foundations

| Item | Effort | Touches | Confidence |
|---|---|---|---|
| Glossary rows for all new terms (see *Glossary debt*); fix stale counts in `docs/architecture.md` | S | `docs/GLOSSARY.md`, `docs/architecture.md` | high |
| **S1 — name `ontology-profile-v1`; predicate domain→range table** (single edge/enum source) | M | `docs/vault-example/CLAUDE.md` | high |
| **Git required + per-vault repo [D4]**: `init` git-inits the vault; structural writes commit; doctor checks git present | M | `skills/init/SKILL.md`, `scripts/doctor.sh`, `docs/vault-example/CLAUDE.md` | high |
| **Rebuild stale `dist/cli.js`** so the shipped path has `search` + schema-v2 | S | `dist/cli.js`, build | high |
| Document the `_proposed/` + `proposed_by` review-gate contract (already implemented) | S | `skills/review/SKILL.md` | high |

### Phase 1 — Wiki-native recall, precision & reliability

| Item | Effort | Touches | Confidence |
|---|---|---|---|
| Candidate filters `--type` / `--folder` | S | `src/commands/search/search.ts`, `src/cli/cli.ts`, `skills/search/SKILL.md` | high |
| **Wiki-native recall [D1]**: synonym lexicon + aliases-as-synonyms + stemming, applied pre-scoring | M | `src/commands/search/search.ts`, `vault/_vocabulary.md`, `skills/search/SKILL.md` | high |
| Score-breakdown `matched{}` (shared score object) | S | `src/commands/search/search.ts` | high |
| Ingest reliability: classification checklist (consumes S1 enums), alias-aware dedup, provenance-completeness checks | S | `skills/ingest/SKILL.md`, `scripts/verify-ingest.sh` | high |
| Staleness derivation (`updated` vs newest cited source date) | S | `skills/lint/SKILL.md`, `scripts/verify-ingest.sh` | high |
| Budget-aware MOC descent (reads the score, never re-ranks); SessionStart MOC pointer | S | `skills/query/SKILL.md`, `scripts/session-start.sh` | high |
| **UX Phase U1–U4** (advertise one verb; first-run-just-works; NEXT-line + git-backed undo clause; errors that teach) | S | orchestrator, `docs/operations.md`, onboarding agent, hook scripts | high |

### Phase 2 — Taxonomy, graph, multi-vault & memory

| Item | Effort | Touches | Confidence |
|---|---|---|---|
| **Tag taxonomy [D2]**: controlled-vocabulary file + lint conformance + tag quality/freshness evals; then `--tag` becomes a precision filter | M | `vault/_vocabulary.md`, `skills/lint/SKILL.md`, `skills/search/SKILL.md` | high |
| **Graph/predicate query expansion** (deterministic N≤2 link walk over `sources`+`related`+`depends_on`); one traversal primitive | M | `src/commands/search/search.ts`, `src/cli/cli.ts` | medium-high |
| S1-check (predicate range) + structural authoring checks (template-skeleton, no-raw-HTML) | M | `skills/lint/SKILL.md`, `scripts/validate-frontmatter.sh`, `_templates/` | high |
| **Multi-vault lifecycle [D3]**: vault registry + `add`/`remove`/`merge`/`switch`; single active; min one; writes to active only | M | `scripts/resolve-vault.sh`, `scripts/set-vault.sh`, settings.json (+ a `merge` command) | medium |
| **Durable memory [D4]**: auto-write learning as `source_type: agent-session` in `raw/` (git-committed) → ingest via `_proposed/`; `Stop`/`SessionEnd` hook trigger; stale-memory flagging | M | `skills/ingest/SKILL.md`, `scripts/protect-raw.sh` (sanctioned carve-out), `hooks/hooks.json` | medium |
| PDF ingest (`source_format: pdf`) | S | `docs/vault-example/CLAUDE.md`, `skills/ingest/SKILL.md` | high |
| **`entity_type` calibration [D6]**: fixed core enum + vault-declared additions | S | `docs/vault-example/CLAUDE.md`, `scripts/validate-frontmatter.sh` | high |
| **Model-agnostic interface [D7]**: factor the LLM call behind one provider seam; keep Claude default | M | `skills/draft/SKILL.md`, `schemas/config.schema.json` (`localModel`, `modelHints`) | medium |
| UX Phase U5 (optional `next?: string[]` on `Report`, JSON-only) + U6 (contributor quick wins) | S | `src/core/report.ts`, `CONTRIBUTING.md`, `tests/run-tests.sh`, gates | high |

### Phase 3 — Quality-gated expansion

| Item | Why gated | Confidence |
|---|---|---|
| **Ollama capability progression [D7]**: a measured stability/accuracy/quality eval; widen local-model scope (ingest-extract, then more) only as the bar is met; ultimate goal = full Claude→Ollama swap | Expand only on proven quality | medium |
| Tag/vocabulary freshness eval automation [D2] | After the taxonomy exists | medium |
| Vault `merge` conflict-resolution UX [D3] | After basic lifecycle ships | medium |
| Audio/video ingest (`transcript_path`); single-sourcing overlap detector; degraded-mode reachability note | Lower leverage | medium |

### Dropped

Local-embedding re-ranker (Tier 3) — **out, permanently [D1]**. Per-vault write fan-out (replaced
by single-active + lifecycle [D3]). `confidenceCeiling`, `modelOverrides`, `last_reviewed` (DRY +
provenance). Uniform engine output envelope; `capabilities`/`route` verbs (second source of
truth — rev4). Free-form tags (replaced by the governed taxonomy [D2]).

## UX & DX — simple to master [rev4]

Mantra: **simple is not easy.** Kept (genuinely concept-removing): U1 one advertised verb +
progressive disclosure; U2 first-run-just-works (default vault + bundled sample); U3 SessionStart
`NEXT:` line + git-backed undo clause; U4 errors that teach + onboarding copy; U5 optional
JSON-only `next` field (out of the parity-gated text renderer); U6 contributor quick wins
(stale-`dist` gate, CONTRIBUTING test loop, `tier3` gates). Cut as surface that duplicates
already-legible sources or breaks live `jq` consumers: the uniform envelope and
`capabilities`/`route` verbs. (Full detail retained in rev4 history.)

## Decisions & rejected alternatives

1. **No embeddings, ever [D1].** Recall comes from the wiki-native design (§"Wiki-native
   recall"). Rejected: the Tier-3 local-embedding re-ranker (dropped) and the constraint reframe
   (unneeded — the deterministic design carries recall).
2. **One active vault + lifecycle [D3].** Rejected: per-vault write confinement and read-only
   multi-vault — the maintainer wants full add/remove/merge/switch but strict single-active
   operation, which keeps the firewall invariant intact.
3. **Git required, per-vault repos [D4].** Rejected: keeping git optional — durable memory,
   undo, and history all depend on it, so it becomes a hard dependency.
4. **Controlled tag taxonomy [D2].** Rejected: free-form tags + best-effort `--tag` — the
   maintainer wants a governed, quality/freshness-evaluated taxonomy.
5. **Fixed-core, calibratable `entity_type` [D6]; model-agnostic, quality-gated Ollama path
   [D7].** Rejected: open `entity_type` free-for-all, and expanding local-model use before a
   quality bar is met.
6. Earlier-revision decisions retained: restored graph link-walk (rev2), durable-memory as
   agent-session source (rev2/rev5), dropped `confidenceCeiling`/`modelOverrides`/`last_reviewed`.

## Glossary debt (add to `docs/GLOSSARY.md` before implementation)

`ontology`, `ontology-profile-v1`, `class`, `property`, `predicate`/`typed relationship`,
`domain`, `range`; `structured authoring`, `single-sourcing`, `modular content`,
`presentation-independence`; `candidate filter`, `score breakdown`; **`synonym lexicon`,
`controlled vocabulary`, `tag taxonomy`, `query expansion`, `stemming`, `graph link-walk`**;
`vault registry`, **`vault lifecycle`, `vault merge`, `active vault`**; `confidence decay`,
`staleness signal`; `working set`, `MOC descent`, `context budget`; `session learning`,
`agent-session source`; `capability tier`, **`capability progression`, `model-agnostic`,
`quality gate`**; `degraded mode`; `provenance-completeness`; `classification checklist`;
UX: `progressive disclosure`, `time-to-first-value`, `time-to-mastery`, `one advertised path`.

## Remaining implementation unknowns (not blocking direction)

- Vault **`merge`** semantics: how to reconcile colliding titles / duplicate sources across two
  vaults (proposed: dedup by `sources` + title, flag conflicts for review).
- The **quality-gate metric** for the Claude→Ollama progression [D7]: what eval and threshold
  declare a local model "good enough" for a given capability tier.
- Tag-taxonomy **bootstrapping**: seed the controlled vocabulary from existing tags, then govern.
