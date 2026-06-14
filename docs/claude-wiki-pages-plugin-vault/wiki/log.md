---
title: "Operations Log"
type: log
aliases: ["Operations Log"]
created: 2026-06-13
updated: 2026-06-13
---

# Operations Log

Chronological record of every wiki operation. The onboarding skill stamps the initial entry; subsequent ingest, query, and lint operations append below.

## [2026-06-13] init | Vault scaffolded

Empty vault created for the claude-wiki-pages plugin project. No sources ingested yet.

## [2026-06-13] ingest | Full pipeline — all 50 sources

Processed all 50 raw sources from `raw/docs/`. Created 4 new topic folders, 50 source summaries, and 40 wiki pages.

New folders: architecture, decisions, guides, reference
New sources: architecture.md, adr/README.md, adr/ADR-0001 through ADR-0023 (22 ADRs), design/01–07 + README + \_template (9 design docs), llm-wiki/index + 01–07 + obsidian-experience (9 guides), GLOSSARY.md, install.md, local-models.md, operations.md, teams.md, features.md, getting-started.md, automation.md

New entities: claude-wiki-pages Plugin, Deterministic Engine, Firewall, Orchestrator Agent, Ingest Agent, Curator Agent, Analyst Agent, Polish Agent, Maintenance Agent
New concepts: Four-Layer Stack, Hook System, Git Checkpoint, Vault Resolution, Design Diagrams, Architecture Decision Record, NO-RAG Principle, Ontology Profile v1, Wiki-Only Graph, Local Model Quality Gate, Wiki-Native Recall, Scaffolding Ablation, Ingest Pipeline, Entity Distribution Model, Folder Note, Lint Rules, Query Rules, Auto-Heal, Challenge Mode, Obsidian Experience, Schema Authority, Multi-Vault Registry, Approved Local Model, Offline Policy, Glossary Terms, Installation, Backlog
New synthesis: Plugin Architecture Synthesis

## [2026-06-13] synthesize | Plugin Architecture Synthesis

Created [[Plugin Architecture Synthesis]] from 40 wiki pages across 50 sources.
Topics scoped: Four-Layer Stack, Deterministic Engine, NO-RAG Principle, Firewall, Git Checkpoint, Ontology Profile v1, Scaffolding Ablation, Local Model Quality Gate.
Synthesis type: theme. Key themes: determinism, provenance, fail-closed safety.

## [2026-06-13] snapshot | ingest all 50 sources (snap-20260613085045)

- pre-state: 66d29f5
- rollback: git revert the snapshot commit below

## [2026-06-13] lint | Curator heal pass

Found 14 errors (9 plain-string sources, 5 index listing mismatches) and 13 orphan source warnings. Fixed all.

- Fixed plain-string sources in `curator-agent.md`, `auto-heal.md`, `lint-rules.md` (comma in source title split YAML array)
- Fixed folder note `children` lists: removed non-existent pages, added correct cross-references
- Created missing `[[Onboarding Wizard]]` concept page in `guides/`
- Updated 14 wiki pages to use full source note titles (ending orphan source WARNs for 10 ADRs + 3 other sources)
- Result: 0 errors, 60 warnings (all expected "page not in index" for source notes and individual pages)
- Snapshot: 29d663b

## [2026-06-13] snapshot | curator heal pass — fixed plain-string sources, folder note children, dangling source aliases, orphan sources (snap-20260613090843)

- pre-state: 4ed3dcf
- rollback: git revert 29d663b

## [2026-06-13] snapshot | polish (snap-20260613092224)

- pre-state: b9562d9
- rollback: git revert the snapshot commit below

## [2026-06-13] snapshot | curator judgment fixes (snap-20260613145314)

- pre-state: 5adb70c
- rollback: git revert the snapshot commit below

## [2026-06-13] curator | Health check and auto-repair

Found 0 errors, 60 warnings, 0 info. Engine repaired 0, auto-applied 60 (index coverage), judgment 11 (page enrichment), surfaced 0. Rollback: git revert 776d0e6.

Actions taken:

