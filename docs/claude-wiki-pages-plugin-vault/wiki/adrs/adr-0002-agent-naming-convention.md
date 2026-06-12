---
title: "ADR-0002 Agent Naming Convention"
type: concept
aliases: ["ADR-0002 Agent Naming Convention", "ADR-0002", "agent naming convention ADR"]
parent: "[[ADRs]]"
path: "adrs"
sources: ["[[ADR-0002-agent-naming-convention]]"]
related: ["[[Agent Roles]]", "[[ADR-0001 Four-Layer Orchestrator]]", "[[Skill Catalog]]"]
tags: [adr, agents, naming]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# ADR-0002: Agent Naming Convention

**Status:** Proposed | **Date:** 2026-05-02

## Problem

Three agents had compound role-specific names (`llm-wiki-ingest-pipeline`, `llm-wiki-lint-fix`, `llm-wiki-analyst`) that sat in the same flat namespace as skills. Two problems:

1. No way to tell a skill from an agent by name.
2. Adding the orchestrator agent (ADR-0001) next to the old agents put two naming conventions in the same directory.

## Decision

Adopt: **`{plugin-name}-{role}-agent`**

Three renames (bumping plugin.json version to `0.2.0`):

| Old name | New name | Role |
| --- | --- | --- |
| `llm-wiki-ingest-pipeline` | `claude-wiki-pages-ingest-agent` | specialist |
| `llm-wiki-lint-fix` | `claude-wiki-pages-curator-agent` | specialist |
| `llm-wiki-analyst` | `claude-wiki-pages-analyst-agent` | specialist |
| _(new)_ | `claude-wiki-pages-orchestrator-agent` | top-level |

Two decisions embedded in this:
- **`curator` over `lint-fix`** — the agent gates judgment fixes behind user approval, which is curation, not just linting.
- **`-agent` suffix is mandatory** — disambiguates the agent from a skill on first read, even though "agent" is implied by the directory.

## Key Alternatives Rejected

- **Keep current names; add only the orchestrator** — rejected because mixing two conventions ages badly.
- **Soft rename with shims** — rejected because the plugin is pre-1.0 and shims double the surface area.
- **Drop the `-agent` suffix** — rejected because future skills can't share the prefix without ambiguity.
- **Use `llm-wiki-` prefix instead of `llm-wiki-stack-`** — rejected because the plugin ID is `llm-wiki-stack` and ambiguous search-and-replace is brittle.

## Consequences

Skills keep their existing names. The convention transfers to other plugins. `validate-docs.sh` enforces the banned old names in prose.
