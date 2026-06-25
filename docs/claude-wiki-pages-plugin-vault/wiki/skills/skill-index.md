---
title: "Index Skill"
type: entity
entity_type: tool
aliases: ["Index Skill", "index", "/claude-wiki-pages:index", "vault MOC refresh"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-index|Index Skill — SKILL.md]]"]
related: []
tags: ["skills", "layer-2", "index", "vault-moc"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Index Skill

The `index` skill generates or refreshes the vault MOC at `vault/wiki/index.md` — the top-level catalog of every topic folder and synthesis note. Per-folder folder notes are owned by the ingest workflow, not by this skill.

## Overview

The skill does not touch per-folder folder notes (`wiki/<topic>/<topic>.md`, or legacy `_index.md` where present). It only owns `wiki/index.md` — the root-level MOC.

Invocation triggers: a new top-level topic folder has been created; a synthesis note has been added; lint reports vault-MOC drift; user asks for an index refresh.

## Key Facts

**Body format**:
- `## Topics`: one line per top-level folder (excluding underscore-prefixed) — wikilink to the folder note + one-line summary from the folder note
- `## Synthesis`: one line per file — piped basename target (bare `[[Title]]` does not resolve to a kebab-case filename → ghost node)
- Ends with `_Generated <YYYY-MM-DD>._`

**Ordering convention**:
- Topics: alphabetical by folder name
- Syntheses: chronological by `created:` ascending, ties broken alphabetically

**Idempotency check**: if the current `wiki/index.md` is byte-identical to what would be written, skip the write but still log the refresh.

**The skill never touches**: per-folder folder notes; any page other than `wiki/index.md` and `wiki/log.md`; entry order (must be stable — repeated runs on an unchanged tree produce no diff).

## Related

Called after `[[skill-synthesize|Synthesize Skill]]` (which reminds the user to refresh the MOC after writing a new synthesis note).
