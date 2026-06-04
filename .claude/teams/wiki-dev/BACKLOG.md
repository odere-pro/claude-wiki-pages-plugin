# Backlog — claude-wiki-pages implementation

The roadmap (`docs/plan/0002-agentic-brain-roadmap.md`) decomposed into assignable items, grouped by
phase and tagged with the owning lane, dependencies, user-gate, and the key gate that proves it
done. The Delivery Lead assigns from here; the PM attaches acceptance criteria; the Architect signs
off design for M-effort and shared-mechanism items.

## Legend

- **Lanes:** A = `wiki-dev-eng-retrieval` · B = `wiki-dev-eng-schema` · C = `wiki-dev-eng-ingest` ·
  D = `wiki-dev-eng-ux`. Shared-mechanism items also need `wiki-dev-architect`.
- **Sign-off:** the Open question (Brief §11) that must be answered by the user before the item
  starts. `—` means none.
- **Handoff chain (every item):** PM acceptance spec → Architect design verdict (if M/shared) →
  engineer (TDD) → `wiki-dev-qa-functional` → `wiki-dev-qa-adversarial` (retrieval/schema/firewall/
  raw/memory/local-model) → PM acceptance → Delivery Lead integrate + final gate.

## Phase 0 — Foundations (upstream of everything; do first)

| Item | Lane | Depends on | Sign-off | Key gate |
| ---- | ---- | ---------- | -------- | -------- |
| Glossary rows for all new terms (Brief §13) | D | — | — | gate-04 glossary / `validate-docs.sh` |
| Fix stale counts in `docs/architecture.md` (13 skills/3 agents → 23/7) | D | — | — | markdownlint, `validate-docs.sh` |
| **S1 — `ontology-profile-v1`**: predicate domain→range table + single enum list | B + Architect | glossary rows | #6 (enum policy) | frontmatter validate, schema review |
| **Rebuild stale `dist/cli.js`** (ship `search` + `schema_version: 2`) | A | — | — | gate-05 verify-parity, gate-09 npm-pack |
| Document the `_proposed/` + `proposed_by` review-gate contract | D | — | — | `validate-docs.sh` |

## Phase 1 — Precision, recall & reliability (interleave with Phase U)

| Item | Lane | Depends on | Sign-off | Key gate |
| ---- | ---- | ---------- | -------- | -------- |
| R1 — candidate filters `--type` / `--folder` (+ `--tag` best-effort) | A | S1 enum (for `--type`) | #2 (`--tag` only) | `search.test.ts` |
| **Tier-2 deterministic recall** — controlled-vocabulary/synonym file + stemming | A | R1 | **#1** | determinism + recall tests |
| R4 — `matched{}` score breakdown (the shared score object) | A + Architect | — | — | gate-05 verify-parity |
| R3 — agent-vs-human retrieval contract on the MOC | A | R4 | — | skill docs + tests |
| I2 — alias-aware two-pass dedup (ships with R1) | C | R1 | — | ingest bats |
| I1 — classification checklist consuming S1's enums | C | S1 | — | ingest bats |
| I3 — provenance-completeness checks (extend lint/hooks) | C | — | — | `verify-ingest.bats` |
| S4-derivation — staleness from `updated` vs newest cited source | B | — | — | lint / `verify-ingest.bats` |
| C1 — budget-aware MOC descent (reads R4 score, never re-ranks) | C + Architect | R4 | — | query skill tests |
| C4-read — SessionStart MOC pointer line | C | — | — | `session-start.bats` |
| P1/P2/Pb — capability tier map; degradation + review-gate; `proposed_by` vocab | D | `_proposed/` doc | — | `validate-docs.sh` |

## Phase U — UX/DX "simple to master" (mostly S; interleave with Phase 1)

| Item | Lane | Depends on | Sign-off | Key gate |
| ---- | ---- | ---------- | -------- | -------- |
| U1 — advertise `/claude-wiki-pages:wiki` as the one entry verb; fold the rest | D | — | — | `validate-docs.sh` |
| U2 — first run just works (default vault; auto-sample when `raw/` empty) | D | — | — | onboarding bats |
| U3 — config-independent `NEXT:` line + orchestrator undo clause | D (+ C for `session-start.sh`) | — | — | `session-start.bats`, `heartbeat.bats` |
| U4 — errors that teach (all missing fields at once; offending fragment) | D | — | — | `validate-frontmatter.bats`, `check-wikilinks.bats` |
| U5 — optional `next?: string[]` on `Report` (JSON-only, out of `renderText`) | A + Architect | — | — | gate-05 verify-parity |
| U6 — contributor quick wins (stale-`dist` Tier-0 check; CONTRIBUTING; `tier3` target) | D (+ A for dist check) | — | — | tier0 gate, `run-tests.bats` |

## Phase 2 — Structure, graph & memory

| Item | Lane | Depends on | Sign-off | Key gate |
| ---- | ---- | ---------- | -------- | -------- |
| **Graph-traversal primitive + R2 `--graph`** (N≤2 over `sources`+`related`+`depends_on`) | A + Architect | S1, R4 score object | — | `search.test.ts` |
| S1-check — opt-in lint-tier predicate range check | B | S1 | — | lint bats |
| S2-structural — template-skeleton conformance + no-raw-HTML | B | — | — | lint bats |
| **S3 — multi-vault registry + per-vault write confinement** | B + Architect | — | **#3** | gate-11 firewall-parity, `resolve-vault.bats` |
| **C2/C4-write — durable memory** (`source_type: agent-session` → `_proposed/`; `protect-raw` carve-out) | C + Architect | `_proposed/` doc, `source_type` enum (B) | **#4, #5** | `protect-raw.bats`, adversarial |
| C3 — stale-memory flagging (reuse `status:stale` + `confidence` + lint) | C | — | — | lint bats |
| I4 — PDF via `source_format: pdf` | B (enum) + C (ingest) | enum extension | — | ingest bats, frontmatter validate |
| Pc — `local-ingest-stub` (`tier: ingest-extract`) into `_proposed/` | D + C | `_proposed/` doc | **#7** | draft/review tests |
| P3-revised — `localModel` config: add `tier` + `offlinePolicy` (reuse `modelHints`) | B | — | — | gate-07 config-schema |

## Phase 3 — Expansion (gated on evidence; start only on the PM's go)

| Item | Lane | Depends on | Sign-off | Why deferred |
| ---- | ---- | ---------- | -------- | ------------ |
| **Tier-3 local-embedding re-ranker** (off by default, gate-excluded) | A | candidate set | **#1** | crosses goal #5; needs explicit sign-off |
| S2-overlap — >50% token-overlap single-sourcing detector | B | S2-structural | — | overlaps existing lint; false-positive risk |
| I5 — audio/video via `transcript_path` | C | enum extension | — | lowest leverage; PDF ships first |
| Pa — degraded-mode reachability at SessionStart | D | P1/P2 | — | one-shot note; revisit if mis-routing seen |
| R2-expansion — `--graph` over `contradicts`/`supersedes` | A | graph primitive | — | inverts canonical-page semantics; opt-in |

## Cut / out of scope (do not build)

From the roadmap's "Deferred / out-of-scope" and the UX/DX red-team cuts: `confidenceCeiling`,
`modelOverrides`, a `last_reviewed` field, session learnings as unsourced `derived:true`, firewall
write fan-out across multiple roots in one operation, `tags` as a controlled vocabulary, a uniform
engine output envelope, and `capabilities`/`route` engine verbs. These duplicate existing mechanisms
or weaken provenance — building them violates Brief §5/§6.
