---
title: "Raw Immutability"
type: concept
aliases: ["raw immutability", "immutable sources", "raw/ protection"]
parent: "[[rules|Rules]]"
path: "rules"
sources: ["[[rules-raw-immutable|Raw Immutability Rule]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["rules", "raw", "immutability", "security"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Raw Immutability

Raw immutability is the invariant that source files in `vault/raw/` are never modified, renamed, or deleted after they are placed there.

## Definition

`vault/raw/` holds the original human-curated source material — articles, PDFs, clipped pages, transcripts. Once placed, these files are treated as immutable data. Corrections to perceived errors in the source are recorded in the wiki page that summarises it, not in the raw file itself.

## Key Principles

- Files in `vault/raw/` are write-protected after placement.
- The only sanctioned write operation to `vault/raw/` is adding a new file.
- Processing a raw source goes through `/claude-wiki-pages:ingest`, which reads from `raw/` and writes to `wiki/`.
- The `protect-raw.sh` hook enforces this constraint at the `PreToolUse` boundary — any attempt to edit or delete an existing `raw/` file is blocked.
- The one carve-out is `raw/agent-sessions/`: new session files may be written there, but existing ones cannot be overwritten (immutability still holds for the written file after the first write).

## Examples

If a scraped article contains a formatting error, the wiki's source-summary page notes the correction under "Key Claims" — the raw file is left as-is so the original provenance is preserved.

## Related Concepts

The `protect-raw.sh` script enforces this rule mechanically. The adversarial test suite (`tests/adversarial/replay-corpus.sh`) asserts that injected write payloads targeting `vault/raw/` existing files are blocked. Prompt-injection defense relies partly on this invariant: a malicious source cannot rewrite itself after ingestion to become more convincing.
