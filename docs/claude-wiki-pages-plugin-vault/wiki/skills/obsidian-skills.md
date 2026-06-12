---
title: "Obsidian Skills"
type: concept
aliases: ["Obsidian Skills", "obsidian skills", "obsidian-graph-colors", "obsidian-vault"]
parent: "[[Skill Catalog]]"
path: "skills"
sources: ["[[architecture]]"]
related: ["[[Skill Catalog]]", "[[Polish Agent]]", "[[Feature Overview]]"]
tags: [skills, obsidian, graph, layer2]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 0.9
---

# Obsidian Skills

Two plugin-authored Obsidian skills plus three MIT-licensed third-party skills (`kepano/obsidian-skills`).

## Plugin-Authored Obsidian Skills

**`obsidian-graph-colors`** — manages Obsidian's graph view color group definitions. For each top-level cluster folder in `wiki/`, assigns a consistent color group. Written to `.obsidian/graph.json`. Invoked by the [[Polish Agent]] after ingest.

**`obsidian-vault`** — general Obsidian vault management: open vault, navigate to pages, trigger Obsidian link updates. The backlink-safe rename workflow (PR #24) uses this skill to call the Obsidian CLI for in-app renaming before falling back to `git mv` for CLI-only environments.

## Third-Party Obsidian Skills (kepano/obsidian-skills)

Three MIT-licensed skills from Steph Ango's `kepano/obsidian-skills` repository are bundled verbatim:

| Skill | Purpose |
| --- | --- |
| `obsidian-dataview` | Reference for Dataview query syntax (for users who add Dataview to their vault) |
| `obsidian-templater` | Reference for Templater syntax |
| `obsidian-properties` | Reference for Obsidian property/frontmatter behavior |

These are included for completeness and user convenience; the plugin does not depend on Dataview or Templater for its own operation.

## License Note

The three `kepano/` skills retain their original MIT license and are attributed in `NOTICE`.
