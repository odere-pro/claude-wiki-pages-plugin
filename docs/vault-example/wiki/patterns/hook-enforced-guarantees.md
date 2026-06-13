---
title: "Hook-Enforced Guarantees"
type: concept
aliases: ["Hook-Enforced Guarantees", "hook-enforced guarantees", "hook guarantees"]
parent: "[[Patterns]]"
path: "patterns"
sources:
  - "[[Getting Started]]"
  - "[[Create a New Vault]]"
  - "[[Update an Existing Vault]]"
  - "[[Review, Validate, Fix]]"
related:
  - "[[LLM Wiki Pattern]]"
  - "[[Provenance-Tracked Wiki]]"
  - "[[Validation and Repair]]"
  - "[[Ingest Pipeline]]"
depends_on:
  - "[[Claude Code]]"
  - "[[claude-wiki-pages Plugin]]"
tags: []
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Hook-Enforced Guarantees

Hook-enforced guarantees are the set of invariants that the plugin enforces at every tool-call boundary via Claude Code's hook bus. They prevent schema drift without requiring the LLM to self-police.

## Hook events and scripts

| Event | Script | What it enforces |
| --- | --- | --- |
| `SessionStart` | `session-start.sh` | Preamble reminding the LLM to read `vault/CLAUDE.md` |
| `PreToolUse` (Write/Edit) | `validate-frontmatter.sh` | Required frontmatter fields per type |
| `PreToolUse` (Write/Edit) | `check-wikilinks.sh` | `[[wikilink]]` format in wiki pages |
| `PreToolUse` (Write/Edit) | `protect-raw.sh` | Immutability of `vault/raw/` |
| `PreToolUse` (Write/Edit) | `validate-attachments.sh` | Attachment path existence for non-text sources |
| `PostToolUse` (Write/Edit) | `post-wiki-write.sh` | Reminder to update folder notes and the vault MOC |
| `SubagentStop` | `subagent-ingest-gate.sh` | Post-ingest structural integrity |
| `SubagentStop` | `subagent-lint-gate.sh` | Unresolved errors after curator agent |

## What they guarantee

- No wiki page can be written without the required frontmatter fields for its type.
- Internal cross-references use `[[wikilinks]]`, not raw file-path markdown links.
- No file in `vault/raw/` can be modified after creation.
- No source note can reference an attachment file that does not exist.
- Every post-ingest state is verified before the agent completes.

## What they do NOT guarantee

- Content quality (that claims are accurate).
- Near-duplicate detection (the curator agent flags these, but hooks do not block them).
- Semantic validity of confidence values.
