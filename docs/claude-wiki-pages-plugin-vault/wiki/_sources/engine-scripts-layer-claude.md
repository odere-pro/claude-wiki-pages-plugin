---
title: "Engine Scripts Layer (CLAUDE.md)"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages project"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["engine", "scripts", "layer4", "hooks"]
aliases: ["Engine Scripts Layer (CLAUDE.md)"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Engine Scripts Layer (CLAUDE.md)

## Summary

The `scripts/` directory is the Layer 4 Orchestration shell — deliberately shell-first because hooks run synchronously and per-keystroke-class. Every script follows the same shape: `#!/bin/bash` with `set -euo pipefail`, source `resolve-vault.sh`, then run in hook mode or CLI mode. The one sourceable file is `resolve-vault.sh`; all others are executable. The bash and TypeScript twins of `firewall.sh` / `firewall.ts` and `verify-ingest.sh` / engine `verify` are pinned by parity gates.

## Key Claims

- `scripts/` is the Layer 4 hot path; Bun is not a hard dependency — the engine degrades gracefully to a no-op when absent.
- Two run modes: hook mode (reads stdin JSON, emits optional block decision, ALWAYS exits 0) and CLI mode (accepts flags, real exit codes).
- `resolve-vault.sh` is the only sourceable file; it omits `set -euo pipefail` to avoid mutating caller shell options.
- `firewall.sh` ↔ `firewall.ts` and `verify-ingest.sh` ↔ engine `verify` are byte-aligned twins pinned by `gate-11-firewall-parity` and `gate-05`.
- Hook wiring (hooks.json ↔ scripts ↔ tests) is a coupled unit — change all three together.
- The lone hard-block exception is `enforce-dmi.sh`, which exits 2 instead of 0.
