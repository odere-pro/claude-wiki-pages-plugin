---
title: "Operations Log"
type: log
aliases: ["Operations Log"]
created: 2026-04-24
updated: 2026-06-25
---

# Operations Log

Chronological record of every wiki operation. The onboarding skill stamps the initial entry; subsequent ingest, query, and lint operations append below.

## [2026-04-24] init | Vault scaffolded

Empty vault created from `skills/llm-wiki/template/`. No sources ingested yet.
## [2026-06-25] snapshot | stage whole repo (733 files) for from-scratch strict-tree rebuild (snap-20260625131423)

- pre-state: c1a62de
- rollback: git revert the snapshot commit below

## [2026-06-25] ingest | claude-wiki-pages agents (8 sources)

Processed 8 agent definition files from raw/repo/agents/. Created 9 new wiki pages, 0 updated.
New folders: agents
New entities: Orchestrator Agent, Ingest Agent, Curator Agent, Analyst Agent, Extract Worker Agent, Maintenance Agent, Onboarding Agent, Polish Agent
New concepts: Specialist Dispatch Pattern

## [2026-06-25] ingest | claude-wiki-pages commands (4 sources)

Processed 4 command definition files from raw/repo/commands/. Created 4 new wiki pages, 0 updated.
New folders: commands
New entities: Wiki Command, Doctor Command, Onboarding Command, Fill-Gaps Command

## [2026-06-25] ingest | claude-wiki-pages hooks (1 source)

Processed hooks.json from raw/repo/hooks/. Created 3 new wiki pages, 0 updated.
New folders: hooks
New entities: Hooks Configuration
New concepts: Write-Path Firewall, Commit Backstop

## [2026-06-25] ingest | claude-wiki-pages rules (4 sources)

Processed 4 rule files from raw/repo/rules/. Created 3 new wiki pages, 0 updated.
New folders: rules
New concepts: Path-Scoped Rules, Raw Immutability, Wiki Page Format

## [2026-06-25] ingest | claude-wiki-pages schemas (2 sources)

Processed 2 schema files from raw/repo/schemas/. Created 2 new wiki pages, 0 updated.
New folders: schemas
New concepts: Plugin Config Schema, Config Sections

## [2026-06-25] ingest | claude-wiki-pages templates (1 source)

Processed 1 template file from raw/repo/templates/. Created 1 new wiki page, 0 updated.
New folders: templates
New concepts: Default Config

## [2026-06-25] ingest | claude-wiki-pages site (4 sources)

Processed 4 site files from raw/repo/site/. Created 1 new wiki page, 0 updated.
New folders: site
New entities: GitHub Pages Site

## [2026-06-25] ingest | claude-wiki-pages root (17 sources)

Processed 17 root files from raw/repo/root/. Created 6 new wiki pages, 0 updated.
New folders: root
New entities: NPM Package
New concepts: Plugin Overview, Security Model, Dev Tooling, Contributing and Governance, Release History

## [2026-06-25] ingest | claude-wiki-pages skills (25 sources)

Processed 25 skill definition files from raw/repo/skills/. Created 27 new wiki pages, 0 updated.
New folders: skills
New entities: Init Skill, Ingest Skill, Query Skill, Lint Skill, Fix Skill, Status Skill, Synthesize Skill, Search Skill, Review Skill, Draft Skill, Engine API Skill, Maintain Contract Skill, Onboarding Skill, Fill Gaps Skill, Ingest Pipeline Skill, Analyst Modes Skill, Curator Fixes Skill, Voice Skill, Obsidian Vault Skill, Obsidian CLI Skill, Markdown Skill, Index Skill, Sync Skill, Obsidian Graph Colors Skill, Obsidian Markdown Skill
New concepts: Single-Responsibility Skill Pattern
Backlog: 1 skill unprocessed (obsidian-bases)

## [2026-06-25] ingest | claude-wiki-pages docs (25 sources)

