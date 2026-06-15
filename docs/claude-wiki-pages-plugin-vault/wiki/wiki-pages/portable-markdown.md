---
title: "Portable Markdown"
type: concept
aliases: ["Portable Markdown", "portable markdown", "markdown export", "vault/output/", "deliverable markdown"]
parent: "[[Wiki Pages]]"
path: "wiki-pages"
sources: ["[[Getting Started (CLI Quickstart)]]", "[[User Guide 05: Export Outputs]]"]
related: ["[[Analyst Agent]]", "[[Synthesis Note]]", "[[Time-to-First-Value]]", "[[Query Rules]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "guides", "export", "output"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Portable Markdown

> [!summary]
> Portable markdown is the output format of `/claude-wiki-pages:markdown` — a query answer rendered as plain markdown in `vault/output/` that is readable outside Obsidian (no wikilinks, no Dataview, no callouts). It is a deliverable format for sharing wiki knowledge with audiences who do not use Obsidian. The `vault/output/` directory is git-ignored and not schema-tracked.

## Key Principles

- Portable markdown is plain markdown — no wikilinks, no Dataview blocks, no Obsidian callouts — readable outside Obsidian by any markdown renderer.
- `vault/output/` is git-ignored and not schema-tracked; these files are deliverables, not wiki knowledge.
- The knowledge source is the wiki; the output is a derived deliverable — synthesis notes are permanent wiki knowledge, output files are context-specific documents.
- The `## Sources` citations in portable output become numbered lists with plain text page titles (wikilinks flattened or removed).
- Pandoc is the supported path for PDF/DOCX conversion of output files; the plugin does not ship a Pandoc wrapper.

## Examples

Exporting a query answer as portable markdown:

```bash
/claude-wiki-pages:markdown what does the wiki say about the firewall?
# Writes to: vault/output/firewall-2026-06-14.md
# Output: plain markdown, wikilinks → plain text references, sources → numbered list
```

Converting the output to PDF with Pandoc:

```bash
pandoc vault/output/firewall-2026-06-14.md -o firewall-report.pdf
```

## Definition

The `vault/output/` directory is user-owned scratch space for deliverables compiled from the wiki. Files here are plain markdown — no frontmatter, no validation, no wiki schema. They are gitignored (not tracked as wiki state) and intended for external consumption: sharing with colleagues, converting to PDF, embedding in other documents.

"Portable" means the output does not rely on Obsidian-specific features:

- wikilinks are rendered as plain text references or standard markdown links
- Dataview query blocks are expanded or removed
- Obsidian callout syntax (`> [!note]`) may be preserved (renders in many markdown renderers) or flattened to plain blockquotes
- `## Sources` citations become numbered lists with plain text page titles

## How to Export

```bash
/claude-wiki-pages:markdown
```

The user is prompted for a query or topic; the command runs a search, compiles the answer, and writes it to `vault/output/<slug>-YYYY-MM-DD.md`. The file is immediately available in the Obsidian file browser (since `output/` is not excluded from the Obsidian index) and on the filesystem.

For document-style compilation (multi-page synthesis rather than a single query answer):

```
Analyst Agent: compile a report on <topic> for <audience>
```

The [[Analyst Agent]]'s "document compile" mode produces a longer-form document in `vault/output/` that stitches together multiple wiki pages into a coherent narrative.

## Synthesis vs. Output

User Guide 05 draws a clear line:

| Synthesis Note                         | Portable Markdown Output             |
| -------------------------------------- | ------------------------------------ |
| Belongs in `wiki/_synthesis/`          | Belongs in `vault/output/`           |
| Schema-tracked, validated, git-tracked | No schema, not validated, gitignored |
| Permanent wiki knowledge               | Context-specific deliverable         |
| Cited by other wiki pages              | Not part of the wiki graph           |

An output file can cite a synthesis note (by mentioning it by name), but the synthesis note does not cite the output file. Synthesis is the knowledge; output is the derived deliverable.

## Pandoc Conversion

Portable markdown in `vault/output/` can be converted to other formats using Pandoc:

```bash
pandoc vault/output/report-2026-06-13.md -o report.pdf
pandoc vault/output/report-2026-06-13.md -o report.docx
```

This is the supported path for PDF and DOCX delivery. The plugin does not ship a Pandoc wrapper; Pandoc is an external tool the user installs separately.

## Related Concepts

- [[Analyst Agent]] — the agent that produces compiled reports in `vault/output/`
- [[Synthesis Note]] — the permanent knowledge counterpart; output files can derive from synthesis notes
- [[Time-to-First-Value]] — `/claude-wiki-pages:markdown` is the value extension for non-Obsidian users
- [[Query Rules]] — the query workflow that feeds into markdown export
