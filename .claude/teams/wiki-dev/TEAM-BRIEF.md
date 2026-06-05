# Team Brief — claude-wiki-pages development team

> Shared context for every teammate. Read this in full before you produce anything.
> Cite it; do not restate it. This is a dev-only delivery apparatus — it lives in
> `.claude/` and never ships in `agents/`, `skills/`, or `hooks/`.

## Contract

| Aspect        | Rule                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| Mission       | Implement the ratified design decisions as additive extensions of the four-layer stack.               |
| Plan of record | The accepted ADRs in `docs/adr/`, decomposed into assignable work in `BACKLOG.md`.                    |
| Authority     | `docs/architecture.md`, `docs/GLOSSARY.md`, `docs/vault-example/CLAUDE.md` (schema wins).             |
| Output        | Shipped code + tests + docs, merged green, one roadmap item at a time.                                |
| Mode          | Read-only until the Delivery Lead assigns you an item; then edit only your lane's paths.               |
| Grounding     | Every current-state claim cites a repo path. Uncited assumptions are labeled `[assumption]`.           |
| Definition of Done | TDD first, gates green, glossary-first, docs updated, ADR for any decision. See §10.              |
| Halting       | A teammate stops its turn after delivering its item (or its review) and messaging the Delivery Lead.   |

## 1. Mission

Grow `claude-wiki-pages` into the durable memory of an AI harness — written and read by Claude
and by other agents, and browsed and edited by humans in Obsidian — that collects and organizes
information into precompiled wiki pages, keeps them grounded and current, and serves precise
topic-scoped retrieval **without embeddings**. The roadmap sequences this as additive extensions
of the existing four-layer stack. No item introduces a vector store of record or a new top-level
layer; every item extends an existing skill, agent, hook, schema field, or the deterministic
engine.

## 2. The eleven product goals (verbatim — do not re-interpret)

1. Durable memory of an AI harness, usable by agents and by humans (in Obsidian).
2. Data up-to-date, grounded, DRY, and rich in metadata.
3. Isolate data in separate vaults; support managing multiple vaults in one project.
4. Efficient retrieval and search; advanced search returns only documents related to the topic.
5. NO RAG / no embeddings — precompiled wiki pages, the way Obsidian works.
6. Be the tool used to collect and organize information; the core technology is wiki pages.
7. Convert starter text and image information into wiki pages.
8. Optimize context and memory functions for an AI harness.
9. Claude-first, runnable on local LLMs via Ollama.
10. Carry a formal ontology — named classes, properties, typed relationships/predicates.
11. Operate on structured-authoring principles — modular typed content, single-sourcing,
    template conformance, presentation independence.

## 3. Tech stack and commands (ground truth — path-cited)

- **Engine — Bun + TypeScript (ESM), `bun >= 1.2`** (`package.json`). Source in `src/cli/cli.ts`,
  `src/commands/*`, `src/core/*`. Implemented verbs: `verify, fix, heal, doctor, config, migrate,
  search, firewall, backlog, propose` (`src/cli/cli.ts`); supports `schema_version` 1 and 2
  (`src/core/schema.ts`). `index`, `link-suggest`, `checkpoint` return not-implemented.
- **Bridge** — `scripts/engine.sh` `exec`s the Bun engine; it prefers a prebuilt `dist/cli.js`
  when present (`scripts/engine.sh:20`). The checked-in `dist/cli.js` is **stale** (lacks `search`,
  rejects `schema_version: 2`). `dist/` is gitignored and rebuilt by `bun run build`.
- **Hooks and scripts — Bash** (`hooks/hooks.json`, `scripts/*.sh`). Vault resolution in
  `scripts/resolve-vault.sh`; write confinement in `scripts/firewall.sh` (+ its `src/core/firewall.ts`
  twin, kept in parity by gate-11).
- **Skills and agents — Markdown** (`skills/*/SKILL.md`, `agents/*.md`).
- **Build / quality:** `bun run build`, `bun test`, `bun run typecheck` (`tsc --noEmit`),
  `bun run lint` (eslint), `bun run format` (prettier).
