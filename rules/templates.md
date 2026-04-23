---
description: "Template schema rules — 6 note-type skeletons that must match vault/CLAUDE.md exactly"
paths:
  - "vault/_templates/**"
---

# Template rules

Templates in `vault/_templates/` define the YAML frontmatter skeleton for each wiki page type. There are 5 templates: `source.md`, `entity.md`, `concept.md`, `synthesis.md`, `index.md`. The 6th type (`log`) has no template — it is used only for `wiki/log.md` with minimal frontmatter (`title`, `type`, `created`, `updated`). Files in `vault/output/` are plain markdown and have no template.

- Template fields must match the schema in `vault/CLAUDE.md` exactly.
- Use `{{placeholder}}` syntax for values that get filled during note creation.
- When changing a template, verify it still matches the frontmatter schema in `vault/CLAUDE.md`.
- Do not add new templates without adding the corresponding type to the schema.
