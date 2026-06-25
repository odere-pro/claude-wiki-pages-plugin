---
description: Complete the wiki — no empty pages, no dangling [[links]], graph clustered around the core topics. Stages repo sources, ingests, authors hub pages, resolves every dangling link, enriches, then heals + verifies.
argument-hint:
  [optional focus, e.g. "center the graph on the engine + obsidian topics"]
allowed-tools: Bash(bash *), Read, Glob, Grep
---

# /claude-wiki-pages:fill-gaps

Turn a thin or hole-y vault into a **complete**, gap-free wiki: zero dangling
wikilinks (no empty graph nodes), no empty pages, and a graph whose nodes and
edges concentrate around the project's core topic clusters.

## What this command does

Invokes the `fill-gaps` skill, which:

1. **Resolves** the vault + repo and asserts they match (guards against writing
   the wrong vault).
2. **Materializes** the bundled gap-fill workflow into the project's
   `.claude/workflows/fill-knowledge-gaps.mjs` (idempotent — only if
   absent/changed; never clobbers a user-modified copy).
3. **Runs** it via the Workflow tool. The workflow drives the existing
   `ingest`, `curator`, and `polish` agents through eight sequential,
   git-checkpointed phases: stage curated repo sources → ingest by topic →
   author topic hub pages → resolve every dangling link (create real pages /
   fix links / prose-ify) → enrich thin pages → heal + polish → measure.
4. **Reports** baseline → final: dangling count (target 0), `engine verify`
   status, node/edge concentration on the topic clusters, and the per-cluster
   breakdown.

## When to use this command

- The Obsidian graph shows empty grey nodes (dangling `[[links]]`).
- The wiki is thin on the core topics and you want it filled from the repo.
- You want the graph re-centered on a fixed set of topic clusters.

Safe to re-run — every phase is git-checkpointed (`git revert` any phase) and
the run is idempotent. This command writes to the vault, so it is gated like
ingest and never auto-fires.

## Companion commands

- `/claude-wiki-pages:wiki` — the top-level entry; routes "complete the
  wiki / fill the gaps" intent here automatically.
- `/claude-wiki-pages:lint` — read-only structural audit (does not fill gaps).

## Specification anchor

Skill: [`skills/fill-gaps/SKILL.md`](../skills/fill-gaps/SKILL.md). Decision
record: [`docs/adr/ADR-0027-fill-gaps-and-graph-quality.md`](../docs/adr/ADR-0027-fill-gaps-and-graph-quality.md).