- **Test tiers** (`tests/run-tests.sh`, `tests/README.md`): Tier 0 static gates
  (`tests/gates/`: shellcheck, shfmt, markdownlint, lychee, gitleaks, manifest parse,
  `scripts/validate-docs.sh`, typecheck, verify-parity, firewall-parity, eslint, config-schema,
  npm-pack); Tier 1 Bats (`tests/scripts/*.bats`); Tier 2 smoke (`tests/smoke/`); Tier 3/4
  adversarial (`.github/workflows/adversarial.yml`, corpus replay stubbed). Run locally with
  `bash tests/run-tests.sh [tier0|tier1|tier2|all]`.
- **Lint scope you must keep green:** markdownlint globs `**/*.md` (so `.claude/agents/` and
  `.claude/teams/` are linted; `MD013` line-length is off). `scripts/validate-docs.sh` scans all
  tracked `*.md|*.json|*.sh|*.yml` for banned/SEO terms, layer-capitalization, the glossary, and
  `/claude-wiki-pages:` namespace resolution.

## 4. Authority docs (respect; do not contradict)

- `docs/architecture.md` — the four-layer contract (Layer 1 Data, Layer 2 Skills, Layer 3 Agents,
  Layer 4 Orchestration). Every change must keep the four layers honest.
- `docs/GLOSSARY.md` + `scripts/validate-docs.sh` — canonical terms, enforced in CI Tier 0.
- `docs/vault-example/CLAUDE.md` — the schema (`schema_version`); wins any frontmatter conflict.
- `docs/vault-example/_templates/` — the structured-authoring templates.
- `docs/operations.md` — hook and script contracts; `SECURITY.md` — the threat model.
- `docs/adr/` records the ratified decisions; brainstorm proposals are transient (scratch). A
  decision is binding only once it lands as an accepted ADR, and each shipped item references one.

## 5. Non-negotiables (hard list — violating any one blocks merge)

- **NO embeddings, ever (absolute) — resolved.** Retrieval and recall are 100% deterministic and
  wiki-native: candidate filters (`--type`/`--folder`), curated **aliases-as-synonyms**, a
  checked-in **synonym / controlled-vocabulary lexicon**, deterministic **stemming**, and a
  **graph/predicate link-walk** over typed wikilinks. There is **no vector store and no
  local-embedding re-ranker** — Tier 3 is dropped permanently. If a change reaches for similarity
  over latent vectors anywhere, it is out.
- **Git is required (resolved).** Every vault is its own git repo with full history; `init`
  git-inits it; structural writes commit; undo, checkpoints, and durable-memory write-backs ride
  git. `doctor` checks git is present.
- **One active vault (resolved).** Exactly one vault is active at a time; writes go only to it.
  The registry adds `add`/`remove`/`merge`/`switch`, never cross-vault writes.
- **Tags are a governed taxonomy (resolved).** Tags conform to a maintained controlled vocabulary,
  evaluated for quality and freshness.
- **Provenance is structural.** Every claim traces to `raw/` via `sources`. Never weaken
  `sources` / `source_quotes` / `derived` / `confidence`.
- **DRY / single-sourcing.** A fact lives in exactly one page; one mechanism per job. No second
  source of truth.
- **Ontology lives in schema + frontmatter + wikilinks** — never a triplestore, RDF database, or
  vector store.
- **Structured authoring.** Every page is an instance of an ontology class, authored to its
  template, single-sourced, presentation-independent (the Obsidian render is a view).
- **Raw is immutable.** `raw/` is append-only and hook-protected (`scripts/protect-raw.sh`,
  `rules/raw-immutable.md`). The durable-memory item (C2/C4-write) needs a **sanctioned carve-out**
  designed with the Architect, not an ad-hoc bypass.
- **Glossary-first.** A new term gets a `docs/GLOSSARY.md` row + rationale before it enters prose
  or code. Park coinages in the roadmap's glossary-debt list until then.
- **KISS / YAGNI.** Extend an existing skill / agent / hook / field before adding a surface.
- **Use canonical vocabulary only.** Avoid the SEO-register and retired terms banned by
  `scripts/validate-docs.sh`. Capitalize "Layer 1".."Layer 4" and "Data / Skills / Agents /
  Orchestration" when naming the architecture.
- **Do not pollute the shipped tree with dev apparatus.** This team lives in `.claude/`.

## 6. Shared-infra invariants (the Architect's "one-X" contract)

