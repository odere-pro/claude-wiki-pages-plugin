---
title: "Folder Note"
type: concept
aliases: ["Folder Note", "folder note", "per-folder index", "MOC", "Map of Content"]
parent: "[[wiki-pages|Wiki Pages]]"
path: "wiki-pages"
sources: ["[[adr-0022-folder-notes-graph-quality|ADR-0022: Folder Notes and Graph Quality]]", "[[_sources/architecture|Architecture Documentation]]", "[[_sources/glossary|Glossary]]"]
related: ["[[ingest-pipeline|Ingest Pipeline]]", "[[polish-agent|Polish Agent]]", "[[wiki-only-graph|Wiki-Only Graph]]", "[[schema-authority|Schema Authority]]", "[[Auto-Heal]]"]
tags: ["concept", "schema", "moc"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Folder Note

> [!summary]
> A folder note is the per-folder index file — named exactly after its folder (`wiki/<topic>/<topic>.md`, `type: index`) — that serves as the navigable Map of Content (MOC) for that branch of the wiki topic tree. It is the structural anchor of the wiki: it lists every page in its folder and every sub-folder's folder note. Hierarchy fields (`parent`, `children`, `child_indexes`) must be quoted wikilink values — plain strings produce no graph edge and are a lint error. The [[polish-agent|Polish Agent]] keeps folder notes current after every write.

## Key Principles

- Every topic folder in `wiki/` contains exactly one folder note named after its folder (`wiki/<topic>/<topic>.md`, `type: index`).
- Hierarchy fields (`parent`, `children`, `child_indexes`) must be quoted wikilink values — plain strings produce no graph edge and are an ERROR finding at `engine verify`.
- The `title` value must appear as the first entry in `aliases` to prevent ghost nodes in the Obsidian graph when other pages link to this folder note.
- The [[polish-agent|Polish Agent]] maintains folder notes idempotently after every write (append-only for `children`; removals require editorial judgment by the [[curator-agent|Curator Agent]]).
- Legacy `_index.md` filenames are accepted at schema_version 3 but flagged `legacy-index-filename`; remediation is `bash scripts/engine.sh migrate --write`.

## Examples

A correct folder-note frontmatter block:

```yaml
---
title: "Wiki Engine"
type: index
aliases: ["Wiki Engine", "wiki engine", "engine", "Engine"]
parent: "[[index|Wiki Index]]"
path: "engine"
children:
  - "[[deterministic-engine|Deterministic Engine]]"
  - "[[Firewall]]"
child_indexes: []
created: 2026-06-13
updated: 2026-06-13
---
```

Repairing missing or drifted folder notes:

```bash
bash scripts/engine.sh heal --target <vault>
# Creates missing folder notes, repairs children drift, rewrites plain-string hierarchy links
```

## Definition

Every topic folder in `wiki/` contains exactly one folder note. The folder note:

- Is named after its folder: `wiki/engine/engine.md` is the folder note for `wiki/engine/`.
- Has `type: index`.
- Lists all pages in its folder in `children:`.
- Lists all direct sub-folder notes in `child_indexes:`.
- Points to its parent's folder note in `parent:`.
- Carries `aliases` that include the topic name in all common variants.

The root index is always `wiki/index.md` — a special case with no `parent`.

## Required Frontmatter

```yaml
---
title: "Wiki Engine"
type: index
aliases: ["Wiki Engine", "wiki engine", "engine", "Engine"]
parent: "[[index|Wiki Index]]"
path: "engine"
children:
  - "[[deterministic-engine|Deterministic Engine]]"
  - "[[Firewall]]"
  - "[[search-score-object|Search Score Object]]"
child_indexes: []
tags: []
created: 2026-06-13
updated: 2026-06-13
---
```

Key constraints:

- `children` and `child_indexes` must be quoted wikilink entries — not plain titles.
- `aliases` must include the `title` value as its first entry (ghost-node prevention).
- `parent` must be a quoted wikilink — not a plain string.

## Why Wikilink Syntax Is Mandatory

Obsidian's graph view and link resolution work through wikilinks, not plain text. A `children` entry like `"Four-Layer Stack"` (plain title) is invisible to the graph — it produces no edge. Only `"[[four-layer-stack|Four-Layer Stack]]"` creates a graph edge. The engine verifies this; `engine verify` reports plain-string hierarchy fields as ERROR findings.

This is why the schema instruction reads: "MUST be quoted wikilink values — a plain title string produces no graph edge and is a lint finding."

## Aliases — Ghost Node Prevention

Every folder note must include the `title` value as the first entry in `aliases`. Without this, a wikilink like `[[engine|Wiki Engine]]` from another page creates a ghost node in the Obsidian graph (a node that appears but has no content page). The `title` in `aliases` makes Obsidian resolve the wikilink to the existing file.

Aliases should also include:

- The kebab-case slug (matches the filename)
- Common abbreviations
- Any title variant that other pages might use

## Legacy `_index.md`

Before schema_version 3, the per-folder index was named `_index.md`. At schema_version 3, folder notes are named after their folder. Legacy `_index.md` files are accepted but flagged with a `legacy-index-filename` WARNING at verify time.

Remediation:

```bash
bash scripts/engine.sh migrate --target <vault> --write
```

The `migrate` verb renames each `_index.md` to its folder-note name and rewrites all wikilinks that pointed at it. Name conflicts (where the target name is already taken) are reported and skipped — no data is lost.

## Folder Note Body

The folder note body is a Map of Content: a brief description of the topic, followed by a list of links to the pages in the folder. The [[ingest-pipeline|Ingest Pipeline]] creates the initial structure; the [[polish-agent|Polish Agent]] maintains it.

```markdown
# Architecture

The architecture topic covers the four-layer plugin structure, agents, tools, and orchestration mechanisms.

## Pages

- [[four-layer-stack|Four-Layer Stack]] — the four-layer Data/Skills/Agents/Orchestration model
- [[deterministic-engine|Deterministic Engine]] — the Bun CLI for vault validation and search
- [[orchestrator-agent|Orchestrator Agent]] — the top-level dispatch agent
```

## Folder Note Lifecycle

| Event                                           | Effect on folder note                                       |
| ----------------------------------------------- | ----------------------------------------------------------- |
| New page created in folder                      | `children` gains a new wikilink entry                       |
| New sub-folder created                          | `child_indexes` gains the sub-folder's folder note wikilink |
| Page moved to a different folder                | `children` entry removed from old folder note; added to new |
| Folder note missing from folder                 | `engine heal` creates it (deterministic fix)                |
| `children` drift (page on disk but not in list) | [[polish-agent|Polish Agent]] reconciles (append-only)                   |

The [[ingest-pipeline|Ingest Pipeline]] updates the folder note at step 11 of every ingest. The polish agent reconciles after every write. The engine's `heal` verb creates missing folder notes as a deterministic structural fix.

## Children Drift Detection

`engine verify` compares the folder note's `children` list to the actual `.md` files in the folder. Any page on disk but absent from `children` is reported as a WARNING finding (`children-drift`). The engine's `heal` verb auto-repairs this.

`child_indexes` drift (a sub-folder has a folder note but is not listed in the parent's `child_indexes`) is also checked and auto-repaired by `heal`.

## What "Done" Looks Like

A correct folder note:

- All pages currently in the folder appear in `children` as quoted wikilink entries.
- All sub-folder folder notes appear in `child_indexes` as quoted wikilink entries.
- `parent` points to the correct parent folder note (not a plain string).
- `aliases` includes the `title` value as the first entry.
- `type: index` (not `type: topic` or anything else).
- `engine verify` reports 0 errors and 0 warnings for this folder.

## Related Concepts

- [[ingest-pipeline|Ingest Pipeline]] — creates folder notes (step 3) and updates them (step 11)
- [[polish-agent|Polish Agent]] — reconciles folder note children against filesystem siblings after every write
- [[wiki-only-graph|Wiki-Only Graph]] — graph color groups use `path:wiki/<topic>` to match folder notes
- [[schema-authority|Schema Authority]] — `CLAUDE.md` defines the complete folder note schema
- [[Auto-Heal]] — the engine's repair mechanism for missing or drifted folder notes
