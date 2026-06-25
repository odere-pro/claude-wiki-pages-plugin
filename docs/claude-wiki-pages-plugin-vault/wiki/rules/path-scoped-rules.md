---
title: "Path-Scoped Rules"
type: concept
aliases: ["path-scoped rules", "scoped rules", "rules files"]
parent: "[[rules|Rules]]"
path: "rules"
sources: ["[[rules-docs|Documentation Rules]]", "[[rules-raw-immutable|Raw Immutability Rule]]", "[[rules-templates|Template Rules]]", "[[rules-wiki-notes|Wiki Page Rules]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["rules", "orchestration", "convention"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Path-Scoped Rules

Path-scoped rules are convention files under `rules/` that instruct Claude what is allowed or required when operating on a specific directory tree.

## Definition

Path-scoped rules are YAML-fronted Markdown files, each declaring a `paths:` array and a `description:`. Claude Code loads them when the active file or operation target matches one of the listed path globs. They are Layer 4 Orchestration artifacts that complement the hook chain without adding runtime cost.

## Key Principles

- Each rule file targets exactly one directory tree (`docs/**`, `vault/raw/**`, `vault/_templates/**`, `vault/wiki/**/*.md`).
- Rules define what Claude must do — or must not do — inside that tree, without duplicating the full schema.
- They are the first line of defence: applied before skills or agents fire.
- They degrade gracefully: a path-scoped rule is a nudge backed by `vault/CLAUDE.md`; hooks and the engine enforce mechanically.

## Examples

The plugin ships four rules files:

1. `rules/docs.md` — `docs/**`: plain Markdown only; no wikilinks; no frontmatter.
2. `rules/raw-immutable.md` — `vault/raw/**`: files are immutable after placement; ingest is the only processing path.
3. `rules/templates.md` — `vault/_templates/**`: template fields must match `vault/CLAUDE.md`; use `{{placeholder}}` syntax.
4. `rules/wiki-notes.md` — `vault/wiki/**/*.md`: required frontmatter fields; wikilinks for internal refs; kebab-case filenames; index bookkeeping after every write.

## Related Concepts

The hook chain in `hooks/hooks.json` enforces these rules mechanically at the tool-call boundary. `vault/CLAUDE.md` is the schema authority — path-scoped rules summarise and reinforce it for a specific subtree.
