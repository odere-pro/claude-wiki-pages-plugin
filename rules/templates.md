---
description: "Template schema rules — note-type skeletons that must match vault/CLAUDE.md exactly"
paths:
  - "vault/_templates/**"
---

# Template rules

Templates in `vault/_templates/` define the YAML frontmatter skeleton for each wiki page type. There are 7 templates: `source.md`, `entity.md`, `concept.md`, `topic.md`, `project.md`, `synthesis.md`, `index.md`. Two types have no template — `log` (used only for `wiki/log.md`) and `manifest` (used only for `wiki/_sources/manifest.md`), both with minimal frontmatter (`title`, `type`, `created`, `updated`). Files in `vault/output/` are plain markdown and have no template. (`topic`, `project`, and `manifest` were added in schema_version 2.)

- Template fields must match the schema in `vault/CLAUDE.md` exactly.
- Use `{{placeholder}}` syntax for values that get filled during note creation.
- When changing a template, verify it still matches the frontmatter schema in `vault/CLAUDE.md`.
- Do not add new templates without adding the corresponding type to the schema.
