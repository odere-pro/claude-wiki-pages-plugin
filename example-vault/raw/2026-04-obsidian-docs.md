# Obsidian — Documentation Excerpt

> Source: Obsidian help docs, April 2026.
> URL: https://help.obsidian.md/
>
> Excerpt for the example vault. Do not edit — sources in `raw/` are immutable.

---

## Vaults

An Obsidian vault is a folder on disk. Every file in the folder is treated as part of the vault. Markdown files become notes; other file types are stored as attachments. There is no database; everything is plain files.

## Linking

Obsidian links notes with double-bracket syntax: `[[Note Title]]`. Links are resolved by filename first, then by the `aliases` field in YAML frontmatter. Displayed text can differ from the target using `[[Note Title|display text]]`.

A broken link (one whose target does not exist) creates a "ghost node" in the graph view — a placeholder that invites the author to create the missing note.

## Graph view

The graph visualizes every note and every link. Notes appear as circles; links appear as edges. Color groups and path filters segment the graph by topic.

## Frontmatter

Notes may declare YAML frontmatter — a metadata block at the top of the file between `---` fences. Frontmatter fields become queryable via the Dataview community plugin and influence wikilink resolution (the `aliases` field) and graph coloring.
