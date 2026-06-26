---
title: "_proposed/ Review Channel"
type: concept
aliases: ["_proposed/", "proposed channel", "draft channel", "review gate", "proposed draft"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]"]
related: []
tags: ["docs", "workflow", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.95
derived: false
proposed_by: "claude"
---

# _proposed/ Review Channel

The staging directory (`vault/_proposed/`) that holds proposed wiki drafts outside every wiki-scoped check, giving a human a review gate before any draft is promoted into the live wiki.

## Definition

The `_proposed/` directory is a sibling of `wiki/` at the vault root. It is the single sanctioned staging area for drafts that are not yet ready for the live wiki. Drafts mirror their eventual `wiki/` path: a draft for `wiki/docs/my-concept.md` lives at `_proposed/wiki/docs/my-concept.md`. This mirroring makes promotion a deterministic file move rather than a path-resolution problem.

The channel has two primary producers:

1. **Local model drafting** — the `/claude-wiki-pages:draft` skill with `localModel.enabled` writes output to `_proposed/` rather than directly to `wiki/`. This allows a local model (Ollama, LM Studio) to produce drafts that a human or the review gate inspects before they become part of the live wiki.
2. **Unattended maintenance** — in `maintenance.unattended: true` mode, any output that is uncertain (`derived: true` or `confidence < 0.8`) is routed to `_proposed/` rather than auto-promoted. The maintenance loop never promotes drafts automatically.

These are the only two producers. Claude (interactive session) writes directly to `wiki/` — it does not route through `_proposed/` in the normal interactive path.

## Key Principles

**Outside all wiki-scoped checks.** `_proposed/` is excluded from frontmatter validation, wikilink lint, index consistency checks, and verify-ingest. This is intentional: a draft may be incomplete or have placeholder links, and it must not pollute the live wiki's health score. The exclusion is enforced by Obsidian's `userIgnoreFilters` (which excludes `_proposed/` from the index) and by the engine's lint scope (which scans only `wiki/`).

**`status: draft` and `proposed_by:`.** Every draft carries these two frontmatter fields. `proposed_by:` records what produced the draft (e.g. `"ollama:llama3"`, `"claude"`). Both fields are removed when the draft is promoted.

**Promotion via `propose approve` only.** The `/claude-wiki-pages:review` skill backed by `engine propose approve` is the only sanctioned path from `_proposed/` to `wiki/`. It clears `proposed_by:`, sets `status: active`, stamps `updated:`, and commits the promotion under a git checkpoint. Never hand-copy a draft into `wiki/` — that bypasses the checkpoint and may introduce an un-audited page.

**Exactly one `_proposed/` channel.** There is no alternative staging directory. The design principle "one advertised path per task" applies here: `_proposed/` is the single draft mechanism. A second draft mechanism would split the review workflow.

**No recursion, no auto-promotion.** The review gate is human-in-the-loop by design. In interactive mode, the human runs `/claude-wiki-pages:review`. In unattended mode, drafts accumulate in `_proposed/` until a human reviews them. The orchestrator never auto-promotes.

## Examples

A local model running via `scripts/offline-draft.sh` produces a draft at `_proposed/wiki/agents/new-agent.md` with `proposed_by: "ollama:qwen3-coder"` and `status: draft`. The human opens the file, edits as needed, then runs `/claude-wiki-pages:review`, which promotes it to `wiki/agents/new-agent.md` under a git checkpoint.

In unattended maintenance mode, an ingest run that produces a synthesis note with `confidence: 0.65` routes it to `_proposed/wiki/_synthesis/gap-analysis.md` rather than writing to `wiki/` directly. The human reviews it at the next session.

## Related Concepts

The `_proposed/` channel is implemented by the `propose` engine command and the `/claude-wiki-pages:review` skill. It is used by the `draft` skill (local model path) and by unattended maintenance. The `_inbox/` directory is a different concept — it is a stub quarantine for pages that would be shadow edges, not a draft staging area.
---
