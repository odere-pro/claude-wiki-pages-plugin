# Team Brief — claude-wiki-pages UX & adoption brainstorm

> Shared context for every teammate. Read this in full before you produce anything.
> Do not restate it back; cite it. This is a dev-only brainstorming apparatus — it
> never ships in `agents/`, `skills/`, or `hooks/`.

## Contract

| Aspect | Rule |
|---|---|
| Mission | Brainstorm the **UX & adoption** course of `claude-wiki-pages` — onboarding, authoring, capability across novice → power user → agent — and turn it into a **development-ready plan the engineering team can implement**. |
| Authority | `docs/architecture.md`, `docs/GLOSSARY.md`, `docs/vault-example/CLAUDE.md` (schema wins). |
| Output | **A development-ready implementation plan** for the `wiki-dev` engineering team (`docs/teams.md`), written by the Product Manager (facilitator) at convergence — phased, with items mapped to lanes/owners, acceptance criteria, and a handover checklist. |
| Mode | READ-ONLY / proposal-only. No teammate edits the plugin. |
| Grounding | Every current-state claim cites a repo path. Uncited = labeled `[speculative]`. |
| Halting | A teammate stops its turn after producing its round deliverable and messaging the facilitator. |

## 1. Mission

Design the UX & adoption course for `claude-wiki-pages` so the plugin is approachable on day one,
rewarding for a daily power user, and correct for an agent — without weakening any architectural
non-negotiable. The system is the durable memory of an AI harness — written and read by Claude and
other agents, browsed and edited by humans in Obsidian. This team improves how people *adopt and
use* it: first run, authoring ergonomics, ontology clarity, capability tiers, and configuration —
not the engine internals (that is the engineering team's charter; see `docs/teams.md`).

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

This team reads every goal through a UX & adoption lens: how does a user *notice*, *learn*, and
*benefit* from each, and what is the smallest version that delivers it.

## 3. Current-state baseline (ground truth — path-cited)

Mature v1.0.0. Four-layer stack (`docs/architecture.md`):

- **Layer 1 — Data** (`docs/vault-example/`): schema v2 in `docs/vault-example/CLAUDE.md`,
  9 page types, provenance via `sources` / `source_quotes` / `derived` / `confidence`. Immutable
  `raw/` enforced by hook. Templates in `docs/vault-example/_templates/`.
- **Layer 2 — Skills** (`skills/`): 23 skills including 5 agent-teaching skills
  (`engine-api`, `maintain-contract`, `analyst-modes`, `curator-fixes`, `ingest-pipeline`).
- **Layer 3 — Agents** (`agents/`): 7 `claude-wiki-pages-*-agent` files.
- **Layer 4 — Orchestration** (`hooks/hooks.json`; `scripts/engine.sh` deterministic Bun engine;
  `scripts/`; `rules/`).

UX & adoption facts every teammate must respect:

- **One entry path**: `/claude-wiki-pages:wiki` is the single advertised verb (`CLAUDE.md`); the
  orchestrator probes vault state and dispatches. `/claude-wiki-pages:onboarding` (run-once wizard)
  and `/claude-wiki-pages:doctor` (health check) are progressive-disclosure secondaries.
- **Onboarding**: `skills/onboarding/SKILL.md` + `skills/init/SKILL.md` scaffold a vault by copying
  `docs/vault-example/` into the user's project; `docs/getting-started.md` + `docs/install.md` are
  the first docs a newcomer follows.
- **Authoring**: `skills/draft/SKILL.md` writes to `_proposed/`; `skills/review/SKILL.md` gates
  promotion. Pages are authored to `docs/vault-example/_templates/`;
  `scripts/validate-frontmatter.sh` enforces per-class requirements.
- **Retrieval**: deterministic keyword `search` (`skills/search/SKILL.md`, fixed weights) returns a
  candidate set; `skills/query/SKILL.md` synthesizes a cited answer; `skills/index/SKILL.md` builds
  the MOC. **No embeddings.**
- **Multi-vault**: 4-tier resolution in `scripts/resolve-vault.sh`; switch with
  `scripts/set-vault.sh`. **Switching only** today — no simultaneous management. Writes confined by
  `scripts/firewall.sh`.
- **Config**: plugin config in `.claude/claude-wiki-pages/settings.json`; hooks in
  `hooks/hooks.json`; packaging in `.claude-plugin/`. Maintenance automation is opt-in
  (`docs/automation.md`).
- **Proto-ontology already present**: the 9 page types are classes; frontmatter fields are
  properties; `parent` / `related` / `sources` / `contradicts` / `supersedes` / `depends_on` are
  typed predicates.

## 4. Authority docs to respect

- `docs/architecture.md` — the four-layer contract. Each layer must earn its place.
- `docs/GLOSSARY.md` + `scripts/validate-docs.sh` — canonical terms, enforced in CI.
- `docs/vault-example/CLAUDE.md` — the schema; wins any frontmatter conflict.
- `docs/vault-example/_templates/` — the structured-authoring templates.
- `CLAUDE.md` — the one entry verb and the dev-time vs runtime separation.
- `docs/adr/` (decisions) vs `docs/plan/` (proposals) — the roadmap is a proposal.

## 5. Non-negotiables (hard list)

A nicer UX never buys an exception to any of these.

- **NO RAG / NO embeddings.** Retrieval is precompiled wiki pages + wikilinks + frontmatter.
- **Provenance is structural.** Every claim traces to `raw/` via `sources`. Never weaken
  `sources` / `source_quotes` / `derived` / `confidence`.
- **DRY / single-sourcing.** A fact lives in exactly one page; everything else links to it.
- **Ontology lives in schema + frontmatter + wikilinks** — never a triplestore, RDF graph
  database, or vector store.
- **Structured authoring.** Every page is an instance of an ontology class, authored to its
  template, single-sourced, and presentation-independent.
- **Advertise one path; strong defaults; progressive disclosure.** `/claude-wiki-pages:wiki` stays
  the single entry; power features are opt-in and invisible to a novice's first run.
- **Glossary-first.** Any new concept gets a `docs/GLOSSARY.md` row + rationale before it enters
  roadmap prose. Park coinages in the glossary-debt list until then.
- **KISS / YAGNI.** Prefer extending an existing skill / agent / hook / template over a new surface.
- **Dev-time vs runtime separation.** Never load dev-only context into a user session.
- **Do not pollute `agents/`.** Brainstorm roles are dev-only.

## 6. Citation rule

Every claim about how the plugin works today cites a repo path (e.g. `skills/onboarding/SKILL.md`).
A claim with no path is labeled `[speculative]` and cannot enter a roadmap phase until grounded.

## 7. Output contract — a development-ready plan for the engineering team

The Product Manager (facilitator) writes **one implementation plan that hands off to the `wiki-dev`
engineering team** (`docs/teams.md`). It is the artifact `wiki-dev-manager` picks up to start work,
so every phase item must be **assignable**: mapped to a lane (A retrieval · B schema · C ingest ·
D ux), sized, with acceptance criteria QA can check. Write it in the voice of the existing roadmaps
in `docs/plan/`:

```
# claude-wiki-pages: UX & adoption — development plan (brainstorm output)
## Context              — why this exercise; the roster
## Vision recap         — the goals (§2), each tagged with its owner role
## Current-state baseline — the four layers + UX surfaces, path-cited, condensed
## Guiding constraints  — the non-negotiables (§5)
## Decisions log        — resolved decisions + rejected alternatives (incl. every Skeptic veto)
## Phases               — each item assignable to a wiki-dev lane
  ### Phase 1 — <theme>   (lowest-risk, highest-leverage cut)
     | Item | Owner lane | Goal served | Effort | Touches (paths) | Acceptance |
  ### Phase 2 / 3 / M — <themes>
  ### Deferred / Out-of-scope   (the Skeptic's cut list, with reasons)
## Glossary debt        — new terms to add to docs/GLOSSARY.md before implementation
## Open questions       — what the user must resolve before the gated items start
## Handover checklist   — the steps wiki-dev-manager runs to pick this up
```

The plan is a **proposal** (`docs/adr/` is for decisions). Hand it over via `docs/teams.md`: the
brainstorm team writes it, the engineering team consumes it.

## 8. Roster

No separate Lead: the **Product Manager carries the facilitator/synthesizer hat**, with the
**Architect co-owning architectural coherence** at convergence.

| Role (slug) | Owns | Model | Effort |
|---|---|---|---|
| `product-manager` | Goal fit, acceptance, **facilitation** + roadmap write | opus | ultrathink |
| `architect` | Four-layer coherence, single-home reuse, ADR candidates, co-convergence | opus | ultrathink |
| `structure-authoring-architect` | Authoring ergonomics, templates, single-sourcing | opus | ultrathink |
| `ontology-engineer` | Classes, properties, typed predicates, enum single-source | opus | ultrathink |
| `senior-engineer` | Feasibility, effort sizing, reuse-before-build | sonnet | think hard |
| `plugin-expert` | Correct plugin usage; the verbs, hooks, entry path | sonnet | think hard |
| `plugin-power-user` | Advanced workflows, multi-vault, automation, scale friction | sonnet | think hard |
| `new-claude-user` | First-run friction, jargon, "one obvious next step" | sonnet | standard |
| `claude-code-config-expert` | Settings, hooks, packaging, first-run defaults | opus | ultrathink |
| `grill-me-interrogator` | Falsifiable requirements via the external grill-me skill | sonnet | think hard |
| `skeptic` | Guardian: NO-RAG, KISS, DRY, glossary | opus | ultrathink |

## 9. Protocol (three rounds)

- **Round 1 — Divergence (isolated).** Produce your deliverables without reading peers.
  Per-idea template:
  `### IDEA-<role>-<n>` → Problem → Proposal → Cited evidence (paths) → Why-not-RAG note →
  Effort (S/M/L) → Suggested phase → Dependencies.
- **Round 2 — Cross-critique.** Read your assigned peers and file objections
  `OBJ-<from>-<to>-<n>` with a path-cited reason. The **Skeptic critiques all roles**; the
  **Grill-Me Interrogator grills every role's headline proposal** (a missing user, trigger, or
  acceptance check is a valid objection). Attack discipline, feasibility, and goal-fit — not taste.
  Suggested pairings: new-user ↔ plugin-expert, ontology ↔ structure-authoring, senior-engineer ↔
  architect, power-user ↔ config-expert.
- **Round 3 — Convergence (Product Manager + Architect).** The Product Manager merges surviving
  ideas into the roadmap with the Architect's coherence sign-off. Conflict order:
  1. A non-negotiable (§5) always wins.
  2. A Skeptic veto stands unless the facilitator explicitly overrides it and logs the rejected
     alternative.
  3. Remaining ties: the facilitator decides and records both the decision and the discarded option.

## 10. Glossary-debt candidates (flag, do not silently adopt)

`ontology`, `class`, `property`, `predicate` / `typed relationship`, `structured authoring`,
`single-sourcing`, `modular content`, plus UX coinages this team may introduce —
`capability tier`, `first-run`, `progressive disclosure`, `authoring affordance`. Each needs a
`docs/GLOSSARY.md` row + rationale before it appears in roadmap prose.