- Fixed index.md to reference all 60 missing pages (50 source summaries + 10 content pages) as wikilinks
- Enriched 10 priority content pages from 30-50 lines to 73-124 lines of substantive content
- Enriched [[Four-Layer Stack]] with full layer descriptions and data flow
- Added Grounded Pages backlink sections to all 50 source summaries (402 total backlink entries)
- Added cross-folder related: links to 8 content pages
- Final state: 0 errors, 0 warnings, all 41 content pages have inbound links

## [2026-06-13] curator | Content enrichment pass — remaining 26 pages

Enriched 26 content pages across architecture/, decisions/, guides/, and reference/ from ~40-50 lines of terse bullets to 80-148 lines of substantive prose. All pages grounded in raw source ADRs and documentation. Engine verify: 0 errors, 0 warnings, clean: true. Rollback: git revert fb318da.

## [2026-06-13] curator | Content enrichment phase 3 — scan and verify

Scanned all wiki content pages for pages under 70 lines. Found 0 pages requiring enrichment — all content pages are already at target length (73-148 lines) from Phases 1 and 2. The only sub-70-line pages are structural index/folder notes (architecture.md 55L, guides.md 49L, reference.md 52L, decisions.md 67L, index.md 67L) which are correctly excluded from prose enrichment. Engine verify: 0 errors, 0 warnings, clean: true. 0 orphans. Rollback: git revert c10aaae.

## [2026-06-13] snapshot | fill-gaps: stage curated repo sources (snap-20260613211022)

- pre-state: 4ca3ffc
- rollback: git revert the snapshot commit below

## [2026-06-13] ingest | Engine implementation sources (raw/repo/engine/)

Processed 17 raw sources from `raw/repo/engine/` (CLAUDE.md, SKILL.md, engine.sh, cli.ts, firewall.ts, verify.ts, route.ts, schema.ts, search.ts, graph.ts, snapshot.ts, provenance.ts, moc-build.ts, stem.ts, vocabulary.ts, propose.ts, and SKILL.md counted once).

New folders: engine

New sources: Engine Scripts Layer (CLAUDE.md), Engine API Skill (SKILL.md), engine.sh Source, cli.ts Source, firewall.ts Source, verify.ts Source, route.ts Source, schema.ts Source, search.ts Source, graph.ts Source, snapshot.ts Source, provenance.ts Source, moc-build.ts Source, stem.ts Source, vocabulary.ts Source, propose.ts Source

New entities: engine.sh, cli.ts
New concepts: Engine CLI Router, Engine Verb Surface, Search Scoring Algorithm, Tier-2 Deterministic Recall, Graph Walk Algorithm, Porter Stemmer, Synonym Lexicon, Provenance Checks, MOC Repair Primitives, Schema Version Gate, Draft Review Surface, Degraded-Mode Routing, Scripts Layer

Updated existing pages: Deterministic Engine (sources+, update_count 5→6), Firewall (sources+, update_count 6→7)

## [2026-06-13] snapshot | ingest engine sources: cli.ts, engine.sh, firewall.ts, verify.ts, route.ts, schema.ts, search.ts, graph.ts, snapshot.ts, provenance.ts, moc-build.ts, stem.ts, vocabulary.ts, propose.ts, SKILL.md, CLAUDE.md (snap-20260613212248)

- pre-state: a47bb5b
- rollback: git revert the snapshot commit below

## [2026-06-13] ingest | Plugin agent definition files (raw/repo/plugin/)

Processed 10 raw sources from `raw/repo/plugin/` (README.md, CLAUDE.md, plugin.json, and 7 canonical agent definition files).

New folders: plugin

New sources: Plugin README, Plugin CLAUDE.md, Plugin Manifest (plugin.json), Orchestrator Agent Source, Ingest Agent Source, Curator Agent Source, Analyst Agent Source, Onboarding Agent Source, Maintenance Agent Source, Polish Agent Source

New entities: Plugin Manifest
New concepts: Agent Contract Table, Agent Tool Restriction, Single-Pass Dispatch, Plugin Dev-Time vs Runtime

