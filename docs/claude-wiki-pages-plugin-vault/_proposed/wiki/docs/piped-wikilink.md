---
title: "Piped Wikilink"
type: concept
aliases: ["piped wikilink", "piped basename wikilink", "piped link form", "basename wikilink", "path-qualified wikilink"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]", "[[docs-adr-0032|ADR-0032]]"]
related: []
tags: ["docs", "linking", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.95
derived: false
proposed_by: "claude"
---

# Piped Wikilink

The required cross-page link form: `[[filename-basename|Display Text]]`, where the target is the destination page's file basename (the part Obsidian resolves) and the display text is the Title-Case page title.

## Definition

A piped wikilink is a `[[target|display]]` link where the `|` separates the resolving target (left side) from the display text (right side). In this plugin, the resolving target is always the destination page's file basename — the filename stem without extension, in kebab-case.

This form is required for all cross-page links: body text and every frontmatter link field (`parent:`, `sources:`, `related:`, `children:`, `child_indexes:`, `key_pages:`, `members:`, `scope:`, `depends_on:`, etc.).

The requirement exists because Obsidian resolves a written `[[link]]` by exact vault path or filename basename only — it does not resolve by a page's `title:` or `aliases:` entries. A bare `[[Title Case]]` link written expecting Obsidian to find the page by its title creates a ghost wikilink: the plugin's own resolver may find a match, but Obsidian creates a floating grey node instead.

**Piped basename form:** `[[orchestrator-agent|Orchestrator Agent]]` — resolves to the file `orchestrator-agent.md`; displays as "Orchestrator Agent".

**Path-qualified form** (used only when the basename is not unique vault-wide): `[[_sources/docs-adr-0036|ADR-0036]]` — resolves to the file at `wiki/_sources/docs-adr-0036.md`; used when the bare basename `docs-adr-0036` occurs in both `wiki/_sources/docs-adr-0036.md` and `raw/repo/docs/adr/ADR-0036-strict-tree-topology.md`.

## Key Principles

**Default to bare basename.** Path-qualify only when the same basename occurs in two or more files anywhere in the vault (a genuine collision). Over-qualifying a unique basename with a guessed folder creates a dangling link because the path does not exist.

**Verify the target path before path-qualifying.** When a collision is detected, look up the target page's actual wiki-relative path and write that path. Never guess the folder.

**Body text and frontmatter use the same form.** The piped basename convention applies everywhere: `- See [[concept-page|Concept Page]]` in body text, and `parent: "[[folder-note|Folder Note]]"` in frontmatter. Frontmatter values must be quoted strings (`"[[...]]"`).

**`sources:` anti-pattern.** The most common ghost-source bug: citing a source note by its full title (`"[[Source: Architecture — Four-Layer Stack …]]"`) instead of its file basename (`"[[docs-architecture|Four-Layer Architecture]]"`). Always check the actual filename in `wiki/_sources/` before writing a source citation.

**Table-cell escaping.** Inside a markdown table cell, the pipe character must be escaped: `[[source-note\|Source Note]]`. The link resolver strips the backslash; the link resolves correctly. In frontmatter (not a table), use a plain pipe.

**`scripts/heal-ghost-links.sh` is the automated fix.** When ghost links are already in the vault, the curator agent runs this script to detect bare `[[Title]]` links that match a page's title or alias and rewrite them to piped basename form.

## Examples

Correct: `[[ingest-pipeline|Ingest Pipeline]]` in body text.
Correct: `sources: ["[[docs-architecture|Four-Layer Architecture]]"]` in frontmatter.
Correct path-qualified: `[[_sources/docs-adr-0036|ADR-0036]]` when `docs-adr-0036` is a basename collision.

Wrong (ghost): `[[Ingest Pipeline]]` — Obsidian creates a ghost node named "Ingest Pipeline" rather than resolving to `ingest-pipeline.md`.
Wrong (dangling): `[[docs/ingest-pipeline|Ingest Pipeline]]` when the file actually lives at `wiki/docs/ingest-pipeline.md` — the guessed folder `docs/` is wrong relative to the wiki root.

## Related Concepts

The piped wikilink convention is defined in ADR-0032 and enforced by the ghost-link lint check (`wikilink-ghost`), the dangling-link verify check (`wikilink-dangling`), and the collision check (`wikilink-collision`). It is the remedy for ghost wikilinks and the correct form for all frontmatter link fields. The path-qualified wikilink is the collision-resolution variant.
---
