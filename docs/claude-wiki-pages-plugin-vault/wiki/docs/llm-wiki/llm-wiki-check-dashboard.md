---
title: "LLM Wiki — Check the Dashboard"
type: concept
aliases: ["llm-wiki-check-dashboard", "LLM Wiki Check Dashboard", "Dataview dashboard guide"]
parent: "[[llm-wiki|LLM Wiki Guides]]"
path: "docs/llm-wiki"
sources: ["[[docs-llm-wiki-06|LLM Wiki Guide 06 — Check the Dashboard]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "llm-wiki", "user-guides", "obsidian"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# LLM Wiki — Check the Dashboard

The `wiki/dashboard.md` Dataview dashboard — how to read pending sources, page counts, stale pages, orphan pages, low-confidence pages, and graph quality metrics.

## Definition

The dashboard is an Obsidian Dataview page that renders live queries over the vault's frontmatter. It requires the Dataview plugin and is not part of the schema-validated wiki (no frontmatter required). It is a view, not a truth source.

## Key Principles

**Dashboard requires the Dataview Obsidian plugin.** Without it, `dashboard.md` renders as plain text with unfired query blocks. Install Dataview from Obsidian's community plugin marketplace.

**Five core views:**
1. **Pending sources** — raw files that have not yet been ingested (count + list).
2. **Page counts by type** — how many entity, concept, topic, project, source, synthesis pages exist.
3. **Stale pages** — pages not updated in 30+ days despite newer related sources existing.
4. **Orphan pages** — pages with no inbound wikilinks.
5. **Low-confidence pages** — pages with `confidence < 0.5`.

**Graph quality section.** A separate block shows the `graph-quality.sh` metrics: dangling wikilink count, connected-components count (Cn), cluster efficiency (Ce). These are computed by running `graph-quality.sh` and stamped into a frontmatter field read by the dashboard — or shown in the doctor report.

**Dashboard is regenerable.** If the dashboard queries break or the Dataview syntax drifts, the wizard can recreate `dashboard.md` from the template.

## Examples

A pending-sources count of 15 with a graph Cn=1.0 means the existing wiki is healthy but there is a backlog. The right next step is to run `/claude-wiki-pages:wiki` to ingest the pending sources.

## Related Concepts

The Dataview plugin is a third-party Obsidian plugin (not shipped by this plugin). The graph quality metrics (Cn, Ce) are defined in ADR-0031. The pending source count is derived from `engine.sh backlog --json`.