Processed 25 documentation files from raw/repo/docs/. Created 26 new wiki pages, 0 updated.
New folders: docs, docs/adrs
New entities: ADR-0001 (Four-Layer Orchestrator), ADR-0004 (Ontology Profile v1), ADR-0007 (Wiki-Native Recall), ADR-0018 (Offline Policy), ADR-0022 (Folder Notes v3), ADR-0026 (Parallel Extract), ADR-0033 (Topic-Local Linking), ADR-0034 (Bun Required), ADR-0035 (Deterministic Obsidian), ADR-0036 (Strict-Tree Topology)
New concepts: Four-Layer Architecture, Canonical Glossary, Research Foundations, Operations Reference, Local Model Support, Getting Started Guide, Installation Guide, Features Overview, Vault Automation, Agent Teams, NO-RAG Stance, Ontology Profile, Strict Tree Topology, Scaffolding Ablation, User Guide Workflow
New sources: docs-architecture, docs-glossary, docs-research-foundations, docs-operations, docs-local-models, docs-getting-started, docs-install, docs-features, docs-automation, docs-teams, docs-adr-0001, docs-adr-0004, docs-adr-0007, docs-adr-0018, docs-adr-0022, docs-adr-0026, docs-adr-0033, docs-adr-0034, docs-adr-0035, docs-adr-0036, docs-design-system-context, docs-design-component, docs-design-ontology, docs-llm-wiki-index, docs-llm-wiki-getting-started
Backlog: 39 of 64 files remain unprocessed (ADR-0002/0003/0005/0006/0008–0017/0019–0021/0023–0025/0027–0032/0037+; design/03–06/08–09; llm-wiki/02–07)

## [2026-06-25] ingest | claude-wiki-pages scripts (25 sources)

Processed 25 script files from raw/repo/scripts/. Created 14 new wiki pages (9 entity, 5 concept), 0 updated.
New folders: scripts
New entities: engine.sh, resolve-vault.sh, firewall.sh, verify-ingest.sh, session-start.sh, snapshot.sh, graph-quality.sh, strict-tree-reduce.sh, doctor.sh
New concepts: Fail-Closed Security Pattern, Bash-to-Bun Wrapper Pattern, Four-Tier Vault Resolution, TypeScript Utility Scripts, Validation and Lint Scripts
New sources: scripts-engine-sh, scripts-resolve-vault-sh, scripts-firewall-sh, scripts-verify-ingest-sh, scripts-graph-quality-sh, scripts-strict-tree-reduce-sh, scripts-check-wikilinks-sh, scripts-scope-guard-sh, scripts-protect-raw-sh, scripts-session-start-sh, scripts-heartbeat-sh, scripts-doctor-sh, scripts-validate-docs-sh, scripts-validate-frontmatter-sh, scripts-check-duplicate-claims-sh, scripts-enforce-dmi-sh, scripts-enforce-must-rule-sh, scripts-apply-obsidian-config-sh, scripts-snapshot-sh, scripts-lint-structural-sh, scripts-set-vault-sh, scripts-strict-tree-reduce-ts, scripts-disambiguate-collisions-ts, scripts-declutter-source-outlinks-ts, scripts-migrate-piped-links-ts
Backlog: 57 of 82 scripts remain unprocessed (heartbeat.sh, protect-raw.sh, check-wikilinks.sh, scope-guard.sh, apply-obsidian-config.sh/.ts, set-vault.sh, validate-docs.sh, validate-frontmatter.sh, check-duplicate-claims.sh, enforce-dmi.sh, enforce-must-rule.sh, lint-structural.sh, heal-ghost-links.sh/.ts, scaffold-vault.sh, graph-quality.ts, disambiguate-collisions.ts, declutter-source-outlinks.ts, migrate-piped-links.ts, eval-*, lib-*, subagent-gate scripts, and others)
## [2026-06-25] snapshot | reduce to docs-only: strip non-docs topics + raw (snap-20260625143328)

- pre-state: bd0d729
- rollback: git revert the snapshot commit below

