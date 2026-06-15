---
title: "LLM"
type: index
aliases: ["LLM", "llm", "LLM skills", "analyst modes", "llm-wiki skills", "LLM operating contract"]
parent: "[[index|Wiki Index]]"
path: "llm"
children:
  - "[[analyst-dashboard-mode|Analyst Dashboard Mode]]"
  - "[[analyst-document-compile-mode|Analyst Document Compile Mode]]"
  - "[[analyst-extract-mode|Analyst Extract Mode]]"
  - "[[dashboard-write-gate|Dashboard Write Gate]]"
  - "[[dual-entry-point|Dual Entry Point]]"
  - "[[six-surfaces-dual-reader|Six Surfaces Dual-Reader Contract]]"
  - "[[local-model-quality-gate|Local Model Quality Gate]]"
  - "[[no-rag-principle|NO-RAG Principle]]"
  - "[[llm/software-3-0|Software 3.0]]"
  - "[[verbatim-partition|Verbatim Partition]]"
  - "[[wiki-native-recall|Wiki-Native Recall]]"
  - "[[zero-fabrication-floor|Zero-Fabrication Floor]]"
  - "[[approved-local-model|Approved Local Model]]"
  - "[[capability-tier|Capability Tier]]"
  - "[[offline-policy|Offline Policy]]"
child_indexes: []
tags: ["llm", "analyst", "modes", "dual-reader"]
created: 2026-06-13
updated: 2026-06-13
---

# LLM

> [!summary]
> The LLM cluster covers two interrelated concerns: how the Analyst Agent operates on vault content (five modes, two write gates), and how the plugin's design ensures that every surface is equally usable by a human and an LLM agent (the [[six-surfaces-dual-reader|Six Surfaces Dual-Reader Contract]] enforced by [[dual-entry-point|Dual Entry Point]]). The analyst modes define what the LLM can produce from the wiki; the dual-reader contract defines what the LLM can read to understand the plugin itself.

## Overview

The LLM plays two roles in the claude-wiki-pages system:

1. **Analyst over vault content** — the LLM reads wiki pages and produces structured outputs: answers to questions (Mode 1), vault health dashboards (Mode 2), compiled documents (Mode 3), extracted data tables (Mode 4), and synthesis notes (Mode 5). Each mode is gated by an approval protocol and bounded by a page budget.

2. **Agent integrating with the plugin** — the LLM reads plugin surfaces (skills, ADRs, schemas) to understand what the plugin does and how to use it safely. The [[six-surfaces-dual-reader|Six Surfaces Dual-Reader Contract]] ensures every surface has both a human on-ramp and an agent on-ramp, enforced by a parity gate.

Write gates protect the wiki from unreviewed LLM output. The [[dashboard-write-gate|Dashboard Write Gate]] requires a plan-file approval before the analyst writes to `wiki/dashboard.md`. Static output to `vault/output/` is ungated, making exploratory output safe without cluttering the wiki.

## Key Pages

### Analyst Operating Modes

[[analyst-dashboard-mode|Analyst Dashboard Mode]] is Mode 2 of the five analyst modes. It generates a Dataview live dashboard or a static markdown snapshot of vault health. Six metric categories are computed: Coverage, Health, Evidence, Freshness, Connectivity, and Gaps. The write gate applies only to `wiki/dashboard.md`; static output to `vault/output/` is ungated.

[[analyst-document-compile-mode|Analyst Document Compile Mode]] is Mode 3. The analyst reconstructs a named document (ADR, report, memo, brief, runbook) from wiki pages into `vault/output/`. The mode reads relevant pages, synthesizes them into the target document format, and writes to `vault/output/<name>.md`. No write gate — output goes to the ungated scratch directory.

[[analyst-extract-mode|Analyst Extract Mode]] is Mode 4. The analyst reads wiki pages and extracts structured data (tables, lists, CSV) for export. Useful for generating a roster of all entities, a summary table of all ADRs, or a list of all concepts by confidence score.

### Write Gates

[[dashboard-write-gate|Dashboard Write Gate]] is the approval gate that governs writing to `wiki/dashboard.md`. The analyst writes a plan file, stops at the gate, and requires explicit approve/edit-then-approve/abort before proceeding. The gate prevents unreviewed content from entering the live wiki. Static output to `vault/output/` bypasses this gate.

### Entry Point and Authoring Contract

[[six-surfaces-dual-reader|Six Surfaces Dual-Reader Contract]] is the organizing principle of the `SOFTWARE-3-0.md` dual entry point. It maps six project surfaces (Docs, Tools, Design, System design, Context, Memory) to both a human on-ramp and an agent on-ramp. A row with only one on-ramp is a defect; the parity gate in `scripts/validate-docs.sh` enforces the invariant.

[[dual-entry-point|Dual Entry Point]] is the `SOFTWARE-3-0.md` file pattern: a single file that functions as front door for both a person browsing the repo and an agent loading the project as session context. The file links without restating — it is a map, not a summary.

## Open Questions

- Mode 5 (Synthesis) is referenced in the analyst contract but not yet documented as a dedicated wiki page. Should it be added to this cluster?
- As vault size grows, the analyst's page budget (100/run default, 500 hard cap) may need to be tunable per mode. Dashboard Mode over a 500-page vault may need a higher cap than Extract Mode.
