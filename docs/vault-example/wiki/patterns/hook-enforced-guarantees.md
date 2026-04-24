---
title: "Hook-Enforced Guarantees"
type: concept
aliases: ["Hook-Enforced Guarantees", "hook-enforced-guarantees"]
parent: "[[Patterns — Index]]"
path: "patterns"
sources:
  - "[[Using llm-wiki-stack]]"
  - "[[Getting Started]]"
  - "[[Update an Existing Vault]]"
  - "[[Review, Validate, Fix]]"
  - "[[Check the Dashboard]]"
related: ["[[LLM Wiki Pattern]]", "[[Lint-Fix Workflow]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["pattern", "safety"]
created: 2026-04-24
updated: 2026-04-24
update_count: 1
status: active
confidence: 0.9
---

# Hook-Enforced Guarantees

## Definition

Schema invariants and safety properties that live in `PreToolUse` and `SubagentStop` hooks rather than in model prompts or convention. The premise: a model cannot be trusted to consistently follow rules over thousands of writes; a shell script run before every write is far more reliable.

## Key Principles

- The hook is the contract. If the hook does not block, the rule is not enforced — period.
- Hooks are surfaced verbatim. When `validate-frontmatter.sh` blocks a write, the model sees the same error a CLI user would.
- Hooks form a layered defense: `protect-raw.sh` blocks any write under `raw/`; `validate-frontmatter.sh` blocks malformed frontmatter; `check-wikilinks.sh` blocks plain markdown links where wikilinks are required; `validate-attachments.sh` blocks source notes that reference missing attachment files; `subagent-ingest-gate.sh` and `subagent-lint-gate.sh` abort agent completion if the wiki is left in a broken state.

## Examples

- A user writes a new entity page but forgets `entity_type`; `validate-frontmatter.sh` blocks the write with the missing-field message.
- An agent finishes ingest but leaves an `_index.md` referencing a missing child; `subagent-ingest-gate.sh` reruns `verify-ingest.sh`, finds the error, and aborts the agent's "done" signal.
- The `llm-wiki-status` smoke test exercises every hook by issuing known-bad writes and confirming each one is blocked.

## Related Concepts

- [[LLM Wiki Pattern]] — the pattern this guarantee supports.
- [[Lint-Fix Workflow]] — the human-in-the-loop layer for what hooks cannot enforce.