The roadmap deliberately routes several features through single shared mechanisms. Lanes must
build **to these shared pieces**, never fork a parallel one. The Architect owns the contracts; any
lane that needs to change one raises it to the Architect first.

- **One ontology profile** — `ontology-profile-v1` (S1) in `docs/vault-example/CLAUDE.md`: the
  single predicate domain→range table and the single enum list. Feeds R2 graph traversal, C1 MOC
  descent, and I1 classification. (Phase 0; blocks the items that consume it.)
- **One graph-traversal primitive** in the engine (edge set = S1's predicate table; returns scored
  page references, never bodies). Serves R2 `--graph` (N≤2 over `sources`+`related`+`depends_on`),
  and is available to R3/C1.
- **One score object** (`score` + `matched{}`): `search` emits it; C1 reads it for cut-offs; R2
  attaches per-edge contributions. C1 must not become a second ranker.
- **One `_proposed/` write channel** (`proposed_by` + the review gate already implemented in
  `src/commands/propose/propose.ts`): used by C4 session-memory, the local-ingest stub (Pc), and
  local drafts (P3).
- **One enum list, single-sourced in the ontology profile**, consumed by I1's classifier and R1's
  `--type`. Provenance-completeness checks (I3) **extend** existing lint/hooks, not a parallel
  verifier.

## 7. Roster and parallel lanes

Nine teammates. Three engineers were requested; a fourth was added so the four independent roadmap
lanes run in parallel (the request permits adjusting headcount for parallelism). Role prompts:
`.claude/agents/wiki-dev-*.md`.

| Role (slug)               | Title                                | Model  | Owns / lane                                                                   |
| ------------------------- | ------------------------------------ | ------ | ---------------------------------------------------------------------------- |
| `wiki-dev-pm`             | Product Manager                      | opus   | Goals, acceptance criteria, scope, the seven open questions (user sign-off). |
| `wiki-dev-architect`      | Architect / Tech Lead                | opus   | Four-layer coherence, the §6 one-X contracts, ADRs, schema discipline.       |
| `wiki-dev-manager`        | Delivery Lead / Engineering Manager  | opus   | Sequencing, task assignment, integration, gate sign-off, conflict resolution.|
| `wiki-dev-eng-retrieval`  | Senior Fullstack Bun/TS Engineer     | sonnet | **Lane A — Retrieval & Engine** (TS).                                        |
| `wiki-dev-eng-schema`     | Senior Fullstack Bun/TS Engineer     | sonnet | **Lane B — Schema, Ontology & Multi-vault** (TS + Bash).                     |
| `wiki-dev-eng-ingest`     | Senior Fullstack Bun/TS Engineer     | sonnet | **Lane C — Ingest, Context & Memory** (Skills + Bash + hooks).              |
| `wiki-dev-eng-ux`         | Senior Fullstack Bun/TS Engineer     | sonnet | **Lane D — Portability, UX/DX & Docs** (Skills + docs + gates).             |
| `wiki-dev-qa-functional`  | QA — Functional & Test               | sonnet | Tier 0–1 gates, `bun test` unit/integration, TDD enforcement, coverage.     |
| `wiki-dev-qa-adversarial` | QA — Adversarial & Security          | opus   | Tier 2 smoke, Tier 3/4 adversarial, NO-RAG/provenance audit, dogfood loop.  |

### Lane → roadmap-item map

- **Lane A (eng-retrieval)** — `src/commands/search/*`, `src/cli/cli.ts`, `src/core/report.ts`,
  `skills/search/SKILL.md`, `skills/query/SKILL.md`, `dist/` rebuild. Items: rebuild `dist/cli.js`;
  R1 candidate filters; Tier-2 deterministic recall; R4 score breakdown; R3 agent-vs-human
  contract; graph-traversal primitive + R2 `--graph`; U5 optional `next?` on `Report` (JSON-only).
- **Lane B (eng-schema)** — `docs/vault-example/CLAUDE.md`, `schemas/*`, `scripts/resolve-vault.sh`,
  `scripts/firewall.sh` + `src/core/firewall.ts`, `scripts/set-vault.sh`,
  `scripts/validate-frontmatter.sh`. Items: S1 `ontology-profile-v1`; S4-derivation staleness;
  S1-check; S2-structural; S3 multi-vault registry + lifecycle (`add`/`remove`/`merge`/`switch`,
  single active); tag taxonomy + quality/freshness evals; `entity_type` fixed-core + calibration;
  I4 PDF enum; model-agnostic provider seam (Claude default).
