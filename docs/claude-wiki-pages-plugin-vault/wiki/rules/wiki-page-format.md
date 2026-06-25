---
title: "Wiki Page Format"
type: concept
aliases: ["wiki page format", "frontmatter format", "wiki conventions"]
parent: "[[rules|Rules]]"
path: "rules"
sources: ["[[rules-wiki-notes|Wiki Page Rules]]", "[[rules-templates|Template Rules]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["rules", "wiki", "frontmatter", "schema"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Wiki Page Format

Wiki page format is the set of structural conventions every file in `vault/wiki/` must follow, covering frontmatter YAML, content markup, file naming, and post-write bookkeeping.

## Definition

Every wiki page carries YAML frontmatter as the first block in the file, a `type` field drawn from the allowed enum, and a body that uses `[[wikilinks]]` for all internal references. The conventions are enforced by path-scoped rules, hooks, and the engine's `verify` command.

## Key Principles

**Frontmatter format:**
- Must be the first thing in the file — no blank line before `---`.
- Strings containing colons must be quoted.
- Arrays use bracket syntax: `tags: [tag1, tag2]` — not dash-list syntax.
- Wikilinks in frontmatter must be quoted: `sources: ["[[source-note]]"]`.
- Dates use `YYYY-MM-DD`; booleans use `true`/`false`.
- No nested YAML objects; no tabs — spaces only.

**Content format:**
- Use `[[wikilinks]]` for all internal references. Never use raw file paths.
- Page title is `#`; body headings start at `##`.
- Tags in content: `#kebab-case`.
- Callouts: `> [!note]`, `> [!warning]`, `> [!important]`.

**File naming:**
- Kebab-case: `article-title-here.md`.
- Forbidden characters in filenames: `: * ? " < > | # ^ [ ] \`.
- No dotfiles; max 200 characters.
- Folder notes are named exactly after their folder (`wiki/<topic>/<topic>.md`, `type: index`).

**Post-write bookkeeping:**
- Update `wiki/index.md` if a new page was created.
- Update the folder's folder note if the page is in a topic folder.
- Append to `wiki/log.md` for ingest/query/lint operations.

## Examples

A well-formed entity page opens with `---` frontmatter containing `type: entity`, `parent: "[[topic|Topic]]"`, and `sources: ["[[source-note|Source Note]]"]`, followed by the H1 title and body sections.

## Related Concepts

`vault/CLAUDE.md` is the canonical schema for all types and required fields. `validate-frontmatter.sh` enforces the required fields mechanically. The `rules/wiki-notes.md` path-scoped rule summarises these conventions for Claude.
