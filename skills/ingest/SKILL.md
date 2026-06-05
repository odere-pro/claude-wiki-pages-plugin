---
name: ingest
description: >
  Ingest one or more sources from vault/raw/ into typed wiki pages under
  vault/wiki/. Trigger when the user says "ingest this source", "process the
  file I just dropped in raw/", "add this to the wiki", or invokes
  /claude-wiki-pages:ingest directly. Prefer the pipeline
  (/claude-wiki-pages:claude-wiki-pages-ingest-agent) unless the user has asked to skip
  lint-fix and synthesis.
allowed-tools: Bash Read Write Edit Glob Grep
disable-model-invocation: true
---

# LLM Wiki — Ingest

Process sources under `vault/raw/` into the wiki. This skill is the
single-responsibility ingest verb; it is the middle third of what the
`claude-wiki-pages-ingest-agent` agent does. The agent wraps this skill with a
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
- Renumber, reorder, or rebuild `wiki/index.md` (that is `index`'s
  role; this skill only appends).

## Classification checklist

Every new page extracted during ingest (step 3b below) must be classified
before it is written. Work through this checklist for each item.

**Enum authority:** read the allowed values from `ontology-profile-v1` in
`vault/CLAUDE.md` — that section is the single source of truth for the
`type` enum and the `entity_type` enum. Do not restate or copy those lists
here; they live there and only there.

1. **Assign exactly one `type`** from the `type` enum in `ontology-profile-v1`
   (`vault/CLAUDE.md`). The vault's effective enum is the closed core set; it
   is not owner-extensible (adding a type requires a schema change).
2. **For `type: entity` pages, assign exactly one `entity_type`** from the
   `entity_type` enum in `ontology-profile-v1` (`vault/CLAUDE.md`). The
   effective legal set is the fixed core **union** any `entity_type_extensions`
   list declared in the active vault's own `vault/CLAUDE.md` (decision #6);
   compose the two lists at read time.
3. **Out-of-enum items:** if the extracted item does not fit any legal value,
   direct it to the closest legal type that best captures its nature. If no
   reasonable mapping exists, flag it as a human decision — never invent an
   out-of-enum value. Annotate the page with an inline comment explaining the
   mapping choice so a reviewer can verify or override it.
4. **Provenance unchanged:** a classified page still requires `sources` linking
   back to the originating `raw/` file. Classification does not replace or
   weaken the `sources`, `source_quotes`, `derived`, or `confidence` fields.

## Dedup: two-pass existence check (I2)

Before creating a new page for any extracted entity or concept, run a
**deterministic two-pass existence check** — exact title or alias string match
only. Deterministic string comparison only; no probabilistic or approximate
matching (§5 non-negotiable).

> DRY invariant: one page per concept / entity. A fact lives in exactly one
> page; the dedup check enforces this alias-aware.

### Pass 1 — exact title match

Compare the extracted concept name (case-insensitive) against the `title` field
of every existing page under `vault/wiki/`. If an exact title match is found,
**extend that page** — never create a duplicate.

### Pass 2 — alias-aware match

If pass 1 finds no match, compare the extracted concept name (case-insensitive)
against every entry in the `aliases` list of every existing page under
`vault/wiki/`. Example: a source about "automobile" must extend the existing
"Car" page that carries `aliases: ["automobile", "car"]`, not create a new page.

If an alias match is found, **extend the existing page** (add the new source to
`sources`, increment `update_count`, advance `updated`) — never create a
duplicate.

### Additive merge: sources are never dropped

When either pass finds a match, perform an **additive merge**: existing `sources`
are never dropped, overwritten, or lost. Every merge operation:

1. Adds the new source to the page's `sources` list (append only).
2. Increments `update_count`.
3. Advances `updated` to today's date.
4. Recalculates `confidence` per the confidence-discipline rules.

When no match is found in either pass, create a new typed page for the concept.

## Workflow

Follow the 13-step ingest sequence in `vault/CLAUDE.md` exactly. The short
version:

1. Read the schema.
2. Identify unprocessed sources (compare `vault/raw/` against
   `vault/wiki/log.md`).
3. For each source:
   a. Write the summary to `wiki/_sources/`.
   b. Extract entities and concepts. For each extracted item, apply the
      **Classification checklist** above before writing the page.
   c. For each extracted item, run the **two-pass existence check** (see
      "Dedup: two-pass existence check" above): pass 1 = exact title match;
      pass 2 = alias-aware match against existing pages' `aliases` fields.
      If either pass finds a match, extend that page (additive merge —
      existing `sources` are never dropped). Only create a new typed page when
      both passes return no match.
   d. For each extracted item, locate or create its topic folder.
   e. Add the new source to each touched page's `sources:`.
   f. Increment `update_count`; advance `updated`.
   g. Recalculate `confidence` per the confidence-discipline rules.
   h. Update per-folder `_index.md` `children:` / `child_indexes:`.
4. Append to `wiki/log.md`.
5. Print a summary table: sources processed, pages created, pages updated,
   folders touched.

## Agent-session sources: ingest like any source (no laundering)

A `source_type: agent-session` file written by the `Stop`/`SessionEnd` hook into
`raw/agent-sessions/` is a **real raw source** (`type: source`). It enters the
wiki through the same `_proposed/` review gate as every other source — never
as an unsourced `derived: true` page.

Concretely:

1. The hook writes `raw/agent-sessions/<session-id>-<timestamp>.md` and commits it.
2. The next `/claude-wiki-pages:wiki` or maintenance pass detects it as an unprocessed source
   (not yet in `wiki/log.md`).
3. Ingest creates `wiki/_sources/<slug>.md` with `source_type: agent-session`
   and extracts entities/concepts as drafts under `_proposed/`.
4. `propose approve` (or the review gate) promotes drafts to `wiki/`.
5. Every promoted wiki page lists the agent-session source in its `sources` field,
   keeping provenance structural.

**Never** write a session learning as `derived: true` or promote it directly to
`wiki/` without going through `_proposed/`. Provenance is structural (TEAM-BRIEF §5).

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

The `claude-wiki-pages-ingest-agent` agent looks for this prefix to know it can hand off
to `claude-wiki-pages-curator-agent`.