- **Lane C (eng-ingest)** — `skills/ingest/SKILL.md`, `skills/ingest-pipeline/SKILL.md`,
  `skills/draft/SKILL.md`, `skills/review/SKILL.md`, `scripts/verify-ingest.sh`,
  `scripts/protect-raw.sh`, `scripts/session-start.sh`, `hooks/hooks.json`. Items: I1 classification
  checklist; I2 alias-aware dedup; I3 provenance-completeness; C1 budget-aware MOC descent;
  C4-read MOC pointer; C2/C4-write durable memory (`source_type: agent-session` carve-out); C3
  stale-memory flagging; I5 audio/video (deferred).
- **Lane D (eng-ux)** — `agents/claude-wiki-pages-*-agent.md`, `skills/draft/SKILL.md`,
  `skills/review/SKILL.md`, `scripts/session-start.sh`, `scripts/heartbeat.sh`,
  `scripts/validate-frontmatter.sh`, `scripts/check-wikilinks.sh`, `docs/GLOSSARY.md`,
  `docs/architecture.md`, `docs/operations.md`, `README.md`, `CONTRIBUTING.md`, `tests/gates/`.
  Items: glossary rows + stale-count fixes; document the `_proposed/` gate; P1/P2/Pb capability
  tiers + degradation; U1–U4 onboarding/everyday/errors-that-teach; U6 contributor quick wins;
  Pc local-ingest stub and Pa (deferred) with Lane C.

> **Shared-file coordination:** Lanes C and D both touch `scripts/session-start.sh` and
> `skills/draft|review`. The Delivery Lead serializes edits to shared files and the Architect
> arbitrates the interface so neither lane forks a second mechanism (§6).

## 8. Phase sequencing and dependencies

Build in roadmap order. **Phase 0 is upstream of everything** and unblocks the rest.

1. **Phase 0 — Foundations.** Glossary rows; fix stale counts in `docs/architecture.md`; **S1
   `ontology-profile-v1`** (blocks R2/C1/I1); **git-required per-vault init** (blocks durable
   memory + the undo story); **rebuild the stale `dist/cli.js`** (blocks any shipped-path
   search/schema-v2 behavior); document the `_proposed/` + `proposed_by` gate.
2. **Phase 1 + Phase U (interleave).** Precision/recall/reliability (R1, Tier-2, R4, R3, I1–I3,
   S4-derivation, C1, C4-read, P1/P2/Pb) alongside the UX/DX wins (U1–U6). Mostly small, high
   leverage.
3. **Phase 2 — Structure, graph & memory.** Graph primitive + R2; S1-check; S2-structural; S3
   multi-vault; C2/C4-write durable memory; I4 PDF; Pc; P3-revised.
4. **Phase 3 — Expansion (quality-gated).** Ollama capability progression (define the eval +
   threshold; widen local-model scope only as the bar is met; ultimate goal = full Claude→Ollama
   swap), vault `merge` conflict-resolution UX, tag/vocabulary freshness-eval automation,
   S2-overlap, I5 audio/video, Pa. Do not start without the PM's go. (Tier-3 re-ranker is **not**
   here — it is dropped permanently.)

**Hard dependencies:** S1 → {R2 graph, C1 descent, I1 classifier, R1 `--type` enum}; the score
object (R4) → C1 cut-offs and R2 per-edge contributions; the `_proposed/` gate doc → C2/C4-write
and Pc; `dist/cli.js` rebuild → Tier-2 and the verify-parity gate on the shipped path.

## 9. Working agreement (collaboration protocol)

- **Design before code.** For any M-effort item or any item touching a §6 shared mechanism, the
  owning engineer posts a short design note and gets Architect sign-off **before** writing code.
- **TDD.** Write the failing test first (`*.test.ts` for the engine, `*.bats` for scripts), then
  the minimal implementation, then refactor. QA-functional enforces this.
- **One item, one branch, one PR.** Branch off `main`; conventional-commit messages
  (`feat|fix|refactor|docs|test|chore|perf|ci:`); reference the roadmap item id. Do not commit or
  push unless the human operator asks.
