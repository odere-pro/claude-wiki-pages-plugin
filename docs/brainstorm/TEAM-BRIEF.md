# Team Brief — claude-wiki-pages development brainstorm

> Shared context for every teammate. Read this in full before you produce anything.
> Do not restate it back; cite it. This is a dev-only brainstorming apparatus — it
> never ships in `agents/`, `skills/`, or `hooks/`.

## Contract

| Aspect | Rule |
|---|---|
| Mission | Brainstorm the improvements and development course of `claude-wiki-pages`. |
| Authority | `docs/architecture.md`, `docs/GLOSSARY.md`, `docs/vault-example/CLAUDE.md` (schema wins). |
| Output | One phased roadmap in `docs/plan/`, written by the Lead at convergence. |
| Mode | READ-ONLY / proposal-only. No teammate edits the plugin. |
| Grounding | Every current-state claim cites a repo path. Uncited = labeled `[speculative]`. |
| Halting | A teammate stops its turn after producing its round deliverable and messaging the Lead. |

## 1. Mission

Design the development course for `claude-wiki-pages` as a vault system that is the durable
memory of an AI harness — written and read by Claude and by other agents, and browsed and
edited by humans in Obsidian. The system collects and organizes information into precompiled
wiki pages, keeps them grounded and current, and serves precise topic-scoped retrieval without
embeddings.

## 2. Product vision (verbatim goals — do not re-interpret)

The system should:

1. Act as the durable memory of an AI harness, usable **by agents and by humans (in Obsidian)**.
2. Keep data **up-to-date, grounded, DRY, and rich in metadata**.
3. **Isolate data in separate vaults**, and support managing **multiple vaults in one project**.
4. Provide **efficient retrieval and search**; advanced search returns **only documents related
   to the topic**.
5. Use **NO RAG / no embeddings** — precompiled wiki pages, the way Obsidian works.
6. Be the tool used to **collect and organize** information; the core technology is wiki pages.
7. Convert **starter text and image** information into wiki pages.
8. **Optimize context and memory functions for an AI harness.**
9. Be Claude-first but **runnable on local LLMs via Ollama**.
10. **Carry a formal ontology** — named classes (page types), properties (frontmatter fields),
    and typed relationships/predicates between entities.
11. **Operate on structured-authoring principles** — modular typed content, single-sourcing,
    template conformance, and separation of content from presentation.

## 3. Current-state baseline (ground truth — path-cited)

Mature v1.0.0. Four-layer stack (`docs/architecture.md`):

- **Layer 1 — Data** (`docs/vault-example/`): schema v2 in `docs/vault-example/CLAUDE.md`,
  9 page types, provenance via `sources` / `source_quotes` / `derived` / `confidence`. Immutable
  `raw/` enforced by hook.
- **Layer 2 — Skills** (`skills/`): 23 skills including 5 agent-teaching skills
  (`engine-api`, `maintain-contract`, `analyst-modes`, `curator-fixes`, `ingest-pipeline`).
- **Layer 3 — Agents** (`agents/`): 7 `claude-wiki-pages-*-agent` files, all `model: sonnet`,
  Opus override documented in prose under `## Model selection`.
- **Layer 4 — Orchestration** (`hooks/hooks.json` 10 hooks; `scripts/engine.sh` deterministic
  Bun engine; `scripts/`; `rules/`).

Subsystem facts every teammate must respect:

- **Retrieval**: deterministic keyword `search` in `skills/search/SKILL.md` (fixed weights —
  title/alias +10, per-term title +5, tag +3, body +1 capped at 5) returns a candidate set;
  `skills/query/SKILL.md` synthesizes a cited answer; `skills/index/SKILL.md` builds the MOC.
  **No embeddings.** GraphRAG (`search --graph`, wikilink N-hop traversal) is documented-future
  in `docs/GLOSSARY.md`, **not** implemented.
- **Multi-vault**: 4-tier resolution in `scripts/resolve-vault.sh` (env `CLAUDE_WIKI_PAGES_VAULT`
  → `.claude/claude-wiki-pages/settings.json` `current_vault_path` → auto-detect 4 levels →
  default `docs/vault`). **Switching only** — no simultaneous multi-vault management today.
  Writes confined by `scripts/firewall.sh`.
- **Ingestion**: text + image supported (`source_format: text|image`, `attachment_path`, Claude
  vision) in `skills/ingest/SKILL.md`; PDF / audio / video deferred.
- **Local LLM**: `skills/draft/SKILL.md` writes to `_proposed/` via Ollama/LM Studio (opt-in);
  `skills/review/SKILL.md` gates promotion. Config under `localModel` in `schemas/config.schema.json`.
- **Context/memory budgeting for the AI harness**: **not yet a feature.**
- **Proto-ontology already present**: the 9 page types are classes; frontmatter fields are
  properties; `parent` / `related` / `sources` / `contradicts` / `supersedes` / `depends_on`
  are typed predicates; `docs/vault-example/_templates/` are proto structured-authoring templates.
  `scripts/validate-frontmatter.sh` enforces what each class requires.

