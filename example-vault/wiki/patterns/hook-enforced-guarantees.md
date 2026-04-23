---
title: "Hook-Enforced Guarantees"
type: concept
aliases: ["Hook-Enforced Guarantees", "hook-enforced", "hook enforcement"]
parent: "[[Patterns — Index]]"
path: "patterns"
sources: ["[[Karpathy LLM Wiki Gist]]", "[[Obsidian Documentation]]"]
related: ["[[LLM Wiki Pattern]]", "[[Claude Code]]"]
contradicts: []
supersedes: []
depends_on: ["[[LLM Wiki Pattern]]"]
tags: []
created: 2026-04-18
updated: 2026-04-18
update_count: 1
status: active
confidence: 0.9
---

# Hook-Enforced Guarantees

## Definition

An approach to making schema invariants structural rather than cultural. Instead of asking the LLM to remember the rules, enforcement lives in tool-call hooks that block violating writes and run verifiers after agent work completes. The LLM discovers the rule by being blocked, not by being reminded.

## Key Principles

- **Pre-write validation.** Frontmatter and wikilink checks run before every `Write` or `Edit`; malformed output never lands on disk.
- **Post-write reminders.** After every wiki write, a hook prints what still needs to be updated (the folder's `_index.md`, the root index).
- **Completion gates.** When an agent finishes a multi-step run, a verifier reruns and the agent is blocked from reporting success if the vault still has errors.
- **Raw immutability.** Any write to `raw/` is rejected at the hook layer — the contamination boundary holds even if the LLM misreads the schema.

## Examples

`llm-wiki-stack` implements this with `PreToolUse`, `PostToolUse`, and `SubagentStop` hooks wired to scripts like `validate-frontmatter.sh`, `protect-raw.sh`, and `verify-ingest.sh`. The pattern applies beyond this stack: any system that can intercept tool calls can enforce the same shape.

## Related Concepts

- [[LLM Wiki Pattern]] — the pattern this enforcement supports.
- [[Claude Code]] — the tool-call harness whose hooks this stack relies on.
