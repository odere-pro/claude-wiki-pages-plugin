# ADR-0003: Polish-agent — centralise the Obsidian-side experience

- **Status:** Proposed
- **Date:** 2026-05-02
- **SPEC anchor:** §11 (agent contracts), §5 (Layer 2 — `obsidian-graph-colors`)

## Context

The "vault stays in sync with Obsidian" experience — graph view colored by topic, vault MOC at `wiki/index.md` reflecting current page counts, every per-folder `_index.md` matching its actual children — is currently the responsibility of three different places:

1. The `llm-wiki-stack-ingest-agent` (formerly `llm-wiki-ingest-pipeline`) handles graph colors at Step 1.7 and partial index updates at Step 1.8 of its ingest sequence.
2. The `llm-wiki-stack-curator-agent` (formerly `llm-wiki-lint-fix`) repairs MOC consistency as part of its lint-fix cycle.
3. The standalone `llm-wiki-index` skill regenerates `wiki/index.md` when invoked.

Three observable problems follow:

1. **Drift between agents.** The ingest agent appends to the index; the index skill rebuilds it from scratch. Run them in different orders and the page-count line for a topic disagrees with the actual file count by one or two pages.
2. **Graph colors only run on ingest.** A curator-only run that creates a new top-level folder (e.g. by moving pages during a `llm-wiki-fix` restructure) leaves the graph view uncolored until the next ingest. The user notices when they switch to Obsidian and see a blob of grey nodes.
3. **No one place to test the Obsidian-side invariants.** Tier 1 Bats covers individual scripts, but no test asserts "after any agent run, every top-level topic has a graph color and `wiki/index.md` matches the file system". The invariant is shared but enforced nowhere.

Centralising the work into a single agent that runs after both ingest and curator passes addresses all three.

## Decision

Add a fourth Layer 3 specialist: `llm-wiki-stack-polish-agent` (`user-invocable: false`, single-pass, no destructive operations). It owns three cheap tasks that today live in three different places:

1. **Graph colors.** Move the existing logic from the ingest agent's Step 1.7. Reads `obsidian-graph-colors` skill, calls `obsidian eval` (via the bundled `obsidian-cli` reference skill) for any new top-level topic folders.
2. **Index refresh.** Regenerate `wiki/index.md` from `_index.md` files: each topic listed with its current page count and last-updated date. Replaces the ingest agent's append-only Step 1.8 work.
3. **Vault MOC consistency.** Walk every folder under `wiki/`; ensure each `_index.md` `children:` field matches the actual `.md` siblings. Append-only fixes; never delete. Today this is the curator's job intermittently — moving it here makes the invariant continuous.

The orchestrator (ADR-0001) fans out the polish-agent in parallel with the final-report compose step at the tail of every successful ingest or curator run. The user never invokes it directly; that is intentional. The agent has no useful standalone meaning — it only makes sense as a tail-of-write step.

## Alternatives considered

- **Keep the work distributed across ingest, curator, and the index skill.** Rejected. Status quo. The drift problem and the graph-colors-on-curator-runs gap are the reasons this ADR exists.
- **Add the work to the orchestrator directly.** Rejected. The orchestrator's job is dispatch, not write. Putting graph-colors logic in the orchestrator violates the layering — orchestrators delegate; specialists do. Future readers would conflate the two responsibilities.
- **Make the polish work a skill, not an agent.** Rejected on careful inspection. A skill is single-responsibility (`/SPEC.md §5 Layer 2`); the polish work is three responsibilities (graph, index, MOC) that are run together and only meaningful together. An agent is the right unit. Each of the three steps internally calls existing skills (`obsidian-graph-colors`, `llm-wiki-index`) where one exists.
- **Run polish synchronously inside ingest and curator instead of fanning out.** Rejected. Synchronous coupling forces ingest and curator to know about graph colors, which is exactly the leak this ADR removes. The fan-out also means a polish failure does not block a successful ingest from being reported — the user gets the ingest result and a polish-failed warning, not a stuck pipeline.
- **Make polish run on a hook (`PostToolUse` Write/Edit on `*.md`).** Rejected. Hooks fire per file; polish is a tree-level operation. Doing it per-file would re-walk the vault N times during a 50-page ingest. The agent runs once at the tail of a logical operation.

## Consequences

**Positive.**

- One place owns the Obsidian-side invariants. New contributors who need to fix a graph-color bug or an index-drift bug have a single file to read.
- The user's "switch to Obsidian after running `/llm-wiki-stack:wiki`" experience becomes the consistent default, not the lucky case. Drop a paper into `raw/`, run the orchestrator, switch to Obsidian, and the new topic is colored, indexed, and counted.
- The ingest agent shrinks. Steps 1.7 and 1.8 collapse to a one-line note pointing at the polish-agent. The ingest agent becomes easier to read and easier to test.
- A Tier 1 fixture-based test can assert the post-polish invariants in one place: graph color present for every top-level folder, `wiki/index.md` page counts equal `find <topic> -name '*.md' | wc -l`, no MOC `children:` drift.

**Negative.**

- **Fourth Layer 3 agent.** `agents/` grows from 3 to 4 files. Acceptable: the layering is fixed (orchestrator + 3 specialists at v0.1, orchestrator + 4 specialists at v0.2), and the four roles map cleanly to the four user-visible workflow phases (init→ingest, repair, query, refresh-presentation).
- **Polish-agent runs on every ingest, even no-op ones.** A re-run with no new sources still triggers the agent. Mitigated: the agent's three steps are idempotent and cheap (graph colors short-circuit when no new top-level folder; index regenerates from existing `_index.md` files; MOC consistency is a single tree walk). Total cost on an idempotent run is sub-second.
- **Coupling to `obsidian-cli`.** The graph-colors step requires the bundled `obsidian-cli` MIT reference skill to be present. If a future user de-installs that skill, polish degrades. Mitigated: the agent's graph-colors step checks for `obsidian-cli` and emits a `[skip]` marker if absent, rather than failing.

## Revisit when

- A user reports that polish runs are non-idempotent (the same input produces a different `wiki/index.md` on the second run). Outcome: tighten the index regeneration logic and add a regression fixture.
- A second Obsidian-presentation concern emerges (e.g. canvas snapshots, dataview view templates) that doesn't fit the existing three steps. Outcome: extend the agent or split into a sibling.
- The Obsidian project ships first-class graph-color persistence such that `obsidian-graph-colors` becomes redundant. Outcome: deprecate the graph-colors step; the agent shrinks to two steps.
