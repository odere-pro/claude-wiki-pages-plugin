---
title: "Ingest Pipeline"
type: concept
aliases: ["ingest pipeline", "ingest process", "ingest agent", "wiki ingest", "four-step pipeline"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]", "[[docs-architecture|Four-Layer Architecture]]", "[[docs-adr-0026|ADR-0026]]"]
related: []
tags: ["docs", "ingest", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.95
derived: false
proposed_by: "claude"
---

# Ingest Pipeline

The four-step sequence — Ingest, Auto-heal, Optimize (opt-in), Synthesize — that takes raw source files through extraction, page writing, structural repair, and cross-topic synthesis into the wiki.

## Definition

The ingest pipeline is the primary write workflow of the plugin, executed by the `claude-wiki-pages-ingest-agent`. It processes one or more files from `raw/` and produces typed wiki pages in `wiki/`, repairing structural issues, and optionally synthesizing cross-topic notes. The pipeline is invoked by the orchestrator when the engine `backlog` command reports unprocessed sources.

The four steps are:

1. **Step 1 — Ingest.** Read each unprocessed source file from `raw/`. Extract entities, concepts, and claims. Write source summaries to `wiki/_sources/`. Plan the topic tree (externalized to a plan file; requires approval at a confirmation gate before any page is written). Write or update typed wiki pages and folder notes per the approved plan. Append to `wiki/log.md`. Commit the writes via `snapshot.sh post`.

2. **Step 2 — Auto-heal.** Delegate to the `claude-wiki-pages-curator-agent` which runs `engine heal` (deterministic structural repair) followed by judgment fixes. Fully automatic — no approval prompt because every change is git-checkpointed and revertible with `git revert`. Bounded by the retry cap (at most two curator runs per pipeline).

3. **Step 3 — Optimize (opt-in, destructive).** Audit folders exceeding the 12-direct-children threshold; write a restructure plan; require explicit user confirmation before executing `git mv` + frontmatter rewrite. Only runs when the user explicitly approves; skipped if no folder exceeds the threshold.

4. **Step 4 — Synthesize.** Identify 1–2 highest-value cross-topic candidates for synthesis notes. Write to `wiki/_synthesis/` using the `synthesis` frontmatter schema. Update the vault MOC and log.

## Key Principles

**Confirmation gate before any page write.** Step 1.4 externalizes the topic-tree plan to `vault/output/_pipeline-plan-YYYY-MM-DD.md` and stops for approval (approve / edit-then-approve / abort) before writing a single wiki page. This gate prevents an unchecked pipeline from writing pages in the wrong topic structure, which would cascade into every page's `parent:` and `path:` fields.

**Parallel extract is opt-in.** By default (`maxParallelExtract: 1`), extraction runs sequentially — the byte-identical-to-baseline mode. When `maxParallelExtract > 1`, the ingest agent fans out to extract worker subagents (read-only; `tools: Read, Glob, Grep`) in parallel, collects their EXTRACT envelopes, then writes pages serially. The write barrier (H10) requires all workers to respond before any Write call.

**Source budget per run.** A single pipeline run processes at most 25 unprocessed sources. If more exist, the first 25 are processed alphabetically and the remainder appear as backlog in the final report. This bounds context usage and ensures the plan gate is manageable.

**git-checkpointed throughout.** `snapshot.sh pre` takes a pre-ingest checkpoint before any writes. `snapshot.sh post` after Step 1 commits the ingest writes. The curator (Step 2) takes its own heal checkpoint. Each phase's writes land in a separate, individually revertible commit.

**`raw/` is never modified.** The `protect-raw.sh` hook and firewall `denyPaths` block any write to `raw/`. Source files are read as data; the pipeline never alters them.

## Examples

A user drops three PDFs into `raw/papers/`. Running `/claude-wiki-pages:wiki` triggers the orchestrator, which detects three pending sources via `engine backlog`, fires the ingest agent, which reads and extracts each paper, writes a plan to `vault/output/_pipeline-plan-2026-06-25.md`, presents the plan for approval, and on approval writes twelve concept pages, one entity page, three source summaries, and two updated folder notes — then runs the curator for auto-heal, and finally writes one synthesis note.

The plan gate presents: "Proposed: 3 new pages in agents/, 5 new pages in retrieval/, 4 updated pages in architecture/. Approve / edit-then-approve / abort." The user approves and the pipeline executes the plan verbatim.

## Related Concepts

The ingest pipeline is implemented by the `claude-wiki-pages-ingest-agent`. It depends on the engine `backlog` command (to identify pending sources), the EXTRACT envelope (the typed content structure extract workers return), the confirmation gate (Step 1.4), the curator (Step 2), and the snapshot mechanism (git checkpointing). The `backlog`, `heartbeat`, and `maintenance` concepts govern when the pipeline is triggered.
---
