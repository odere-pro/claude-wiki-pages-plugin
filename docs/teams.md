# Agent teams

`claude-wiki-pages` runs two complementary, dev-only agent teams. Neither ships in the plugin
(`agents/`, `skills/`, `hooks/`) and neither is loaded as end-user session context — they sit
alongside `docs/plan/` and `docs/adr/` and exist to plan and build the plugin itself.

- The **brainstorming team** *ideates* — it produces phased roadmaps (proposals) for the plugin's
  UX & adoption course.
- The **engineering team** *implements* — it turns an approved roadmap into shipped, gate-green
  changes.

| | Brainstorming team | Engineering team (`wiki-dev`) |
|---|---|---|
| Charter | UX & adoption — onboarding, authoring, ontology clarity, capability tiers, config | Implement the four-layer roadmap |
| Output | A phased roadmap in `docs/plan/` (a proposal) | Shipped, gate-green changes + ADRs |
| Mode | Read-only on the plugin (proposal-only) | Edits the plugin, lane by lane, behind gates |
| Lives in | `docs/brainstorm/` | `.claude/teams/wiki-dev/` + `.claude/agents/wiki-dev-*.md` |
| Headcount | 11 personas | 9 teammates |

## Brainstorming team (UX & adoption)

Apparatus: `docs/brainstorm/` — `TEAM-BRIEF.md` (shared context), `README.md` (how to run),
`roles/*.md` (one structured prompt per persona). A UX/adoption-oriented panel spanning the whole
user spectrum — novice, power user, agent — plus the authoring, ontology, engineering, and
configuration expertise to keep proposals buildable and coherent.

There is **no separate Lead**: the **Product Manager** carries the facilitator/synthesizer hat and
the **Architect** co-owns architectural coherence at convergence.

| Role (slug) | Owns | Model · Effort |
|---|---|---|
| `product-manager` | Goal fit, acceptance, facilitation + roadmap write | opus · ultrathink |
| `architect` | Four-layer coherence, single-home reuse, ADR candidates | opus · ultrathink |
| `structure-authoring-architect` | Authoring ergonomics, templates, single-sourcing | opus · ultrathink |
| `ontology-engineer` | Classes, properties, typed predicates, enum single-source | opus · ultrathink |
| `senior-engineer` | Feasibility, effort sizing, reuse-before-build | sonnet · think hard |
| `plugin-expert` | Correct plugin usage; the verbs, hooks, entry path | sonnet · think hard |
| `plugin-power-user` | Advanced workflows, multi-vault, automation, scale friction | sonnet · think hard |
| `new-claude-user` | First-run friction, jargon, "one obvious next step" | sonnet · standard |
| `claude-code-config-expert` | Settings, hooks, packaging, first-run defaults | opus · ultrathink |
| `grill-me-interrogator` | Falsifiable requirements via the external grill-me skill | sonnet · think hard |
| `skeptic` | Guardian: NO-RAG, KISS, DRY, glossary | opus · ultrathink |

**How it runs** — a three-round protocol (`TEAM-BRIEF.md` §9): Divergence (isolated ideation) →
Cross-critique (peer objections; the Skeptic critiques all, the Grill-Me Interrogator makes every
proposal falsifiable) → Convergence (the Product Manager merges into a roadmap with the Architect's
coherence sign-off). Full run instructions are in `docs/brainstorm/README.md`.

**External dependency** — the `grill-me-interrogator` drives a **grill-me** skill that is not in
this repo; wire it in before running (see `docs/brainstorm/roles/grill-me-interrogator.md`).

## Engineering team (`wiki-dev`)

Apparatus: `.claude/teams/wiki-dev/` — `TEAM-BRIEF.md` (shared context), `BACKLOG.md` (assignable
work by phase → lane → item), `README.md` (how to launch). The nine roles are spawnable agent
definitions in `.claude/agents/wiki-dev-*.md`. It implements the agentic-brain roadmap
(`docs/plan/0002-agentic-brain-roadmap.md`) across four parallel lanes.

| Role (slug) | Title | Model · Lane / focus |
|---|---|---|
| `wiki-dev-manager` | Delivery Lead / Engineering Manager | opus · Sequencing, assignment, integration, gates (entry point) |
| `wiki-dev-pm` | Product Manager | opus · Goals, acceptance, the user-gated questions |
| `wiki-dev-architect` | Architect / Tech Lead | opus · Four-layer coherence, the one-X contracts, ADRs |
| `wiki-dev-eng-retrieval` | Senior Fullstack Bun/TS Engineer | sonnet · Lane A — Retrieval & Engine |
| `wiki-dev-eng-schema` | Senior Fullstack Bun/TS Engineer | sonnet · Lane B — Schema, Ontology & Multi-vault |
| `wiki-dev-eng-ingest` | Senior Fullstack Bun/TS Engineer | sonnet · Lane C — Ingest, Context & Memory |
| `wiki-dev-eng-ux` | Senior Fullstack Bun/TS Engineer | sonnet · Lane D — Portability, UX/DX & Docs |
| `wiki-dev-qa-functional` | QA — Functional & Test | sonnet · Tier 0–1 gates, unit/integration, coverage |
| `wiki-dev-qa-adversarial` | QA — Adversarial & Security | opus · Tier 2–4, NO-RAG/provenance audit, dogfood |

**How it runs** — parallel by lane, sequential by phase. Every item flows through a handoff chain:
PM acceptance spec → Architect design verdict (for shared mechanisms) → engineer TDD →
QA-functional (Tier 0 + Tier 1, ≥80% coverage on changed code) → QA-adversarial (Tier 2–4 on
retrieval / schema / firewall / raw / memory / local-model items) → PM acceptance → Delivery Lead
integrates and runs the final gate. Phase order: Phase 0 → Phase 1 + Phase U (interleaved) →
Phase 2 → Phase 3. Full launch instructions are in `.claude/teams/wiki-dev/README.md`.

## When to use which

- **A roadmap or a direction is unclear** — convene the **brainstorming team**. It diverges across
  perspectives, stress-tests proposals, and writes a phased proposal to `docs/plan/`. Nothing in
  the plugin changes.
- **A roadmap is approved and needs building** — convene the **engineering team**. It assigns items
  to lanes, builds them test-first, and ships only what passes the gates.

The handoff between them is a roadmap in `docs/plan/`: the brainstorming team writes it, the
engineering team consumes it. Both keep the same non-negotiables (NO RAG / no embeddings, structural
provenance, DRY single-sourcing, ontology-in-schema, structured authoring, glossary-first,
KISS/YAGNI) and both are read-only on the plugin until work is explicitly assigned.