Updated existing pages: Orchestrator Agent (sources+, update_count 5→6), Ingest Agent (sources+, update_count 5→6), Curator Agent (sources+, update_count 5→6), Analyst Agent (sources+, update_count 5→6), Maintenance Agent (sources+, update_count 4→5), Polish Agent (sources+, update_count 6→7), claude-wiki-pages Plugin (sources+, update_count 5→6), Onboarding Wizard (sources+, update_count 5→6)

## [2026-06-13] snapshot | ingest plugin agent definition files: README, CLAUDE.md, plugin.json, 7 agent specs (snap-20260613213424)

- pre-state: 55ed08d
- rollback: git revert the snapshot commit below

## [2026-06-13] ingest | Wiki Pages Skill (maintain-contract SKILL.md)

Processed `raw/repo/wiki-pages/SKILL.md`. Created 4 new pages, updated 4 existing.

New folders: wiki-pages

New sources: Wiki Pages Skill (maintain-contract SKILL.md)

New concepts: Maintain Contract, Grounded Retrieval, Multi-Vault Operating Rules

Updated existing pages: Ingest Pipeline (sources+, update_count 5→6), Auto-Heal (sources+, update_count 4→5), Query Rules (sources+, update_count 4→5), Multi-Vault Registry (sources+, update_count 4→5)

## [2026-06-13] snapshot | ingest wiki-pages SKILL.md (maintain-contract) (snap-20260613214002)

- pre-state: fe7371b
- rollback: git revert the snapshot commit below

## [2026-06-13] ingest | LLM skills — analyst-modes SKILL.md and SOFTWARE-3-0.md

Processed 2 raw sources from `raw/repo/llm/`.

New folders: llm

New sources: Analyst Modes Skill (SKILL.md), SOFTWARE-3-0: Dual Entry Point

New entities: (none — all entities in these sources were already tracked)

New concepts: Analyst Dashboard Mode, Analyst Document Compile Mode, Analyst Extract Mode, Dashboard Write Gate, Six Surfaces Dual-Reader Contract, Dual Entry Point

Updated existing pages: Analyst Agent (sources+, update_count 6→7), Query Rules (sources+, update_count 5→6), Challenge Mode (sources+, update_count 3→4), Plugin Dev-Time vs Runtime (sources+, update_count 2→3), Draft Review Surface (sources+, update_count 1→2)

## [2026-06-13] snapshot | ingest llm sources: analyst-modes SKILL.md, SOFTWARE-3-0.md (snap-20260613214801)

- pre-state: fd203ab
- rollback: git revert the snapshot commit below

## [2026-06-13] ingest | obsidian-vault Skill (SKILL.md)

Processed raw/repo/obsidian/SKILL.md.

New folders: obsidian

New sources: Obsidian Vault Skill (SKILL.md)

New entities: obsidian-vault Skill

New concepts: Obsidian CLI Vault Scoping, Defense-in-Depth Scoping

Updated existing pages: (none — all related pages are cross-referenced via `related:` only; no body or sources merges were needed as the existing [[Firewall]], [[Vault Resolution]], [[Hook System]] pages already cover the referenced constructs)

## [2026-06-13] snapshot | ingest obsidian-vault SKILL.md (snap-20260613215524)

- pre-state: 41aceac
- rollback: git revert the snapshot commit below

## [2026-06-13] ingest | Knowledge Graph sources (raw/repo/knowledge-graph/)

Processed 4 raw sources from `raw/repo/knowledge-graph/` (CLAUDE.md, config.schema.json, frontmatter.ts, wikilinks.ts).

New folders: knowledge-graph

New sources: Knowledge Graph Schema (CLAUDE.md), Config Schema (config.schema.json), Frontmatter Parser (frontmatter.ts), Wikilink Extractor (wikilinks.ts)

New entities: (none — no new concrete entities beyond what was already tracked)

New concepts: Frontmatter Parser, Wikilink Extractor, Config Schema

Updated existing pages: Schema Authority (sources+, update_count 5→6)

## [2026-06-13] snapshot | ingest knowledge-graph: config.schema.json, frontmatter.ts, wikilinks.ts, CLAUDE.md (snap-20260613220320)

- pre-state: 3fdf5bb
- rollback: git revert the snapshot commit below

