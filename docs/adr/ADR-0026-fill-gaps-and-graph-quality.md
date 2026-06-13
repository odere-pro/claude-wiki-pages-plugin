# ADR-0026: Fill-gaps capability — a skill that materializes a workflow, plus a graph-quality detector

- **Status:** Accepted
- **Date:** 2026-06-13
- **Builds on:** [ADR-0007](./ADR-0007-wiki-native-recall.md) (NO-RAG / deterministic, no embeddings), [ADR-0022](./ADR-0022-folder-notes-and-graph-quality.md) (folder notes, graph quality), [ADR-0023](./ADR-0023-wiki-only-graph.md) (wiki-only graph), [ADR-0024](./ADR-0024-host-project-intake.md) (host-project intake)
- **Anchor:** §5 (the four-layer stack), §9 (Obsidian-side experience)

## Context

Dogfooding the plugin's own vault surfaced two gaps the existing verbs do not
close:

1. **Dangling wikilinks are invisible to `verify`.** A `[[Target]]` whose target
   resolves to no page renders as an empty grey node in Obsidian's graph, but
   the engine's `verify` (CHECK 0–5) reports `0 errors / 0 warnings` for it —
   there is no dangling-link check. The user sees "empty nodes" the tooling
   swears are clean.
2. **Coverage scatters instead of clustering.** A vault ingested from a docs
   tree spreads across legacy folders with no center of mass. The user's quality
   bar was explicit: the *majority* of nodes and edges should cluster around a
   fixed set of core topics, each a navigable hub.

Closing both is a multi-step orchestration — stage sources, ingest by topic,
author hubs, resolve every dangling link, enrich, heal, measure. That is exactly
the kind of multi-agent loop the Workflow tool runs. But **a Claude Code plugin
cannot ship a `.mjs` Workflow**: `plugin.json` has no `workflows` key, and
`.claude/workflows/*.mjs` is project-local with no distribution path.

## Decision

### 1. Ship the orchestration as a skill that materializes the workflow on demand

The plugin carries the canonical Workflow script as a **skill asset**
(`skills/fill-gaps/template/fill-knowledge-gaps.mjs`). The `fill-gaps` skill
copies it into the user's `.claude/workflows/` on invocation — idempotent, only
when absent or content-changed, never clobbering a user-modified copy — then runs
it via the Workflow tool. This is the same materialize-from-`template/` pattern
the `init` skill already uses for the vault scaffold. The workflow orchestrates
the **existing** ingest / curator / polish agents; no new agent is introduced.

The skill is `disable-model-invocation: true` (it writes the vault) and is
fronted by `/claude-wiki-pages:fill-gaps`; the orchestrator routes
"complete the wiki / fill the gaps / no empty pages" intent to it.

### 2. Add a deterministic graph-quality detector the engine lacks

`scripts/graph-quality.sh --target <vault> [--json]` scans every wiki page's
`[[wikilinks]]` (body + frontmatter), resolves each against the union of
{filename stem, `title`, `aliases`} case-insensitively (mirroring Obsidian, no
space↔hyphen fuzzing), and reports unresolved targets. It also assigns each
topic-bearing page to one of the seven core clusters and computes node
concentration `Cn`, edge concentration `Ce` (edges whose both endpoints are in a
cluster — the faithful "majority of edges around the topics" measure), and the
informational hub-touch fraction `Ch`. Pure bash + python3 stdlib — no Bun, no
network, no embeddings, consistent with ADR-0007.

### 3. The gap-fill is gated on measurable quality, never on fabrication

The workflow asserts `danglingCount == 0`, `verify` clean, `Cn ≥ 0.85`,
`Ce ≥ 0.85`, and that each hub is substantive (`Ch` is reported, not gated).
Dangling links are resolved by
**creating a real, sourced page**, **fixing the link** (alias/fuzzy), or
**prose-ifying** it — never by an empty stub, and never by inventing a link to
pass a gate. A failed gate is surfaced with its checkpoint SHA, not papered over.

## Consequences

- The plugin gains a fourth slash command and a fourteenth authored skill verb;
  the four-layer counts in `CLAUDE.md` and `docs/architecture.md` are updated.
- `graph-quality.sh` is standalone bash/python — no engine TypeScript change, so
  the verify/firewall parity gates are untouched. Promoting the dangling check
  into `engine verify` as a real CHECK is a deliberate future follow-up.
- Because the workflow ships as a skill asset rather than an installed artifact,
  end-users get it the moment they invoke the skill, and contributors can run the
  same script directly from `.claude/workflows/`.
