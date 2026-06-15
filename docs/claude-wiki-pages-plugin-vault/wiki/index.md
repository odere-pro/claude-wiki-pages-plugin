---
title: "Wiki Index"
type: index
parent: ""
path: ""
children: []
child_indexes:
  - "[[engine]]"
  - "[[how-it-works]]"
  - "[[knowledge-graph]]"
  - "[[llm]]"
  - "[[obsidian]]"
  - "[[plugin]]"
  - "[[wiki-pages]]"
aliases: ["Wiki Index"]
tags: []
created: 2026-06-13
updated: 2026-06-15
---

# Wiki Index

Root map of content for the `claude-wiki-pages` plugin wiki: its architecture
decisions, design patterns, agent and skill contracts, and operational guides.
Each topic cluster below is a folder note that lists and links every page in its
branch — descend through the hierarchy rather than from a flat catalog here, so
the graph forms one island per topic.

## Topic Clusters

- [[plugin|claude-wiki-pages Plugin]] — the plugin itself, agents, four-layer stack, hooks, orchestration, slash commands, marketplace/manifest, git-checkpoint, parallel-extract (23 pages)
- [[engine|Wiki Engine]] — Bun engine, verify/heal/fix/search/snapshot/route/migrate, search score, graph traversal, stemming, vocabulary, firewall, determinism, dangling-wikilink check (27 pages)
- [[wiki-pages|Wiki Pages]] — page schema, page types, templates, frontmatter, provenance, sources, ingest pipeline, folder notes, lint rules, query rules (17 pages)
- [[llm|LLM]] — local models, Ollama, offline policy, NO-RAG / wiki-native recall, fabrication floor, drafting, Software 3.0, local-model quality gate (15 pages)
- [[obsidian|Obsidian]] — graph view, graph colors, wiki-only graph, obsidian experience, wikilinks, .obsidian config, folder-notes-and-graph-quality (7 pages)
- [[knowledge-graph|Knowledge Graph]] — ontology profile, predicate domain/range, how the graph is formed, the Knowledge Graph concept (6 pages)
- [[how-it-works|How It Works]] — end-to-end flow, onboarding, getting-started, maintenance loop, sync, status/dashboard, scaffolding ablation, lifecycle, host-project intake, fill-gaps, graph quality (22 pages)

## Cross-Topic Synthesis

- [[plugin-architecture-synthesis|Plugin Architecture Synthesis]] — three interlocking themes (determinism, provenance, fail-closed safety), key findings, gaps, recommendations

> [!note] Source summaries
> Provenance lives in `wiki/_sources/` — one summary per ingested raw source. Each
> source is reachable from the pages that cite it (their `sources:` field), not from
> this index, so the graph stays clustered by topic rather than collapsing into a hub.
