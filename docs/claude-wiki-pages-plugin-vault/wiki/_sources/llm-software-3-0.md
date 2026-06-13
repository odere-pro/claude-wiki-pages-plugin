---
title: "SOFTWARE-3-0: Dual Entry Point"
type: source
source_type: manual
source_format: text
url: ""
author: "Aleksandr Derechei"
publisher: "odere-pro/claude-wiki-pages-plugin"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["architecture", "dual-entry-point", "six-surfaces", "dev-time", "agent-on-ramp"]
aliases: ["SOFTWARE-3-0: Dual Entry Point", "llm-software-3-0", "SOFTWARE-3-0 doc", "dual entry point doc"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# SOFTWARE-3-0: Dual Entry Point

## Metadata

- **Author:** Aleksandr Derechei
- **Publisher:** odere-pro/claude-wiki-pages-plugin
- **Published:** 2026-06-13
- **URL:** raw/repo/llm/SOFTWARE-3-0.md

## Summary

`SOFTWARE-3-0.md` is the "dual entry point" for the `claude-wiki-pages` plugin repository — a single file usable by both a person and an agent as the front door to the project. It defines one rule: it links, it never restates. Every surface of the project must be reachable from it, with both a human on-ramp and an agent on-ramp per row. A parity gate enforces this.

The file maps six surfaces to their on-ramps: Docs, Tools, Design, System design, Context, and Memory. The single entry verb `/claude-wiki-pages:wiki` is the human on-ramp to Tools; the agent on-ramp is `skills/engine-api` (the engine subcommands reference). The schema authority is `docs/vault-example/CLAUDE.md` (`ontology-profile-v1`).

Authoring flow: person and agent follow the same path — typed template → `skills/draft` writes to `_proposed/` → `skills/review` gates promotion into `wiki/`. Nothing reaches the wiki unreviewed. The file also documents the three secure-and-traceable construction principles: write confinement (firewall.sh + raw/ immutability), structural provenance (sources/source_quotes/derived/confidence), and audit trail (agent-session raw sources + `_proposed/` gate + log).

This file is dev-time only — it is not copied into a user's vault on install.

## Key Claims

- The one rule: every row in the six-surfaces table must have both a human and an agent on-ramp. A row with only one is a defect; a parity gate enforces it.
- Six surfaces: Docs, Tools, Design, System design, Context, Memory — each with human and agent on-ramps.
- Single entry verb `/claude-wiki-pages:wiki` is the human on-ramp; agent on-ramp is `skills/engine-api` + `skills/maintain-contract`.
- The schema authority is `ontology-profile-v1` in `docs/vault-example/CLAUDE.md` — read it, do not fork it.
- Authoring path: template → `_proposed/` (via `skills/draft`) → `wiki/` (via `skills/review`). Nothing unreviewed reaches `wiki/`.
- Write confinement: `scripts/firewall.sh` (PreToolUse hook) fences every write to the resolved vault; `raw/` is immutable.
- Audit trail: agent session learnings are committed as `source_type: agent-session` raw sources via ADR-0010 + `_proposed/` gate.
- This file is dev-time only — not copied to a user's vault; runtime on-ramp is the resolved vault's `CLAUDE.md` via `session-start.sh`.

## Entities Mentioned

(No concrete entities beyond those already tracked in the wiki.)

## Concepts Covered

- [[Six Surfaces Dual-Reader Contract]]
- [[Dual Entry Point]]
- [[Plugin Dev-Time vs Runtime]]
- [[Draft Review Surface]]
- [[Ingest Pipeline]]
