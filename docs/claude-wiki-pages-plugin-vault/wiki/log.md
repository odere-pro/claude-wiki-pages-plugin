---
title: "Operations Log"
type: log
aliases: ["Operations Log"]
created: 2026-04-24
updated: 2026-06-12
---

# Operations Log

Chronological record of every wiki operation. The onboarding skill stamps the initial entry; subsequent ingest, query, and lint operations append below.

## [2026-04-24] init | Vault scaffolded

Empty vault created from `skills/llm-wiki/template/`. No sources ingested yet.

## [2026-06-12] ingest | Full ingest — 39 sources → 61 wiki pages

- **Agent**: `claude-wiki-pages-ingest-agent`
- **Sources processed**: 39
  - `raw/architecture.md`, `raw/GLOSSARY.md`, `raw/operations.md`, `raw/local-models.md`, `raw/automation.md`, `raw/features.md`
  - `raw/adr/ADR-0001` through `ADR-0020` (20 ADRs) + `raw/adr/README.md`
  - `raw/design/01-system-context.md` through `raw/design/06-feature-relations.md` (6 design files)
- **Wiki pages created**: 61 across 10 clusters
  - Architecture: 7 pages (four-layer-stack, data-layer, skills-layer, agents-layer, orchestration-layer, data-flow + cluster index)
  - Agents: 8 pages (agent-roles, orchestrator-agent, ingest-agent, curator-agent, analyst-agent, polish-agent, maintenance-agent, onboarding-agent + cluster index)
  - Skills: 4 pages (skill-catalog, action-skills, agent-teaching-skills, obsidian-skills + cluster index)
  - ADRs: 20 pages (one per ADR) + cluster index
  - Operations: 6 pages (operations-guide, vault-resolution, hook-system, multi-vault-registry, draft-review-gate, offline-degraded-mode + cluster index)
  - Local Models: 4 pages (local-model-quality-gate, approved-local-models, offline-policy, capability-tiers + cluster index)
  - Automation: 1 page (automation-guide + cluster index)
  - Features: 2 pages (feature-overview, scaffolding-ablation + cluster index)
  - Glossary: 1 page (canonical-terms + cluster index)
  - Design: 6 pages (system-context, component-design, sequence-diagrams, teams-and-agents, security-and-configuration, feature-relations + cluster index)
- **Synthesis notes**: 1 (`_synthesis/plugin-overview.md`)
- **Source stubs**: 8 (`_sources/` — architecture, GLOSSARY, operations, local-models, automation, features, adr-sources, design-sources)
- **`wiki/index.md` updated**: yes
- **Schema**: schema_version: 2, all pages pass validate-frontmatter contract

## [2026-06-12] lint
- Curator pass: 16 issues found, 16 fixed
- Clean: yes
- Issues resolved:
  - Removed broken `[[ADR Index]]` from adrs/_index.md children (1)
  - Fixed `[[Agent-Teaching Skills]]` → `[[Agent Teaching Skills]]` in skills/_index.md (2)
  - Fixed `[[Offline Degraded Mode]]` → `[[Offline and Degraded Mode]]` in operations/_index.md and body (2)
  - Fixed 5 broken links in wiki/index.md (ADR-0005, ADR-0010, ADR-0014, ADR-0016, Offline Degraded Mode, Plugin Overview) (6)
  - Fixed `[[ADR-0010 Durable Memory Carve-out]]` casing in operations/draft-review-gate.md sources (1)
  - Added aliases to _synthesis/plugin-overview.md so `[[Plugin Overview]]` resolves (1)
  - Removed conflicting aliases from agents/_index.md, architecture/_index.md, skills/_index.md (3)
## [2026-06-12] migrate | schema_version 2 → 3 (13 change(s))

- checkpoint: 4168023
- renamed 10 legacy _index.md to folder notes
- rollback: git revert the migrate commit below

