---
title: "Review Gate"
type: concept
aliases: ["Review Gate", "review gate", "_proposed/ gate", "proposed gate", "draft review gate"]
parent: "[[Wiki Pages]]"
path: "wiki-pages"
sources: ["[[ADR-0010: Durable-Memory Carve-Out]]", "[[Design: Sequences]]"]
related: ["[[Durable Memory]]", "[[Draft Review Surface]]", "[[Ingest Agent]]", "[[Curator Agent]]", "[[Firewall]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "architecture", "agent-session", "review"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Review Gate

> [!summary]
> The review gate is the `_proposed/` staging area that sits between agent-produced drafts and the live wiki. Every draft (whether from a local model via `offline-draft.sh` or from durable memory write-backs) lands in `_proposed/wiki/<topic>/<slug>.md` and must be explicitly approved by a human before promotion to `wiki/`. The gate is the trust boundary between LLM output and curated knowledge.

## Key Principles

- The review gate is the trust boundary between LLM output and curated knowledge — no draft enters `wiki/` without explicit human approval.
- Drafts in `_proposed/` are outside every wiki-scoped check (frontmatter validation, wikilinks, lint, index membership) and cannot pollute the wiki until promoted.
- Two sources of drafts: durable memory write-backs (agent sessions → `raw/agent-sessions/` → ingest → `_proposed/`) and local model offline drafts (`scripts/offline-draft.sh` → `_proposed/`).
- Drafts carry `proposed_by:` to record the producer; this field is removed on promotion, but the git history retains the provenance audit trail.
- Rejection moves drafts to `_proposed/rejected/` rather than deleting them, preserving the audit trail.

## Examples

Reviewing pending drafts and approving one:

```bash
bash scripts/engine.sh review list --target <vault> --json
# Output: [{ "path": "_proposed/wiki/engine/new-concept.md", "proposed_by": "claude", "status": "draft" }]

bash scripts/engine.sh review approve _proposed/wiki/engine/new-concept.md --target <vault>
# Clears proposed_by, sets status: active, stamps updated, adds to topic index, git checkpoint
```

Or via slash command:

```
/claude-wiki-pages:review
```

## Definition

ADR-0010 established the `_proposed/` gate as the only sanctioned path for LLM-produced content to enter the wiki. This applies to two sources of drafts:

1. **Durable memory write-backs** — agent sessions that write learnings to `raw/agent-sessions/` produce draft wiki pages via the ingest pipeline; these drafts land in `_proposed/` rather than going directly to `wiki/`.
2. **Local model drafts** — `scripts/offline-draft.sh` produces drafts in `_proposed/` via Ollama; they stay there until reviewed.

**Key invariant: no draft enters `wiki/` without human review.** The `_proposed/` directory is outside every wiki-scoped check (frontmatter validation, wikilinks, lint, index membership). Drafts cannot pollute the wiki because they are not in it.

## Gate Operations

The review gate is managed by the [[Draft Review Surface]] (engine `review`, `approve`, `reject` verbs):

```bash
# List pending drafts
engine.sh review list --target <vault> --json

# Approve a draft (promote to wiki/)
engine.sh review approve <draft-path> --target <vault>

# Reject a draft (discard)
engine.sh review reject <draft-path> --target <vault>
```

Or via slash command:

```
/claude-wiki-pages:review
```

**On approval:** the engine clears `proposed_by:` from frontmatter, sets `status: active`, stamps `updated:`, commits under a git checkpoint, and adds the promoted page to the topic index.

**On rejection:** the draft is moved to `_proposed/rejected/` (not deleted) for audit trail. No wiki changes.

## Draft Frontmatter

Drafts in `_proposed/` carry two additional frontmatter fields not present on live wiki pages:

```yaml
status: draft
proposed_by: "ollama:qwen3-coder:30b" # or "claude" for session write-backs
```

`proposed_by` records what produced the draft. Removed on promotion. This makes it possible to audit the provenance of every page in the wiki: if it was ever a draft, the git history shows when it was proposed and when it was approved.

## Why Not Auto-Promote

Auto-promotion would remove the trust boundary. The plugin's provenance discipline requires that every claim in the wiki traces to a curated source. A durable memory write-back or local model draft has not been curated — it has been generated. The review gate is where curation happens.

The [[Durable Memory]] write-back workflow is designed for low overhead (a session writes learnings, the next wiki call queues them for review) not zero overhead. The human review step is intentional.

## Related Concepts

- [[Durable Memory]] — the mechanism that produces agent-session drafts through the review gate
- [[Draft Review Surface]] — the engine verbs (`review`, `approve`, `reject`) that manage the gate
- [[Ingest Agent]] — processes `raw/agent-sessions/` sources and creates drafts in `_proposed/`
- [[Curator Agent]] — runs after approval to heal the wiki and update indexes
- [[Firewall]] — enforces that `_proposed/` is a legitimate write target (on the allowPaths list)