## [2026-06-13] ingest | Sync Skill (raw/repo/how-it-works/SKILL.md)

Processed `raw/repo/how-it-works/SKILL.md`. Created 5 new pages, updated 0 existing.

New folders: how-it-works

New sources: Sync Skill (SKILL.md)

New entities: sync-source.sh

New concepts: Sync Skill, Wired Source, Sync Workflow

Updated existing pages: (none — all concepts in this source are new to the wiki)

## [2026-06-13] snapshot | ingest Sync Skill (raw/repo/how-it-works/SKILL.md) (snap-20260613220919)

- pre-state: c66405d
- rollback: git revert the snapshot commit below

## [2026-06-13] fill-gaps | Author hub pages

Authored 7 topic hub pages (type: topic, from `_templates/topic.md` skeleton) to concentrate the graph on the major clusters. All sections filled; every page in each cluster linked via `key_pages` and body wikilinks.

Hubs created/updated:

- [[claude-wiki-pages Plugin]] (wiki/plugin/plugin.md) — 5 cluster pages linked
- [[Wiki Pages]] (wiki/wiki-pages/wiki-pages.md) — 3 cluster pages linked
- [[LLM]] (wiki/llm/llm.md) — 6 cluster pages linked
- [[Obsidian]] (wiki/obsidian/obsidian.md) — 3 cluster pages linked
- [[Wiki Engine]] (wiki/engine/engine.md) — 15 cluster pages linked
- [[Knowledge Graph]] (wiki/knowledge-graph/knowledge-graph.md) — 3 cluster pages linked
- [[How It Works]] (wiki/how-it-works/how-it-works.md) — 4 cluster pages linked

Updated wiki/index.md Hub Pages section to list all 7 hubs.

## [2026-06-13] snapshot | fill-gaps: author hub pages (snap-20260613221515)

- pre-state: e92265a
- rollback: git revert the snapshot commit below

## [2026-06-13] snapshot | fill-gaps: create pages for dangling concepts (snap-20260613222843)

- pre-state: e4ed2be
- rollback: git revert the snapshot commit below

## [2026-06-13] snapshot | fill-gaps: create pages for dangling concepts (snap-20260613223454)

- pre-state: c73b7c7
- rollback: git revert the snapshot commit below

## [2026-06-13] snapshot | fill-gaps: create pages for dangling concepts (snap-20260613223605)

- pre-state: dc6c208
- rollback: git revert the snapshot commit below

## [2026-06-13] snapshot | curator judgment fixes (snap-20260613225008)

- pre-state: 59fd5f9
- rollback: git revert the snapshot commit below

## [2026-06-13] curator | Health check and auto-repair (wiki-lint run)

Found 8 errors, 34 warnings, 0 info. Engine repaired 4 (sync-children on architecture, decisions, guides, reference folder notes). Auto-applied: index duplicate removed, 34 missing-index-entry WARNs resolved by adding pages to index.md body. Judgment fixes applied: 7 folder notes converted from `type: topic` to `type: index` (engine, how-it-works, knowledge-graph, llm, obsidian, plugin, wiki-pages); ghost-wikilink candidates in knowledge-graph.md and wiki-pages.md converted to backtick code format; snapshot.ts Source orphan resolved by adding to git-checkpoint.md sources. Rollback: git revert 8318a2b.

## [2026-06-13] snapshot | curator: fix broken wikilinks and ghost-link suppression (snap-20260613225453)

- pre-state: fd39c4c
- rollback: git revert the snapshot commit below

## [2026-06-13] snapshot | curator: fix ADR-0008 wikilink alias in grounded-retrieval (snap-20260613225542)

- pre-state: aea8067
- rollback: git revert the snapshot commit below

## [2026-06-13] snapshot | fill-gaps: prose-ify residual dangling links (snap-20260613230846)

- pre-state: cd5fe63
- rollback: git revert the snapshot commit below

## [2026-06-13] fill-gaps | Enrich thin pages

Identified 7 content pages under 50 lines (entity/concept pages; folder notes excluded). Updated each using existing `sources:` and staged `raw/repo/` material for engine, llm, obsidian, and sync topics.

