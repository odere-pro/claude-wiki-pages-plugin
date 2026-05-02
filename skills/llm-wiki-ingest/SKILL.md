---
name: llm-wiki-ingest
description: >
  Ingest one or more sources from vault/raw/ into typed wiki pages under
  vault/wiki/. Trigger when the user says "ingest this source", "process the
  file I just dropped in raw/", "add this to the wiki", or invokes
  /llm-wiki-stack:llm-wiki-ingest directly. Prefer the pipeline
  (/llm-wiki-stack:llm-wiki-stack-ingest-agent) unless the user has asked to skip
  lint-fix and synthesis.
allowed-tools: Bash Read Write Edit Glob Grep
---

# LLM Wiki — Ingest

Process sources under `vault/raw/` into the wiki. This skill is the
single-responsibility ingest verb; it is the middle third of what the
`llm-wiki-stack-ingest-agent` agent does. The agent wraps this skill with a
post-ingest lint-fix pass and an optional synthesis step — invoke the agent
when the user wants the full cycle, invoke this skill when the user wants only
the ingest portion.

## When to invoke

- A file exists under `vault/raw/` that has no corresponding entry in
  `vault/wiki/log.md` under a `## [YYYY-MM-DD] ingest | <title>` header.
- The user explicitly requests ingest-only (skipping lint and synthesis).
- An agent is chaining ingest as a step.

## Reading contract

- `vault/raw/` — the sources themselves. Immutable. Enforced by
  `protect-raw.sh`.
- `vault/CLAUDE.md` — the schema. Read first, before touching any source.
- `vault/wiki/` — to detect existing pages for the entities and concepts the
  new source mentions. This skill extends existing pages rather than
  duplicating them.
- `vault/wiki/log.md` — to detect already-ingested sources.

## Writing contract

Writes are confined to these paths:

| Path                          | Write intent                                                             |
| ----------------------------- | ------------------------------------------------------------------------ |
| `vault/wiki/_sources/<slug>.md` | One new summary per never-before-seen source.                            |
| `vault/wiki/<topic>/*.md`     | New or updated typed pages (`entity` or `concept`).                      |
| `vault/wiki/<topic>/_index.md` | Backfill `children:` and `child_indexes:` for every folder this skill touches. |
| `vault/wiki/index.md`         | Append new top-level pages to the vault MOC.                             |
| `vault/wiki/log.md`           | Append `## [YYYY-MM-DD] ingest \| <Source Title>` at the bottom.          |

This skill MUST NOT:

- Write to `vault/raw/`.
- Write synthesis notes under `vault/wiki/_synthesis/`.
- Delete any existing page.
- Renumber, reorder, or rebuild `wiki/index.md` (that is `llm-wiki-index`'s
  role; this skill only appends).

## Workflow

Follow the 13-step ingest sequence in `vault/CLAUDE.md` exactly. The short
version:

1. Read the schema.
2. Identify unprocessed sources (compare `vault/raw/` against
   `vault/wiki/log.md`).
3. For each source:
   a. Write the summary to `wiki/_sources/`.
   b. Extract entities and concepts.
   c. For each extracted item, locate or create its topic folder.
   d. Extend an existing page if one already covers the item; otherwise create
      a new typed page.
   e. Add the new source to each touched page's `sources:`.
   f. Increment `update_count`; advance `updated`.
   g. Recalculate `confidence` per the confidence-discipline rules.
   h. Update per-folder `_index.md` `children:` / `child_indexes:`.
4. Append to `wiki/log.md`.
5. Print a summary table: sources processed, pages created, pages updated,
   folders touched.

## Hook enforcement

Every Write triggers Layer 4 gates:

- `validate-frontmatter.sh` rejects missing or malformed frontmatter.
- `check-wikilinks.sh` rejects markdown links where wikilinks are required
  (the `sources:` field, cross-page references).
- `validate-attachments.sh` rejects source pages referencing missing files
  under `raw/assets/`.
- `protect-raw.sh` rejects any accidental write under `raw/`.
- `post-wiki-write.sh` prints a reminder about `_index.md` upkeep after every
  page write.

If any hook returns exit 2, surface the error verbatim. Do not retry the write
unchanged — adjust the content to satisfy the hook.

## Completion signal

On success, print:

```
READY: <N> sources ingested, <M> pages written (<C> created, <U> updated).
```

The `llm-wiki-stack-ingest-agent` agent looks for this prefix to know it can hand off
to `llm-wiki-stack-curator-agent`.