## 4. Authority docs to respect

- `docs/architecture.md` — the four-layer contract. Each layer must earn its place.
- `docs/GLOSSARY.md` + `scripts/validate-docs.sh` — canonical terms, enforced in CI.
- `docs/vault-example/CLAUDE.md` — the schema; wins any frontmatter conflict.
- `docs/vault-example/_templates/` — the structured-authoring templates.
- `docs/adr/` (decisions) vs `docs/plan/` (proposals) — the roadmap is a proposal.

## 5. Non-negotiables (hard list)

- **NO RAG / NO embeddings.** Retrieval is precompiled wiki pages + wikilinks + frontmatter.
  If a proposal reaches for similarity over latent vectors, it is out.
- **Provenance is structural.** Every claim traces to `raw/` via `sources`. Never weaken
  `sources` / `source_quotes` / `derived` / `confidence`.
- **DRY / single-sourcing.** A fact lives in exactly one page; everything else links to it.
- **Ontology lives in schema + frontmatter + wikilinks** — never a triplestore, RDF graph
  database, or vector store.
- **Structured authoring.** Every page is an instance of an ontology class, authored to its
  template, single-sourced, and presentation-independent (the Obsidian render is a view, not
  the source of truth).
- **Glossary-first.** Any new concept gets a `docs/GLOSSARY.md` row + rationale before it
  enters roadmap prose. Park coinages in the glossary-debt list until then.
- **KISS / YAGNI.** Prefer extending an existing skill / agent / hook / typed-relationship
  over adding a new layer or surface.
- **Do not pollute `agents/`.** Brainstorm roles are dev-only.
- Use canonical vocabulary only. Avoid the SEO-register and retired terms that
  `scripts/validate-docs.sh` bans outside README/SPEC.

## 6. Citation rule

Every claim about how the plugin works today cites a repo path (e.g. `skills/search/SKILL.md`).
A claim with no path is labeled `[speculative]` and cannot enter a roadmap phase until grounded.

## 7. Output contract

The Lead writes one roadmap to `docs/plan/` in the voice of
`docs/plan/0001-four-layer-dx-retrofit.md`:

```
# claude-wiki-pages: development roadmap (brainstorm output)
## Context              — why this exercise; the roster
## Vision recap         — the goals (§2), each tagged with its owner role
## Current-state baseline — the four layers, path-cited, condensed
## Guiding constraints  — the non-negotiables (§5)
## Phases
  ### Phase 1 — <theme>   (lowest-risk, highest-leverage cut)
     | Item | Owner | Goal served | Effort | Touches (paths) | Why now |
  ### Phase 2 — <theme>
  ### Phase 3 — <theme>
  ### Deferred / Out-of-scope   (the Skeptic's cut list, with reasons)
## Decisions & rejected alternatives   (ADR-style log from convergence)
## Glossary debt        — new terms to add to docs/GLOSSARY.md before implementation
## Open questions       — for the user to resolve before planning
```

## 8. Roster

| Role (slug) | Owns | Model | Effort |
|---|---|---|---|
| `wiki-brainstorm-lead` | Sequencing, coherence, synthesis | opus | ultrathink |
| `wiki-retrieval-engineer` | Topic-scoped search, NO-RAG, GraphRAG go/no-go | opus | ultrathink |
| `wiki-schema-architect` | Schema, ontology, structured authoring, multi-vault | opus | ultrathink |
| `wiki-ingest-engineer` | Collect/organize; text+image → pages | sonnet | think hard |
| `wiki-context-engineer` | Context/memory optimization for the AI harness | opus | ultrathink |
| `wiki-portability-engineer` | Claude-first, Ollama-capable | sonnet | standard |
| `wiki-skeptic` | Guardian: NO-RAG, KISS, DRY, glossary | opus | ultrathink |

## 9. Protocol (three rounds)

- **Round 1 — Divergence (isolated).** Produce your deliverables without reading peers.
  Per-idea template:
  `### IDEA-<role>-<n>` → Problem → Proposal → Cited evidence (paths) → Why-not-RAG note →
  Effort (S/M/L) → Suggested phase → Dependencies.
- **Round 2 — Cross-critique.** Read your assigned peers and file objections
  `OBJ-<from>-<to>-<n>` with a path-cited reason. The Skeptic critiques all roles. Attack
  discipline, feasibility, and goal-fit — not taste.
- **Round 3 — Convergence (Lead).** Merge surviving ideas into the roadmap. Conflict order:
  1. A non-negotiable (§5) always wins.
  2. A Skeptic veto stands unless the Lead explicitly overrides it and logs the rejected
     alternative.
  3. Remaining ties: the Lead decides and records both the decision and the discarded option.

## 10. Glossary-debt candidates (flag, do not silently adopt)

`ontology`, `class`, `property`, `predicate` / `typed relationship`, `structured authoring`,
`single-sourcing`, `modular content`. Each needs a `docs/GLOSSARY.md` row + rationale before
it appears in roadmap prose.
