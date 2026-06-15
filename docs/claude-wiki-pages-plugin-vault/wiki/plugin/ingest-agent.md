---
title: "Ingest Agent"
type: entity
entity_type: tool
aliases: ["Ingest Agent", "ingest agent", "claude-wiki-pages-ingest-agent", "pipeline"]
parent: "[[plugin|claude-wiki-pages Plugin]]"
path: "plugin"
sources: ["[[_sources/architecture|Architecture Documentation]]", "[[_sources/adr-0002-agent-naming-convention|ADR-0002: Agent Naming Convention]]", "[[adr-0010-durable-memory|ADR-0010: Durable-Memory Carve-Out]]", "[[llm-wiki-03-update-existing|User Guide 03: Update Existing Vault]]", "[[_sources/operations|Operations Guide]]", "[[plugin-ingest-agent|Ingest Agent Source]]", "[[_sources/adr-0024-host-project-intake|ADR-0024: Host-Project Intake]]", "[[_sources/adr-0026-parallel-extract-and-scheduled-upkeep|ADR-0026: Bounded Parallel Extract and Scheduled Upkeep]]"]
related: ["[[orchestrator-agent|Orchestrator Agent]]", "[[curator-agent|Curator Agent]]", "[[polish-agent|Polish Agent]]", "[[git-checkpoint|Git Checkpoint]]", "[[agent-tool-restriction|Agent Tool Restriction]]", "[[parallel-extract|Parallel Extract]]"]
tags: ["agent", "ingest"]
created: 2026-06-13
updated: 2026-06-15
update_count: 7
status: active
confidence: 1.0
---

# Ingest Agent

> [!summary]
> The `claude-wiki-pages-ingest-agent` is Layer 3's ingest specialist. It processes raw source files from `vault/raw/` into provenance-tracked wiki pages, following the 13-step ingest rules in `vault/CLAUDE.md`. The write phase is bounded by git snapshot checkpoints. After the agent returns, the `subagent-ingest-gate.sh` hook automatically runs `verify-ingest.sh` to ensure no half-written state was left. The [[polish-agent|Polish Agent]] runs as a tail step after ingest completes.

## Key Facts

- Type: tool (Layer 3 agent, `user-invocable: true` via `/claude-wiki-pages:claude-wiki-pages-ingest-agent`)
- Agent name: `claude-wiki-pages-ingest-agent` (renamed from `llm-wiki-ingest-pipeline` in version 0.2.0, ADR-0002)
- Dispatched by: [[orchestrator-agent|Orchestrator Agent]] when files exist in `vault/raw/` that have no entry in `wiki/log.md`
- Follows: the 13-step ingest rules in `vault/CLAUDE.md` — the skill provides workflow structure; `CLAUDE.md` provides the schema
- Write phase bounded by git snapshot checkpoints (pre-snapshot before writes, post-snapshot after)
- Gate: `subagent-ingest-gate.sh` hook fires automatically on return and runs `verify-ingest.sh`; ERROR findings are surfaced to the orchestrator
- DRY rule enforced: updates existing pages rather than creating duplicates (Entity Distribution Model)

## Overview

The `claude-wiki-pages-ingest-agent` (renamed from `llm-wiki-ingest-pipeline` in version 0.2.0, ADR-0002) is dispatched by the [[orchestrator-agent|Orchestrator Agent]] when files exist in `vault/raw/` that have no corresponding entry in `wiki/log.md`. The agent follows the ingest rules in `vault/CLAUDE.md` exactly — not the simpler defaults in the `ingest` skill. The skill provides workflow structure; `CLAUDE.md` provides the schema.

## Dispatch Condition

The orchestrator runs:

1. Reads `wiki/log.md` for the set of ingested source titles.
2. Lists `vault/raw/` recursively (excluding `raw/agent-sessions/`, which is the durable-memory carve-out).
3. Compares the two sets. If any raw file is absent from the log, dispatch the ingest agent.

Power users can skip the probe: `/claude-wiki-pages:claude-wiki-pages-ingest-agent` invokes the agent directly. This skips the orchestrator's state probe and the polish tail step.

## Write-Path Sequence

The agent's full execution sequence:

### 1. Pre-snapshot

```bash
bash scripts/engine.sh snapshot pre --target <vault>
```

Creates a `snapshot: pre-ingest` git commit. If the ingest fails partway through, the vault can be rolled back to this exact state with `git revert`.

### 2. Source Summary Creation (Step 1)

For each pending raw source, the agent creates a `wiki/_sources/<slug>.md` page with `type: source` frontmatter. This establishes the provenance anchor for everything else. The source page includes:

- `title`, `source_type`, `url`, `author`, `publisher`, `date_published`, `date_ingested`
- `sources: []` (source pages cite themselves only)
- `status: active`, `confidence: 1.0`

