# ADR-0031: Graph connectivity, orphans, and shadow edges in `graph-quality.sh` — bash-only, no TS twin

- **Status:** Proposed
- **Date:** 2026-06-15
- **Builds on:** [ADR-0022](./ADR-0022-folder-notes-and-graph-quality.md) (`graph-quality.sh` + the cluster metric), [ADR-0023](./ADR-0023-wiki-only-graph.md) (wiki-only graph, `userIgnoreFilters`), [ADR-0028](./ADR-0028-dangling-wikilink-verify-check.md) (dangling scan), [ADR-0030](./ADR-0030-obsidian-accurate-resolution-and-collision.md) (Obsidian-accurate resolution)
- **Anchor:** §4 (Layer 1 — Data), the `graph-quality.sh` advisory-scanner contract, the `fill-gaps` skill
- **Owner:** Lane A (eng-retrieval) — `scripts/graph-quality.sh`, `tests/scripts/graph-quality.bats`

## Context

`graph-quality.sh` already reports dangling links and the topic-cluster concentration metric (Cn/Ce/Ch). It does **not** answer the question the orphan-node investigation (#17) needed: *is the graph one connected piece, and which pages are isolated?* "Dangling: 0" does not mean "graph-clean" (#9) — a vault can have zero dangling links yet still scatter into disconnected islands or float orphan pages that Obsidian renders as isolated points. The objective end-state the investigation converged on was **one connected component, zero orphans, zero shadow edges** (#20, #26).

Two further facts shape the design:

- **Shadows (#24).** An Obsidian-created stub in an *indexed* scratch folder (`output/`, `_inbox/`) can shadow a real wiki page because a file basename beats an alias (ADR-0030). A link then "resolves" but lands on an empty stub. Connectivity must detect a link resolving **into** a scratch folder and refuse to count it as a connecting edge.
- **Living vault (#25, #26).** Obsidian creates stubs as a user navigates, so a vault verified clean can regress purely from browsing. The check must be cheap and re-runnable, and it must read the **on-disk** truth (the rendered graph can be a stale index — a separate, reindex-only issue).

## Decision

### 1. Connectivity lives in `graph-quality.sh` only — bash + python3, no TS twin, no parity gate

A connected-components computation (union-find over a global edge graph with node-universe exclusions and shadow flagging) is materially more complex than the line-oriented checks gate-05 pins. Forcing a byte-parity TS twin would create high drift risk for an **advisory, whole-graph** metric that is not a per-write invariant. `graph-quality.sh` already owns exactly this analytical role (cluster metric, dangling scan, python3-backed, read-only, consumed by `fill-gaps`), so connectivity is the natural fourth metric beside Cn/Ce/Ch. It is covered by `tests/scripts/graph-quality.bats`, not by a parity gate. The collision check that *is* a per-write signal lives in `verify` with a twin (ADR-0030); the seam is clean: **collision = per-write (verify + twin), connectivity = whole-graph analytical (graph-quality.sh only).**

### 2. Node universe

A node is a page under `wiki/` — including `_sources/`, `_synthesis/`, the root `index.md`/`log.md`, and folder notes: these are real pages and the legitimate connective tissue of the graph (this differs from the cluster metric, which excludes `_sources`/`_synthesis`/bookkeeping from `Cn` — documented divergence). Excluded from the node universe: the `userIgnoreFilters` paths (`raw/`, `_templates/`, `_proposed/` — siblings of `wiki/`, so naturally outside the walk) and the scratch quarantine folders (`output/`, `_inbox/`). The vault-root `CLAUDE.md` is excluded because it is not under `wiki/` (matching its `userIgnoreFilters` exclusion, #19).

### 3. Edge set

Edges come from every resolving `[[link]]` — body **and** frontmatter property values — with code spans/fences stripped (the existing `strip_code`). Each link is resolved with the **Obsidian-accurate ladder** of ADR-0030 (exact-path > basename > alias > title; tie-break shortest-path → same-folder → alphabetical), evaluated over the node universe **plus** the scratch files (so a stub target can be recognised). Edges are **undirected** for component membership. Then:

- target is a wiki node → a connecting edge (self-links ignored);
- target is a scratch file (`output/`, `_inbox/`) → a **shadow edge**: counted and listed under `shadows`, **not** a connecting edge, and the scratch file is **not** pulled into the node set;
- target resolves to nothing → dangling (already reported; no edge).

### 4. Algorithm and output

Union-find over the node universe with the undirected connecting-edge set yields `components`, the `orphans` list (degree-0 nodes), `largestComponentSize`, and the `shadows` list (`from` → scratch `to`). These are added to the existing `graph-quality.sh` JSON under a `connectivity` object and printed as human lines in the text branch. All lists are sorted for determinism (same vault → same output). The documented end-state for a healthy vault is `components == 1 && orphanCount == 0 && shadowCount == 0`; `fill-gaps` and the dogfood re-verification read these fields.

## Alternatives considered

- **Put connectivity in the TS engine `verify` with a bash twin.** Rejected: a graph algorithm under byte-parity is high-drift for an advisory metric that need not ride every write hook (§1).
- **Count `_sources`/`_synthesis` as non-nodes (mirror the cluster metric's `is_special`).** Rejected: they are real pages that genuinely connect the graph; excluding them would under-report connectivity and hide real orphans.
- **Treat a scratch-folder target as a normal edge.** Rejected: that is exactly the shadow bug (#24) — a stub masquerading as a resolved page. Flagging it is the point.
- **Trust Obsidian's rendered graph for connectivity.** Rejected: the rendered graph can be a stale index (#25); the on-disk resolver is the objective measure.

## Consequences

- `graph-quality.sh --json` gains a `connectivity` object (`nodes`, `components`, `orphanCount`/`orphans`, `largestComponentSize`, `shadowCount`/`shadows`); the text branch gains matching lines.
- The dogfood-vault re-verification and `fill-gaps` get an objective "is the graph one piece" signal, replacing eyeballing Obsidian.
- No new parity surface; the cost is contained to one python block and its bats coverage.
- Resolution logic now appears in three places (the TS resolver, the verify-ingest.sh twin, the graph-quality.sh python). TS↔verify-ingest is gate-05-pinned; graph-quality is documented as a best-effort mirror of the ADR-0030 specification and carries a bats sanity case so gross drift is caught.

## Revisit when

- A maintainer wants the connectivity end-state enforced as a gate (not advisory) — that is a deliberate escalation with its own ADR.
- The scratch-folder set changes (e.g. a new quarantine folder) — update the exclusion and shadow lists in one edit.
