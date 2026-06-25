---
title: "graph-quality.sh"
type: entity
entity_type: tool
aliases: ["graph-quality.sh", "Graph Quality Scanner"]
parent: "[[scripts|Scripts]]"
path: "scripts"
sources: ["[[scripts-graph-quality-sh|scripts/graph-quality.sh]]"]
related: []
tags: ["scripts", "graph-quality", "no-rag", "wikilink-validation"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# graph-quality.sh

Deterministic dangling-wikilink scanner and topic-cluster metric reporter.

## Overview

`scripts/graph-quality.sh` is a thin bash wrapper over `scripts/graph-quality.ts`. It fills the gap left by the engine's `verify` command, which checks structural integrity but does not detect dangling `[[wikilinks]]` — links whose target resolves to no page and appear as empty grey nodes in Obsidian's graph view.

## Key Facts

- **Dangling link scan:** resolves every wikilink in the vault using the engine's Obsidian-accurate resolver (`src/core/link-resolver.ts`). Links with no matching page are reported.
- **Cluster metric:** Cn = topic-bearing pages in the 7 core clusters / all topic-bearing pages; Ch = resolved edges touching a hub page / all resolved edges.
- **Connectivity scan:** keeps a vault-relative node universe to mark links into `output/` and `_inbox/` as shadows rather than edges.
- Read-only: never writes to the vault.
- Exit 0 always — callers gate on JSON/text output. The `--json` flag emits a machine-readable report.
- Consistent with the NO-RAG stance: no network, no embeddings.
- Requires Bun; skips gracefully if Bun is absent.

## Related

The TypeScript implementation is `scripts/graph-quality.ts`. The engine's `src/core/link-resolver.ts` is the shared resolver.
