---
title: "Design"
type: index
aliases: ["design", "Design", "design diagrams", "architecture diagrams"]
parent: "[[docs|Docs]]"
path: "docs/design"
children:
  - "[[design-sequences|Design Sequences]]"
  - "[[design-teams-and-agents|Design Teams and Agents]]"
  - "[[design-config-security|Design Config and Security]]"
  - "[[design-feature-relations|Design Feature Relations]]"
  - "[[design-diagram-template|Design Diagram Template]]"
child_indexes: []
tags: ["docs", "design"]
created: 2026-06-25
updated: 2026-06-25
---

# Design

C4-style mermaid diagrams documenting the claude-wiki-pages plugin at multiple zoom levels and perspectives. Each diagram is committed Markdown — versioned, diffable, and gate-checked by the design-drift gate (ADR-0013 Check 5).

## Overview

Start with `01-system-context.md` for the whole system on one screen. Use the diagrams below for detail on specific perspectives.

## Sequence Flows (L3)

- [[design-sequences|Design Sequences]] — step-by-step flows: SessionStart vault resolution, ingest write-path through the PreToolUse hook cluster, agent write-back with human approval gate, durable-memory Stop/SessionEnd

## Teams and Runtime Agents

- [[design-teams-and-agents|Design Teams and Agents]] — how the two dev teams (wiki-brainstorm, wiki-dev) and the eight runtime agents relate; brainstorm protocol; engineering handoff chain

## Configuration, Security, and Isolation

- [[design-config-security|Design Config and Security]] — four-tier vault resolution, fail-closed write boundary (PreToolUse chain), dev-time vs runtime isolation, per-vault confinement

## Claude Code Feature Relations

- [[design-feature-relations|Design Feature Relations]] — how commands, agents, skills, hooks, rules, scripts, the engine, and Claude Code platform capabilities connect

## Conventions and Template

- [[design-diagram-template|Design Diagram Template]] — the `_template.md` canonical template for C4 diagrams: zoom level, perspective, authority link, node grounding convention, speculative marker
