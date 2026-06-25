---
title: "ADR-0022: Folder Notes v3"
type: entity
entity_type: standard
aliases: ["ADR-0022", "adr-0022", "folder notes ADR", "schema v3 ADR"]
parent: "[[adrs|ADRs]]"
path: "docs/adrs"
sources: ["[[docs-adr-0022|ADR-0022: Folder Notes as Folder-Named Files (schema_version 3)]]"]
related: []
tags: ["docs", "adrs", "schema"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0022: Folder Notes v3

The decision to change the per-folder index from `_index.md` to a folder note named after its folder (`wiki/<topic>/<topic>.md`), constituting schema_version 3.

## Overview

ADR-0022 is the schema change that introduced `schema_version: 3`. The per-folder index filename changes from the generic `_index.md` to a folder-eponymous name (`<topic>.md` inside `wiki/<topic>/`). This makes the folder note immediately recognizable, consistent with Obsidian Folder Notes conventions, and sortable at the top of the file list.

## Key Facts

**Status:** Accepted

**Problem being solved:** `_index.md` is opaque — it tells you nothing about which folder's index it is without reading its parent directory. In Obsidian it sorts to the top but is visually identical to any other underscore-prefixed file. The name collision risk (two `_index.md` files in the same vault lookup path) was also real.

**Decision:** Folder notes are now named after their folder:

| schema_version | Index filename | Example |
| --- | --- | --- |
| 1 and 2 | `_index.md` | `wiki/agents/_index.md` |
| 3 (this ADR) | `<folder>.md` | `wiki/agents/agents.md` |

**Migration:** `bash scripts/engine.sh migrate --target <vault> --write` runs the `rename-index` action: renames each `_index.md` to `<folder>.md` and rewrites every wikilink pointing at `_index` to the new name. Name conflicts (a non-index `agents.md` already exists) are reported and skipped.

**Backward compatibility:** Schema_version 1 and 2 vaults remain valid. `_index.md` is accepted but triggers a `legacy-index-filename` lint warning (WARN, not ERROR) so existing vaults do not break on upgrade.

**Normative wikilink form.** The `parent:`, `children:`, and `child_indexes:` fields must be quoted `"[[wikilink]]"` values — plain title strings produce no graph edge and are lint findings.

**Consequences:**
- Folder notes now visually cluster with their folder content in file explorers sorted by name.
- The Obsidian Folder Notes plugin works natively — it looks for a note with the same name as the folder.
- A new validation check (`legacy-index-filename`) was added to `verify-ingest.sh`.

## Related

The operations reference documents vault resolution. The strict-tree ADR (ADR-0036) builds on the folder-note convention as the anchor for spine edges.
