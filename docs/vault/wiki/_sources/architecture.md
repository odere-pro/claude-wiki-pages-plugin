---
title: "Architecture (source)"
type: source
source_type: manual
source_format: text
author: ""
publisher: "claude-wiki-pages"
date_published: 2026-06-11
date_ingested: 2026-06-11
tags: [architecture, four-layer-stack, plugin]
aliases: ["Architecture (source)"]
sources: []
created: 2026-06-11
updated: 2026-06-11
status: active
confidence: 1.0
---

# Architecture

## Summary

Describes the four-layer architecture of `claude-wiki-pages`: a Claude Code plugin implementing Karpathy's LLM Wiki pattern. The four layers are Data, Skills, Agents, and Orchestration, each designed to catch a different class of failure. Includes a data-flow walkthrough of a single ingest operation and the plugin file-structure mapping.

## Key Claims

- The plugin is a four-layer implementation of Karpathy's LLM Wiki pattern, packaged as a Claude Code plugin.
- Layer 1 (Data): immutable `raw/` + typed `wiki/` pages + vault schema (`CLAUDE.md`).
- Layer 2 (Skills): 23 single-responsibility capabilities.
- Layer 3 (Agents): 7 multi-step executors — orchestrator, onboarding, ingest, curator, analyst, polish, maintenance.
- Layer 4 (Orchestration): slash commands, lifecycle hooks, path-scoped rules, SubagentStop gates.
- Every claim in every wiki page carries a `sources` field back to at least one raw item — provenance is structural.
- Data flow for one ingest has 11 steps from drop-source to SubagentStop running verify-ingest.sh.

## Entities Mentioned

- [[claude-wiki-pages]]
- [[claude-wiki-pages-orchestrator-agent]]
- [[claude-wiki-pages-ingest-agent]]
- [[claude-wiki-pages-curator-agent]]
- [[claude-wiki-pages-analyst-agent]]
- [[claude-wiki-pages-polish-agent]]
- [[claude-wiki-pages-maintenance-agent]]
- [[claude-wiki-pages-onboarding-agent]]

## Concepts Covered

- [[Four-Layer Stack]]
- [[Layer 1 — Data]]
- [[Layer 2 — Skills]]
- [[Layer 3 — Agents]]
- [[Layer 4 — Orchestration]]
- [[Provenance]]
- [[Hook-Enforced Safety]]
- [[Ingest Data Flow]]
