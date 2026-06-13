---
title: "Plugin"
type: index
aliases: ["Plugin", "plugin", "claude-wiki-pages plugin layer", "plugin meta"]
parent: "[[Wiki Index]]"
path: "plugin"
children:
  - "[[Plugin Manifest]]"
  - "[[Agent Contract Table]]"
  - "[[Agent Tool Restriction]]"
  - "[[Single-Pass Dispatch]]"
  - "[[Plugin Dev-Time vs Runtime]]"
child_indexes: []
tags: []
created: 2026-06-13
updated: 2026-06-13
---

# Plugin

Plugin-level meta: the manifest, agent contracts, and structural patterns that define how the `claude-wiki-pages` plugin is packaged and how its agents are specified. This folder covers what is declared in the canonical agent files (model, tool-sets, contract tables) and the plugin manifest — distinct from the architecture concepts in `[[Architecture]]` and the user-facing guides in `[[Guides]]`.

## Pages

### Plugin Identity

- [[Plugin Manifest]] — plugin.json: name, version, schema_version support, author, license, keywords

### Agent Structural Patterns

- [[Agent Contract Table]] — the per-agent YAML contract table pattern (schema authority, halting condition, budget, safety model, untrusted-input rule)
- [[Agent Tool Restriction]] — each agent's declared `tools:` field as a security/capability boundary; extract-worker invariant
- [[Single-Pass Dispatch]] — orchestrator's "never recurse, never call two specialists for the same trigger" rule

### Implementation Boundary

- [[Plugin Dev-Time vs Runtime]] — what ships at install vs what is dev-only; session context boundary

## Subtopics
