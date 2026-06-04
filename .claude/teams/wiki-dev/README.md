# claude-wiki-pages development team — agent-team apparatus

A dev-only, cross-functional agent team that **implements** the brainstorm roadmap
(`docs/plan/0002-agentic-brain-roadmap.md`). It is the implementation counterpart to the
brainstorm team in `docs/brainstorm/` (which produced the roadmap). Like that apparatus, it is
**not** part of the shipped plugin — it lives in `.claude/` and is never loaded as end-user session
context.

## What's here

```text
.claude/teams/wiki-dev/
  TEAM-BRIEF.md    # shared context every teammate reads first (mission, tech stack, non-negotiables, lanes, DoD)
  BACKLOG.md       # the assignable work breakdown: phase → lane → item, with dependencies and gates
  README.md        # this file

.claude/agents/    # the nine spawnable role definitions
  wiki-dev-manager.md          # Delivery Lead / Engineering Manager — start here
  wiki-dev-pm.md               # Product Manager
  wiki-dev-architect.md        # Architect / Tech Lead
  wiki-dev-eng-retrieval.md    # Lane A — Retrieval & Engine
  wiki-dev-eng-schema.md       # Lane B — Schema, Ontology & Multi-vault
  wiki-dev-eng-ingest.md       # Lane C — Ingest, Context & Memory
  wiki-dev-eng-ux.md           # Lane D — Portability, UX/DX & Docs
  wiki-dev-qa-functional.md    # QA — Functional & Test
  wiki-dev-qa-adversarial.md   # QA — Adversarial & Security
```

## Roster (9 teammates)

Requested shape: 3 engineers, 2 QA, 1 manager, 1 architect, 1 PM. Adjusted to **4 engineers** so the
four independent roadmap lanes run in parallel (the request permits adjusting headcount for
parallelism).

| Role (slug)               | Title                               | Model  | Lane / focus                                   |
| ------------------------- | ----------------------------------- | ------ | ---------------------------------------------- |
| `wiki-dev-manager`        | Delivery Lead / Engineering Manager | opus   | Sequencing, assignment, integration, gates.    |
| `wiki-dev-pm`             | Product Manager                     | opus   | Goals, acceptance, the 7 user-gated questions. |
| `wiki-dev-architect`      | Architect / Tech Lead               | opus   | Four-layer coherence, the one-X contracts, ADRs.|
| `wiki-dev-eng-retrieval`  | Senior Fullstack Bun/TS Engineer    | sonnet | Lane A — Retrieval & Engine (TS).              |
| `wiki-dev-eng-schema`     | Senior Fullstack Bun/TS Engineer    | sonnet | Lane B — Schema, Ontology & Multi-vault.       |
| `wiki-dev-eng-ingest`     | Senior Fullstack Bun/TS Engineer    | sonnet | Lane C — Ingest, Context & Memory.             |
| `wiki-dev-eng-ux`         | Senior Fullstack Bun/TS Engineer    | sonnet | Lane D — Portability, UX/DX & Docs.            |
| `wiki-dev-qa-functional`  | QA — Functional & Test              | sonnet | Tier 0–1 gates, unit/integration, coverage.    |
| `wiki-dev-qa-adversarial` | QA — Adversarial & Security         | opus   | Tier 2–4, NO-RAG/provenance audit, dogfood.    |

## Prerequisites

- Claude Code ≥ 2.1.32 (Agent Teams).
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `~/.claude/settings.json` (already set on this
  machine). The flag is read at startup — restart Claude Code if you change it.
- The dev toolchain installed: `bash tests/install-deps.sh` (Bun ≥ 1.2, shellcheck, shfmt, bats,
  markdownlint-cli2, lychee, gitleaks, jq).

## How to launch

The role files in `.claude/agents/` are auto-discovered as agent types in this repo, so you can
spawn any teammate directly. The **Delivery Lead is the entry point**. Paste to a session opened at
the repo root:

> Act as `wiki-dev-manager`. Read `.claude/teams/wiki-dev/TEAM-BRIEF.md` and
> `.claude/teams/wiki-dev/BACKLOG.md`. Stand up the full team (PM, Architect, four lane engineers,
> two QA), confirm the seven open questions with me before any gated item, then run **Phase 0**:
> fan out the independent items across lanes in parallel, route each through the handoff chain
> (Architect design review → engineer TDD → QA-functional → QA-adversarial where applicable → PM
> acceptance), and integrate only when `bash tests/run-tests.sh tier0 && bash tests/run-tests.sh
> tier1` is green. Report status and stop.

For a single workstream, spawn that lane directly — e.g. *"Act as `wiki-dev-eng-retrieval` and take
roadmap item R1 from the backlog"* — but still route it through QA and the PM per the Brief.

## Workflow (parallel by lane, sequential by phase)

1. The Delivery Lead reads the roadmap + backlog and plans the cycle.
2. The PM attaches an acceptance spec; the Architect approves the design for any M-effort or
   shared-mechanism item **before** code.
3. The four lanes implement their items **in parallel** (TDD first):
   - Lane A — Retrieval & Engine · Lane B — Schema/Ontology/Multi-vault ·
     Lane C — Ingest/Context/Memory · Lane D — Portability/UX-DX/Docs.
4. QA-functional runs Tier 0 + Tier 1 and coverage; QA-adversarial red-teams the non-negotiables on
   retrieval / schema / firewall / raw / memory / local-model items.
5. The PM accepts; the Delivery Lead integrates and runs the final gate.

Phase order (Brief §8): **Phase 0 → Phase 1 + Phase U (interleaved) → Phase 2 → Phase 3** (Phase 3
only on the PM's go). Phase 0 is upstream of everything; do it first.

## Definition of done

See Brief §10. In short: TDD, `bun test` green with ≥ 80% coverage on changed code, typecheck / lint
/ format clean, `bash tests/run-tests.sh tier0 && ... tier1` green (plus tier2 for user flows),
verify-parity and firewall-parity intact, glossary-first with `scripts/validate-docs.sh` clean, docs
updated, and an ADR for any settled decision.

## Dogfood the result (optional, on a scratch vault only)

Prove the ingest + search loop **without touching the shipped example vault**:

1. `export CLAUDE_WIKI_PAGES_VAULT=/tmp/wiki-dev-scratch`
2. Scaffold it with `/claude-wiki-pages:wiki` (onboarding branch).
3. Copy a roadmap item's sources into the scratch vault's `raw/`, then run `/claude-wiki-pages:wiki`
   to ingest → curate → polish.
4. Search and query the scratch vault to confirm topic-scoped retrieval.
5. Discard the scratch vault.

**Never** point `CLAUDE_WIKI_PAGES_VAULT` at `docs/vault-example/` — that vault is the shipped,
schema-pinned reference and must stay untouched.

## Notes

- This apparatus is read-only on the plugin until the Delivery Lead assigns an item; teammates then
  edit only their lane's paths.
- It mirrors the repo's existing team pattern (`docs/brainstorm/`) but is located in `.claude/` as a
  reusable, spawnable team. It does not ship and is not loaded as end-user context.