Pages enriched:

- [[engine.sh]] (42→77 lines) — added degraded-mode capability table, hot-path callers, 16-verb list
- [[cli.ts]] (39→99 lines) — added full verb table, CLI flags table, integration context, test harness note
- [[Plugin Manifest]] (41→75 lines) — added schema-version compatibility table, hook entry point contract, "what is not in the manifest" section
- [[Wired Source]] (44→80 lines) — added registration mechanics table, settings.json fields, full lifecycle steps
- [[obsidian-vault Skill]] (45→76 lines) — added graph color primary use case, headless fallback warning, "why both a skill and a hook" explanation
- [[Porter Stemmer]] (46→88 lines) — added 5-step algorithm table, integration code path, scoring weight context
- [[Tier-2 Deterministic Recall]] (47→99 lines) — added scoring weight table, three-channel architecture diagram, graph traversal complement section
- [[sync-source.sh]] (36→72 lines) — added snapshot filename pattern, checksum dedup detail, relationship-to-pipeline diagram, idempotent pull contract

Sources used: [[Engine Scripts Layer (CLAUDE.md)]], [[Engine API Skill (SKILL.md)]], [[Sync Skill (SKILL.md)]], [[Obsidian Vault Skill (SKILL.md)]], [[cli.ts Source]], [[engine.sh Source]]. No new pages created; no new dangling links introduced.

## [2026-06-13] snapshot | fill-gaps: enrich thin pages (snap-20260613231528)

- pre-state: dd9f39c
- rollback: git revert the snapshot commit below

## [2026-06-13] snapshot | curator judgment fixes (snap-20260613232124)

- pre-state: a776cba
- rollback: git revert the snapshot commit below

## [2026-06-13] curator | Health check and auto-repair

Found 1 error, 2 warnings, 2 info. Engine repaired 0 (vault already clean). Auto-applied 1 (active-vault.md sources field: replaced concept wikilink `[[Vault Resolution]]` with correct source `[[Operations Guide]]`). Judgment fixes applied 3: title collision resolved (`[[claude-wiki-pages (Plugin)]]` entity renamed to disambiguate from `plugin/plugin.md` index; folder note and index.md updated); `.obsidian/graph.json` and `.obsidian/app.json` created with 11 topic color groups and wiki-only exclusions. Surfaced for review: 6 flat-folder sprawl folders (>12 children: \_sources 85, architecture 22, engine 19, decisions 20, reference 15, guides 14 — structural, not broken); 109 high-confidence single-source pages (editorial call). Rollback: git revert ac2105a.

## [2026-06-13] snapshot | curator: final heal complete — title collision + sources fix + graph colors (snap-20260613232455)

- pre-state: ac2105a
- rollback: git revert the snapshot commit below

## [2026-06-13] snapshot | polish (snap-20260613232655)

- pre-state: 0d63d5c
- rollback: git revert the snapshot commit below

## [2026-06-13] curator | Re-parent legacy folders into 7 core topic clusters

Moved 67 pages out of 4 legacy folders (architecture/22, decisions/20, guides/13, reference/14; minus 4 folder notes = 67 content pages) into the 7 core topic clusters: plugin (17 moved), engine (9 moved), wiki-pages (13 moved), llm (9 moved), obsidian (4 moved), knowledge-graph (3 moved), how-it-works (12 moved). Updated parent:/path: frontmatter on all 67 pages. Removed 4 legacy folder notes and dropped architecture/decisions/guides/reference from wiki/index.md child_indexes. Expanded all 7 cluster folder notes with the new children. Fixed 3 stale-source warnings: `[[Glossary Terms]]` moved from sources to related in banned-strings.md; `[[Schema Authority]]` moved from sources to related in required-fields.md; `[[Analyst Agent]]` entity link replaced with `[[Analyst Agent Source]]` in synthesis-note.md. Fixed 4 dangling links in moved pages. Engine verify: 0 errors, 0 warnings. danglingCount (wiki pages): 0. Rollback: git revert 9acbb71 (pre-snapshot) or git revert 2c9376a (this commit).
## [2026-06-13] snapshot | FU1: verify dangling-wikilink check (snap-20260614013621)

