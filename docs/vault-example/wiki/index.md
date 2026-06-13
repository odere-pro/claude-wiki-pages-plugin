---
title: "Wiki Index"
type: index
aliases: ["Wiki Index", "wiki index", "vault MOC", "MOC"]
path: ""
children: []
child_indexes:
  - "[[tools]]"
  - "[[workflows]]"
  - "[[patterns]]"
tags: []
created: 2026-06-13
updated: 2026-06-13
---

# Wiki Index

Master catalog for the `claude-wiki-pages` reference vault. This wiki documents the plugin itself — its tools, workflows, and design patterns — built with the plugin's own provenance-tracked wiki.

## Topic tree

- [[tools]] — 4 pages — Claude Code, claude-wiki-pages Plugin, Obsidian, Dataview
- [[workflows]] — 5 pages — Ingest Pipeline, Validation and Repair, Querying the Wiki, Exporting Outputs, Dashboard Monitoring
- [[patterns]] — 5 pages — LLM Wiki Pattern, Hook-Enforced Guarantees, Entity Distribution Model, Provenance-Tracked Wiki, Vault Scaffolding

## Tools

- [[Claude Code]] — the AI coding environment hosting the plugin's hook bus and slash commands
- [[claude-wiki-pages Plugin]] — the four-layer plugin turning a vault into a provenance-tracked wiki
- [[Obsidian]] — the note-taking app used as the vault viewer and graph explorer
- [[Dataview]] — the Obsidian community plugin powering the live dashboard

## Workflows

- [[Ingest Pipeline]] — end-to-end process from raw source to structured wiki page
- [[Validation and Repair]] — three-level validation: status, lint, curator agent
- [[Querying the Wiki]] — asking cited questions with wikilink citations
- [[Exporting Outputs]] — compiling deliverables into `vault/output/`
- [[Dashboard Monitoring]] — live Obsidian Dataview view of vault health

## Patterns

- [[LLM Wiki Pattern]] — human curates sources; LLM maintains the wiki
- [[Hook-Enforced Guarantees]] — invariants enforced at every tool-call boundary
- [[Entity Distribution Model]] — one source rewrites many existing pages (DRY)
- [[Provenance-Tracked Wiki]] — every claim traces back to a source in `raw/`
- [[Vault Scaffolding]] — structure created by `/claude-wiki-pages:init`

## Synthesis

None yet — cross-topic analysis pages will appear here as the wiki grows.

## Sources

- [[Getting Started]]
- [[Create a New Vault]]
- [[Update an Existing Vault]]
- [[Review, Validate, Fix]]
- [[Export Data, Create Output]]
- [[Check the Dashboard]]
- [[Query the Wiki]]
- [[Using claude-wiki-pages]]
