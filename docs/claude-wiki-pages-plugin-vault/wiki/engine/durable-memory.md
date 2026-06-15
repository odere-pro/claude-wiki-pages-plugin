---
title: "Durable Memory"
type: concept
aliases: ["Durable Memory", "durable memory", "durable-memory carve-out", "agent session memory", "persistent agent memory"]
parent: "[[engine|Wiki Engine]]"
path: "engine"
sources: ["[[adr-0010-durable-memory|ADR-0010: Durable-Memory Carve-Out]]", "[[design-03-sequences|Design: Sequences]]"]
related: ["[[ingest-agent|Ingest Agent]]", "[[curator-agent|Curator Agent]]", "[[Firewall]]", "[[draft-review-surface|Draft Review Surface]]", "[[active-vault|Active Vault]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "architecture", "memory", "agent-session"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Durable Memory

> [!summary]
> Durable memory is the mechanism by which agent sessions write learnings back into the vault for future use. Agent session write-backs land in `raw/agent-sessions/` as new files only (no edits to existing sources) and must carry `source_type: agent-session` frontmatter. The `_proposed/` review gate is the only sanctioned path for durable memory to reach `wiki/`. Session learnings are promoted via lazy ingest on the next `/claude-wiki-pages:wiki` call.

## Key Principles

- Agent sessions are stateless across Claude Code sessions; durable memory provides the cross-session persistence mechanism.
- Write-backs are new files only — existing `raw/` files are immutable and cannot be edited by a session.
- The `_proposed/` review gate is the mandatory path: no session learning goes directly to `wiki/` without human review.
- Ingest is lazy: session files sit in `raw/agent-sessions/` until the next `/claude-wiki-pages:wiki` call, so session end is never blocked by a long ingest operation.
- `source_type: agent-session` is machine-detectable; the validator blocks any `raw/agent-sessions/` file that omits it.

## Examples

A session write-back file placed in `raw/agent-sessions/` after a query session:

```markdown
---
title: "Session learning: firewall cross-vault edge case 2026-06-13"
source_type: agent-session
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 0.7
---

During the query session, the firewall's cross-vault rule was observed to...
```

On the next wiki call, this file is processed as a source and produces a draft in `_proposed/wiki/engine/firewall-cross-vault-edge-case.md` awaiting review.

## Definition

Agents operating within claude-wiki-pages are stateless between sessions — Claude Code's context window resets. Durable memory is the design that allows a session to leave a trace in the vault that future sessions can build on: a session that discovers a nuance, resolves an ambiguity, or synthesizes a cross-topic connection can write that learning to `raw/agent-sessions/`, where it will be ingested and promoted to `wiki/` through the standard pipeline.

## Write-Back Contract (ADR-0010)

Three constraints bind all durable memory write-backs:

1. **New files only.** An agent session can create files in `raw/agent-sessions/` but cannot edit existing files there (or anywhere else in `raw/`). This preserves source immutability and makes session contributions distinguishable from curated sources.
2. **`source_type: agent-session` required.** Any file in `raw/agent-sessions/` without this frontmatter field is blocked by `protect-raw.sh`. This makes session contributions machine-distinguishable from human-curated sources.
3. **`_proposed/` gate.** Session learnings do not go directly to `wiki/`. They are ingested as raw sources and produce draft pages in `_proposed/`, which a human reviews via `/claude-wiki-pages:review` before promotion to `wiki/`.

## When Write-Backs Happen

Stop/SessionEnd hooks fire at the end of every Claude Code session. These hooks give the agent an opportunity to write session learnings to `raw/agent-sessions/`. The hook fires even on normal session end (not just on explicit stop).

**Lazy ingest:** session pages are not immediately ingested. They sit as pending raw sources until the user next runs `/claude-wiki-pages:wiki` (or the maintenance agent runs). This is deliberate: immediate ingest would block session end on a potentially long operation.

## Review Gate

Every durable memory write-back goes through the `_proposed/` review gate:

1. Agent writes `raw/agent-sessions/<timestamp>-<slug>.md` with `source_type: agent-session`
2. Next wiki run: ingest processes the session source and creates a draft in `_proposed/wiki/<topic>/<slug>.md`
3. User reviews: `/claude-wiki-pages:review` shows the draft; `/claude-wiki-pages:review approve` promotes it to `wiki/`
4. Curator agent adds the promoted page to the topic index

The review gate ensures that session learnings are human-validated before entering the trusted knowledge base. An agent that produces poor synthesis or incorrect inferences cannot silently corrupt the wiki.

## Related Concepts

- [[ingest-agent|Ingest Agent]] — processes `raw/agent-sessions/` files through the standard ingest pipeline
- [[curator-agent|Curator Agent]] — auto-heals the wiki after promotion; also manages the `_proposed/` gate
- [[Firewall]] — enforces that `raw/agent-sessions/` writes are new-file-only
- [[draft-review-surface|Draft Review Surface]] — the `review`, `approve`, and `reject` verbs that manage `_proposed/`
- [[active-vault|Active Vault]] — the vault to which all write-backs (including session files) are confined