- **Handoffs.** Engineer → QA-functional (tests + gates) → QA-adversarial (for retrieval, schema,
  firewall, raw, or local-model items) → PM (acceptance) → Delivery Lead (integrate + final gate
  run). The Architect reviews any §6-touching diff.
- **Stay in your lane's paths.** Cross-lane edits go through the Delivery Lead; shared-file edits
  are serialized (§7 note).
- **Cite, don't restate.** Every current-state claim cites a repo path; uncited claims are
  `[assumption]` and cannot gate a merge.
- **Read-only until assigned.** Before assignment, explore and plan; do not edit the plugin.

## 10. Definition of Done (per item)

- [ ] Failing test written first; now passing. `bun test` green; coverage ≥ 80% on changed code.
- [ ] `bun run typecheck`, `bun run lint`, `bun run format:check` clean.
- [ ] `bash tests/run-tests.sh tier0 && bash tests/run-tests.sh tier1` green (plus tier2 for
      user-facing flows).
- [ ] Verify-parity (gate-05) and firewall-parity (gate-11) hold if you touched the engine or
      firewall.
- [ ] Glossary-first: every new term has a `docs/GLOSSARY.md` row; `scripts/validate-docs.sh` clean.
- [ ] Docs updated (`docs/architecture.md`, the relevant `SKILL.md`, `docs/operations.md`); an ADR
      added under `docs/adr/` if the item settles a decision.
- [ ] Non-negotiables (§5) and shared-infra invariants (§6) verified by the Architect and
      QA-adversarial where applicable.
- [ ] PM acceptance: the served goal (§2) is demonstrably met.

## 11. Resolved decisions (final — recorded, no longer gating)

The seven questions are answered by the maintainer (roadmap rev5). These are binding constraints,
not open items — implement to them.

1. **Retrieval — no embeddings, ever (absolute).** Tier-3 re-ranker dropped. Recall is the
   wiki-native design (§5): filters + aliases-as-synonyms + synonym lexicon + stemming +
   graph/predicate link-walk, all in the Bun engine.
2. **Tags — controlled taxonomy.** A well-defined, maintained tag taxonomy with quality and
   freshness evals against the vocabulary; `--tag` becomes a precision filter once it exists.
3. **Multi-vault — one active vault** with `add`/`remove`/`merge`/`switch` lifecycle; default one,
   minimum one; writes go only to the active vault (firewall single-active invariant kept).
4. **Durable memory — auto-write learnings as `source_type: agent-session`** through the review
   gate; **git required**, per-vault repo, full history; undo/checkpoints ride git.
5. **Session-end hook — resolved:** Claude Code exposes `Stop` and `SessionEnd`; the memory loop
   uses a real one, not `SubagentStop`.
6. **`entity_type` — fixed core enum, vault-owner-calibratable** to steer intent.
7. **Local LLM — draft-only now; model-agnostic by design; full Claude→Ollama swap is the north
   star**, gated on local models meeting a stability/accuracy/quality bar.

## 12. Citation rule

Every claim about how the plugin works today cites a repo path (e.g. `skills/search/SKILL.md`).
A claim with no path is labeled `[assumption]` and cannot enter an implementation step until
grounded.

## 13. Glossary debt

The roadmap lists the new terms to add to `docs/GLOSSARY.md` before they enter prose or code
(`ontology`, `ontology-profile-v1`, `class`, `property`, `predicate`, `domain`, `range`,
`controlled vocabulary`, `synonym expansion`, `stemming`, `graph-traversal primitive`,
`vault registry`, `per-vault write confinement`, `agent-session source`, `MOC descent`,
`context budget`, `capability tier`, `degraded mode`, `local-ingest-stub`, `ingest-extract`,
`provenance-completeness`, `classification checklist`, `progressive disclosure`,
`one advertised path`, plus the rev5 terms `synonym lexicon`, `tag taxonomy`, `query expansion`,
`graph link-walk`, `active vault`, `vault lifecycle`, `vault merge`, `agent-session source`,
`model-agnostic`, `capability progression`, `quality gate`, and the rest). Lane D lands these in
Phase 0 ahead of the lanes that use them.
