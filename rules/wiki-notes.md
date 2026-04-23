---
description: "Wiki page format rules — required frontmatter, wikilinks, kebab-case naming, index bookkeeping"
paths:
  - "vault/wiki/**/*.md"
---

# Wiki page rules

Every file in `vault/wiki/` must have YAML frontmatter with a `type` field. Allowed types in wiki: `source`, `entity`, `concept`, `synthesis`, `index`, `log`. Files in `vault/output/` are plain markdown, outside this schema.

Read `vault/CLAUDE.md` for the full frontmatter schema per type before creating or editing any wiki page.

## Frontmatter format

- Frontmatter must be the first thing in the file. No blank line before `---`.
- Strings containing colons must be quoted: `title: "Something: A Subtitle"`.
- Arrays use bracket syntax: `tags: [tag1, tag2]` — not dash-list syntax.
- Wikilinks in frontmatter must be quoted: `sources: ["[[source-note]]"]`.
- Dates use `YYYY-MM-DD`. Booleans use `true`/`false`.
- No nested YAML objects. All fields at top level.
- No tabs in frontmatter — spaces only.

## Content format

- Use `[[wikilinks]]` for all internal references. Never `[text](path.md)`.
- Use `[[Page Title|display text]]` when display text differs from page title.
- Page title is `#`. Body headings start at `##`.
- Tags in content: `#kebab-case`.
- Callouts: `> [!note]`, `> [!warning]`, `> [!important]`.

## File naming

- Kebab-case: `article-title-here.md`.
- Forbidden characters in filenames: `: * ? " < > | # ^ [ ] \`.
- No dotfiles. Max 200 characters.
- Index files are always `_index.md` in topic folders; the root index is `wiki/index.md`.

## After creating or editing a wiki page

- Update `wiki/index.md` if a new page was created.
- Update the folder's `_index.md` if the page is in a topic folder.
- Append to `wiki/log.md` for ingest/query/lint operations.
