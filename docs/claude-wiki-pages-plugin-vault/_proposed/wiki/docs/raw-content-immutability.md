---
title: "Raw Content Immutability"
type: concept
aliases: ["raw immutability", "raw/ immutability", "immutable source material", "protect-raw", "raw content"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]", "[[docs-architecture|Four-Layer Architecture]]"]
related: []
tags: ["docs", "security", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.95
derived: false
proposed_by: "claude"
---

# Raw Content Immutability

The hard rule that no agent or script may write, edit, or delete files under `raw/` — source material is the ground truth, and overwriting it would corrupt the provenance chain.

## Definition

Raw content immutability is the invariant that files under `vault/raw/` are never modified by the plugin. They are written once (by the user, a sync operation, or a wired-source snapshot) and thereafter read-only. The plugin reads raw files to extract wiki content; it never writes them back.

The immutability guarantee is enforced by two complementary mechanisms:

1. **`protect-raw.sh`** — a `PreToolUse` hook that intercepts Write, Edit, and destructive Bash calls targeting any path under `raw/` and exits 2 (block) before the write occurs.
2. **Firewall `denyPaths`** — the firewall configuration includes `denyPaths: ["raw/**"]` in the default configuration, adding a second layer of enforcement. Even if `protect-raw.sh` were not wired, the firewall would block the write.

Both mechanisms are enforced at the Layer 4 hook level — they fire before any agent write call reaches the filesystem.

## Key Principles

**Source files are ground truth.** The provenance chain depends on raw files being stable: a wiki page's `sources:` points to a source note, which records the raw file path. If the raw file were modified, the provenance trace would be misleading — the source note describes a document that no longer exists at the recorded path.

**Updates via `sync`, not direct edit.** When a raw source changes (e.g. a wired project's docs are updated), the `sync` verb pulls a new immutable snapshot into `raw/wired/<name>/` and marks the old source note as `status: superseded`. The old file is preserved; the new file is a new entry. History accumulates; nothing is overwritten.

**`raw/assets/` is also immutable.** The assets directory (`raw/assets/`) holds images, PDFs, and other binary attachments. It is subject to the same immutability guarantee as the rest of `raw/`. Asset files are referenced by source notes via `attachment_path:` and `source_format: pdf | image`.

**The ingest pipeline treats raw content as data, not instructions.** The ingest agent reads raw files for extraction but explicitly treats their content as untrusted input: embedded prompts or instructions inside a raw source are ignored as data; the agent extracts structure and summarizes, never executing embedded instructions.

**`raw/wired/<name>/` for wired-source snapshots.** When a git repo is registered as a wired source, `wire-source.sh` snapshots changed docs into `raw/wired/<name>/` as immutable point-in-time copies. These nested snapshots are subject to the same immutability guarantee as hand-dropped files.

## Examples

An agent attempts to fix a typo in `raw/papers/my-paper.md`. The `protect-raw.sh` hook intercepts the Write call, checks that the target path starts with `raw/`, and exits 2. The write is rejected. The agent must instead note the typo in the wiki page's body or create a source note that describes the corrected understanding.

A user drops `raw/notes/2026-06-25-meeting.md` into the vault. The ingest pipeline reads it, extracts four concept items, and writes pages to `wiki/project/`. The raw file is not touched during or after ingest. Six months later, the raw file is still at `raw/notes/2026-06-25-meeting.md`, unchanged, as the provenance anchor for the four concept pages.

## Related Concepts

Raw content immutability is enforced by `protect-raw.sh` and the firewall `denyPaths` configuration. It is the foundation of the provenance chain (raw files are the terminal node of the two-hop provenance trace). The `sync` verb and wired-source snapshots are the controlled update paths. The `source_format` and `attachment_path` fields govern non-text source handling.
---