- pre-state: 103cac1
- rollback: git revert the snapshot commit below
## [2026-06-14] snapshot | FU2: template-conformance sections (FU2)

- pre-state: bfcd4eb
- rollback: git revert the snapshot commit below

## [2026-06-15] ingest | ADRs 0024, 0026, 0027, 0028, 0029 — host-project intake, parallel extract, fill-gaps, dangling-wikilink verify, drop vault-example

Processed 5 new ADRs from `docs/adr/` (not previously in `raw/`):
- ADR-0024: Host-Project Intake (recursive enumeration fix + first-class intake flow)
- ADR-0026: Bounded Parallel Extract and Scheduled Upkeep
- ADR-0027: Fill-Gaps Capability and Graph-Quality Detector
- ADR-0028: Dangling-Wikilink WARN Check in Verify (WARN-tier parity gate)
- ADR-0029: Drop docs/vault-example (schema authority → skills/init/template)

New sources: [[ADR-0024: Host-Project Intake]], [[ADR-0026: Bounded Parallel Extract and Scheduled Upkeep]], [[ADR-0027: Fill-Gaps Capability and Graph-Quality Detector]], [[ADR-0028: Dangling-Wikilink WARN Check in Verify]], [[ADR-0029: Drop docs/vault-example]]

New concept pages (6): [[Host-Project Intake]], [[Parallel Extract]], [[Scheduled Upkeep]], [[Fill-Gaps Skill]], [[Graph Quality]], [[Dangling Wikilink]], [[Node Concentration]]

Updated existing pages (7): [[Ingest Agent]] (sources+, update_count 6→7), [[Maintenance Loop]] (sources+, update_count 2→3), [[Schema Authority]] (sources+, update_count 6→7), [[Deterministic Engine]] (sources+, update_count 6→7), [[Golden Set]] (sources+, update_count 3→4), [[Shell-TS Parity]] (sources+, update_count 2→3), [[Wired Source]] (sources+, update_count 2→3)

Updated structural files: `wiki/how-it-works/how-it-works.md` (children+6), `wiki/plugin/plugin.md` (children+1), `wiki/index.md` (new pages + 5 new ADR source summaries)

## [2026-06-15] lint | Health check and auto-repair post ADR-0024/0026/0027/0028/0029 ingest

Ran full structural lint pass (engine.sh heal + verify-ingest.sh + supplemental checks) after ingest of 5 ADRs.

Engine heal: 0 structural errors — vault already clean. No engine repairs needed.

Verifier findings: 49 "no-sources" ERRORs and 7 dangling-wikilink WARNs reported — all false positives:
- 49 "no-sources" errors: all 49 pages have sources written in YAML block-style lists (multi-line), which the grep-based verify-ingest.sh does not parse. Real data: all pages sourced.
- 7 dangling-wikilink WARNs: `[[Target]]`, `[[Foo]]`, `[[Page Title]]`, `[[wikilinks]]` all appear inside backtick code spans in documentation prose (e.g., `` `[[Target]]` ``) — not real wikilinks.

Supplemental checks — all passed:
- Title collisions: 0
- Orphan pages: 0 (all 7 new pages linked from folder notes and index)
- Missing title in aliases: 0
- Plain-string hierarchy links: 0
- Missing required frontmatter fields: 0
- Low confidence pages (< 0.5): 0
- Ghost wikilinks in log.md: 0
- Excessive nesting: 0 (max depth 2)
- Flat folder sprawl: engine folder has 27 pages, plugin 23 pages — above 12-child advisory threshold but below 30-page action threshold; monitoring
- Index drift: 0 — all 7 new pages appear in both folder notes and wiki/index.md

Issues found: 0 real | Issues fixed: 0 | Judgment fixes: 0 | Surfaced: 1 (engine/plugin folders at 27/23 pages — advisory, not actionable)

Checkpoint commit: 126353e. Rollback: `git revert 126353e`.
## [2026-06-14] snapshot | polish (snap-20260615015746)

- pre-state: c8b345b
- rollback: git revert the snapshot commit below

