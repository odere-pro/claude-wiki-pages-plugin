---
description: "Plain Markdown conventions for project documentation — standard links, no frontmatter, no wikilinks"
paths:
  - "docs/**"
---

# Documentation rules

Files in `docs/` are project documentation — governance frameworks, implementation plans, guides. They are plain Markdown (not Obsidian-flavored).

- Use standard Markdown links: `[text](./path.md)` — not wikilinks.
- No YAML frontmatter required (these are not wiki notes).
- Use GitHub-flavored callouts where needed: `> [!important]`, `> [!warning]`.
- Keep documents self-contained. Cross-reference other docs by filename.
