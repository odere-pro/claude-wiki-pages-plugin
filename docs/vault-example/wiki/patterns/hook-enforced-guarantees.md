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

The set of invariants that the plugin enforces at every tool-call boundary via Claude Code's hook bus, preventing schema drift without requiring the LLM to self-police.

## Definition

Hook-enforced guarantees are structural rules that fire automatically before or after every file write inside the vault. Claude Code's hook bus dispatches scripts at `SessionStart`, `PreToolUse`, `PostToolUse`, and `SubagentStop` events. Each script enforces one class of invariant and either blocks the write (PreToolUse), reminds the LLM to do follow-up work (PostToolUse), or aborts agent completion when the result is structurally broken (SubagentStop).

The guarantees operate below the LLM's decision layer: the LLM does not need to remember to validate frontmatter or check wikilink format — the hook rejects the write if those conditions are not met.

## Key Principles

Fail-closed at the boundary — `PreToolUse` hooks block the write before it lands. A missing required frontmatter field is caught before the file is created, not after a lint pass discovers it.

One script, one concern — each hook script enforces exactly one class of invariant. `validate-frontmatter.sh` checks required fields; `check-wikilinks.sh` enforces the `[[wikilink]]` format; `protect-raw.sh` enforces raw immutability; `validate-attachments.sh` checks attachment paths.

Gate on completion — `SubagentStop` hooks run `verify-ingest.sh` after every ingest agent run and `subagent-lint-gate.sh` after every curator run. If either finds unresolved errors, the agent completion is aborted. The failure is visible immediately rather than discovered days later.

## Examples

The `validate-frontmatter.sh` hook fires when a Write tool call targets any file under `wiki/`. It checks that the frontmatter contains every required field for the declared `type`. A concept page missing `sources:` is rejected with a descriptive error message.

The `protect-raw.sh` hook fires on any Write or Edit targeting a path under `vault/raw/`. The write is blocked unconditionally — raw sources are immutable after they are dropped in.

The `subagent-ingest-gate.sh` hook fires when the ingest agent stops. It runs `verify-ingest.sh` against the current vault state. If `verify-ingest.sh` exits non-zero, the agent completion is aborted and the failure is surfaced immediately.

## Related Concepts

- [[LLM Wiki Pattern]] — the broader pattern that these hooks make trustworthy at scale.
- [[Validation and Repair]] — the three-level validation workflow that complements the hook layer.
- [[Ingest Pipeline]] — the workflow whose structural integrity the SubagentStop hooks verify.
- [[Provenance-Tracked Wiki]] — the property the hooks collectively protect.
