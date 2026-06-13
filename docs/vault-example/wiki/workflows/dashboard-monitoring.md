---
title: "Dashboard Monitoring"
type: concept
aliases: ["Dashboard Monitoring", "dashboard monitoring", "dashboard"]
parent: "[[Workflows]]"
path: "workflows"
sources:
  - "[[Check the Dashboard]]"
  - "[[Review, Validate, Fix]]"
related:
  - "[[Validation and Repair]]"
  - "[[Dataview]]"
  - "[[Obsidian]]"
  - "[[Provenance-Tracked Wiki]]"
depends_on:
  - "[[Dataview]]"
  - "[[Obsidian]]"
tags: []
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Dashboard Monitoring

The practice of consulting the live [[Dataview]] dashboard at `vault/wiki/dashboard.md` to track vault health, coverage, and staleness at a glance.

## Definition

Dashboard monitoring uses Obsidian's Dataview community plugin to query frontmatter fields across the entire wiki and render live tables. The dashboard at `vault/wiki/dashboard.md` contains five sections: all pages by type, sources, the topic tree, contradictions, and stale candidates. It requires [[Obsidian]] with Dataview installed and enabled; without Dataview the queries render as empty code blocks.

The dashboard complements the [[Validation and Repair]] workflow: where lint and the status check are run explicitly on a schedule, the dashboard is always available and updates in real time as the wiki changes.

## Key Principles

Before and after — consult the dashboard before a batch ingest to know the current state, and after a lint/fix pass to confirm warning counts dropped. This mental diffing catches regressions that automated gates miss.

Confidence as quality signal — sorting the all-pages table by `confidence` ascending surfaces the weakest claims in the vault. Pages with `confidence: 1.0` set by default (rather than by honest assessment) appear as candidates for the single-source-high-confidence lint check.

Flat-folder sprawl is visible — the topic tree section shows page counts per folder. A folder with more than 12 direct children is a restructuring candidate. Running `/claude-wiki-pages:fix` triggers the flat-folder phase of the curator agent.

Static snapshot for sharing — the Obsidian CLI can render a Dataview query and write the result to `vault/wiki/dashboard-snapshot.md`, producing a shareable static version for pull requests, reports, or non-Obsidian reviewers.

## Examples

After ten ingests, the dashboard shows three source summaries with `update_count: 0` citations from wiki pages — orphan sources. The correct action is to find the relevant entity or concept page for each and add the source to its `sources:` array.

The topic tree section shows that the `workflows/` folder has grown to 14 direct children. The researcher runs `/claude-wiki-pages:fix`, which restructures the folder by grouping related concepts into a subfolder.

## Related Concepts

- [[Validation and Repair]] — the explicit validation workflow that the dashboard complements.
- [[Dataview]] — the Obsidian plugin that powers the live dashboard queries.
- [[Obsidian]] — the note-taking app required to render the dashboard.
- [[Provenance-Tracked Wiki]] — the property the dashboard monitors by surfacing orphan sources and low-confidence claims.
