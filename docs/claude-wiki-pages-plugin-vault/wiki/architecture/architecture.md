---
title: "Architecture"
type: index
aliases: ["architecture", "Architecture", "four-layer stack"]
parent: "[[Wiki Index]]"
path: "architecture"
children:
  - "[[Four-Layer Stack]]"
  - "[[Data Layer]]"
  - "[[Skills Layer]]"
  - "[[Agents Layer]]"
  - "[[Orchestration Layer]]"
  - "[[Data Flow]]"
child_indexes: []
tags: [architecture]
created: 2026-06-12
updated: 2026-06-12
---

# Architecture — Index

The architecture cluster covers the four-layer design of `claude-wiki-pages`, how each layer works, and how they combine into the ingest and query pipelines.

## Pages in this cluster

- [[Four-Layer Stack]] — overview of the four-layer model and why it is structured this way
- [[Data Layer]] — Layer 1: immutable raw sources and the wiki schema
- [[Skills Layer]] — Layer 2: single-responsibility slash commands
- [[Agents Layer]] — Layer 3: multi-step executors that chain skills
- [[Orchestration Layer]] — Layer 4: hooks, scripts, rules, and commands
- [[Data Flow]] — how one ingest pass traverses all four layers
