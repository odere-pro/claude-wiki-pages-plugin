---
title: "Architecture"
type: index
aliases: ["Architecture", "architecture", "plugin architecture", "four-layer architecture"]
parent: "[[Wiki Index]]"
path: "architecture"
children:
  - "[[Active Vault]]"
  - "[[Analyst Agent]]"
  - "[[Brainstorming Team]]"
  - "[[claude-wiki-pages (Plugin)]]"
  - "[[Curator Agent]]"
  - "[[Design Diagrams]]"
  - "[[Deterministic Engine]]"
  - "[[Durable Memory]]"
  - "[[Engineering Team]]"
  - "[[Fail-Closed]]"
  - "[[Firewall]]"
  - "[[Four-Layer Stack]]"
  - "[[Git Checkpoint]]"
  - "[[Hook System]]"
  - "[[Ingest Agent]]"
  - "[[Maintenance Agent]]"
  - "[[Orchestrator Agent]]"
  - "[[Polish Agent]]"
  - "[[Review Gate]]"
  - "[[Vault Lifecycle]]"
  - "[[Vault Resolution]]"
child_indexes: []
tags: ["architecture"]
created: 2026-06-13
updated: 2026-06-13
---

# Architecture

Map of Content for the plugin's architecture — the four-layer stack, engine, agents, hooks, and design diagrams.

## Core Architecture

- [[Four-Layer Stack]] — the Data / Skills / Agents / Orchestration model
- [[Deterministic Engine]] — the Bun CLI that validates the vault without embeddings or inference
- [[Firewall]] — write confinement to the active vault

## Agents

- [[Orchestrator Agent]] — sole user-facing entry; dispatches to specialists
- [[Ingest Agent]] — processes raw sources into wiki pages
- [[Curator Agent]] — lints and auto-heals structural issues
- [[Analyst Agent]] — query, dashboard, compile, extract, challenge modes
- [[Polish Agent]] — graph colors, MOC refresh, folder-note consistency
- [[Maintenance Agent]] — autonomous backlog catch-up

## Infrastructure

- [[Hook System]] — lifecycle enforcement (PreToolUse, PostToolUse, SubagentStop)
- [[Git Checkpoint]] — snapshot pre/post for every write phase
- [[Vault Resolution]] — 4-tier resolver for active vault

## Design Diagrams

- [[Design Diagrams]] — C4-style mermaid diagrams (L0–L3) across seven perspectives

## Vault and Security Concepts

- [[Active Vault]] — the single vault targeted by all write operations
- [[Vault Lifecycle]] — init, add, switch, remove, merge lifecycle commands
- [[Durable Memory]] — agent session write-backs via `raw/agent-sessions/` and `_proposed/` gate
- [[Review Gate]] — `_proposed/` staging area; human approval required before wiki promotion
- [[Fail-Closed]] — deny-by-default posture across registry, firewall, allow-list, CI gates

## Dev Teams (dev-only, not runtime)

- [[Brainstorming Team]] — 11-persona ideation team in `.claude/teams/wiki-brainstorm/`
- [[Engineering Team]] — 9-role implementation team in `.claude/teams/wiki-dev/`
