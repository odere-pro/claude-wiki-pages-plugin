---
title: "Operations"
type: index
aliases: ["Operations", "operations", "day-to-day operations"]
parent: "[[Wiki Index]]"
path: "operations"
children:
  - "[[Installation]]"
  - "[[Onboarding]]"
  - "[[Doctor]]"
  - "[[One Advertised Path]]"
  - "[[Portable Markdown]]"
  - "[[Automation]]"
  - "[[Backlog Detection]]"
  - "[[Vault Location Resolution]]"
  - "[[Draft Review Gate]]"
child_indexes: []
tags: [operations]
created: 2026-06-11
updated: 2026-06-11
---

# Operations

Navigation index for operating `claude-wiki-pages` day-to-day. Covers installation, getting started, the main entry verb, orchestrator routing, vault management, automation, offline mode, and the draft review gate.

## Getting Started

- [[Installation]] — Three install paths, prerequisites, Bun, verify and uninstall
- [[Onboarding]] — Guided first-run wizard via `/claude-wiki-pages:init`
- [[Doctor]] — Environment health check; ten checks D01–D10

## Day-to-Day

- [[One Advertised Path]] — `/claude-wiki-pages:wiki` as the single recommended entry
- [[Orchestrator Routing]] — How the orchestrator decides which specialist to dispatch
- [[Portable Markdown]] — Exporting wiki answers as portable markdown to `vault/output/`

## Automation

- [[Automation]] — Three-layer opt-in vault automation system
- [[Backlog Detection]] — Deterministic pending-source and overdue-lint detection
- [[Heartbeat]] — SessionStart one-line recommendation; never mutates vault
- [[Maintenance Loop]] — Full ingest → curator → polish → lint in one pass

## Vault Management

- [[Vault Location Resolution]] — Four-tier resolver order for the active vault path
- [[Multi-Vault Registry]] — Managing N registered vaults with one active at a time
- [[Per-Vault Write Confinement]] — Firewall invariant; cross-vault writes blocked

## Drafts

- [[Draft Review Gate]] — Single `_proposed/` channel for all drafted content
- [[Offline Mode]] — Local model fallback when Claude is unavailable
