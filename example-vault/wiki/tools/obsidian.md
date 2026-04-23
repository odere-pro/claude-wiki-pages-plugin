---
title: "Obsidian"
type: entity
entity_type: tool
aliases: ["Obsidian", "obsidian"]
parent: "[[Tools — Index]]"
path: "tools"
sources: ["[[Obsidian Documentation]]"]
related: ["[[Claude Code]]", "[[Hook-Enforced Guarantees]]"]
tags: []
created: 2026-04-18
updated: 2026-04-18
update_count: 1
status: active
confidence: 1.0
---

# Obsidian

## Overview

A local-first markdown editor that treats a folder as a vault. Every file in the folder is a note; `[[wikilinks]]` cross-reference notes by filename or `aliases`. A broken link creates a ghost node in the graph view — an invitation to create the missing page.

## Key Facts

- **Storage.** Plain files on disk. No database. Version control works out of the box.
- **Wikilinks.** Resolved by filename first, then by `aliases` frontmatter. Display text can diverge with `[[Note Title|display]]`.
- **Frontmatter.** YAML at the top of a file, between `---` fences. Queryable via the Dataview plugin.
- **Graph view.** Renders every note and link. Color groups and path filters segment the graph by topic.

## Related

- [[Claude Code]] — the harness that edits Obsidian vaults under schema enforcement.
- [[Hook-Enforced Guarantees]] — the pattern that keeps those edits schema-clean.