### 3. Entity and Concept Extraction (Steps 2–6)

The agent extracts entities and concepts from the source. For each extracted item:

- Determines the topic folder it belongs to. Creates `wiki/<topic>/<topic>.md` (the folder note) if the folder does not exist.
- Searches the wiki for an existing page on this entity/concept.
- **Updates existing pages rather than creating duplicates** (the Entity Distribution Model). This is the DRY rule: one source rewrites many existing pages rather than spawning one summary.
- For new pages: places them in the topic folder, sets `parent` and `path` from the folder note's location, and authors the page from the template in `_templates/<type>.md` (both frontmatter and body section skeleton).

### 4. Provenance Updates (Steps 7–10)

On every page touched:

- Adds the new source to `sources:` as a wikilink to its `_sources/` summary page (never plain strings).
- Increments `update_count`.
- Sets `updated:` to today's date.
- Updates `confidence`: reinforced if the source confirms existing claims, weakened if it contradicts.

### 5. Index and Log Updates (Steps 11–13)

- Updates relevant folder notes: adds new pages to `children`, adds new subfolder notes to `child_indexes` — both as quoted wikilink values.
- Updates `wiki/index.md` with any new pages.
- Appends to `wiki/log.md`: `## [YYYY-MM-DD] ingest | Source Title`

### 6. Post-snapshot

```bash
bash scripts/engine.sh snapshot post --target <vault> --label "ingest: Source Title"
```

Creates a `snapshot: post-ingest` commit. All wiki changes are now in a named, revertible commit.

## SubagentStop Gate

When the ingest agent returns, the `subagent-ingest-gate.sh` hook fires automatically (wired in `hooks/hooks.json`). It runs `verify-ingest.sh` against the vault. If any ERROR-level findings are present (dangling links, missing required frontmatter, folder note drift), the hook exits non-zero and surfaces the problems to the orchestrator session. The orchestrator can then dispatch the [[curator-agent|Curator Agent]] to repair the issues.

## Polish Tail Step

After a successful ingest, the [[orchestrator-agent|Orchestrator Agent]] fans out the [[polish-agent|Polish Agent]] to:

1. Apply graph colors for any new top-level topic folders.
2. Regenerate `wiki/index.md` from per-folder folder notes with current page counts.
3. Reconcile every folder note's `children`/`child_indexes` against actual filesystem siblings.

The polish agent runs in parallel with the final-report compose step, so ingest success is reported immediately and polish runs concurrently.

## Recursive Enumeration Fix (ADR-0024)

Previously, the ingest agent enumerated `raw/` with a top-level glob (`raw/*.md`), which missed sources wired into nested subdirectories (`raw/wired/<name>/`). The agent now reads pending sources from `engine.sh backlog --json` (`.pendingRaw[]`) — already recursive, `assets/`-excluded, and log/manifest-deduped. The bash fallback is `find` (recursive), never a top-level glob. This makes the Host-Project Intake flow work end-to-end.

## Parallel Extract (ADR-0026)

When `maintenance.maxParallelExtract > 1`, the ingest agent fans out read-only extract workers (`claude-wiki-pages-extract-worker-agent`, `tools: Read, Glob, Grep` only). Workers return a typed EXTRACT envelope; a **single sequential writer** owns all dedup, page creation, and `wiki/log.md` append. Output is byte-identical at `maxParallelExtract=1` (the default). See [[parallel-extract|Parallel Extract]] for the full contract.

## Durable-Memory Carve-Out (ADR-0010)

`raw/agent-sessions/` is the one sanctioned write channel inside `raw/`. The ingest agent may produce `raw/agent-sessions/<date>-session.md` files that record session context (decisions made, sources consulted, architectural notes) as `type: source` material for later ingest. The `protect-raw.sh` hook allows writes to this path specifically. The ingest agent treats these files as regular sources on subsequent runs.

## Invariants the Agent Enforces

- **No duplicates:** searches the wiki before creating any page. If a page exists, updates it.
- **No plain-string sources:** all `sources:` values use wikilink syntax.
- **Template skeleton:** new pages follow the body structure from `_templates/<type>.md` — not invented section headings.
- **Provenance on every page:** every touched page has at least one entry in `sources:`.
- **Folder note updated:** every folder that receives a new page gets its folder note's `children` list updated.

## Related

- [[orchestrator-agent|Orchestrator Agent]] — dispatches to this agent when pending sources exist
- [[curator-agent|Curator Agent]] — runs after ingest (or is dispatched for lint-fix separately)
- [[polish-agent|Polish Agent]] — runs as tail step after ingest completes
- Ingest Pipeline — the conceptual 13-step workflow this agent implements
- Entity Distribution Model — the DRY update-not-duplicate rule
- [[git-checkpoint|Git Checkpoint]] — snapshot pre/post wraps the write phase
