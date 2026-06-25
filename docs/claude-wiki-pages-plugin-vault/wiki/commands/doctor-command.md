---
title: "Doctor Command"
type: entity
entity_type: tool
aliases: ["Doctor Command", "/claude-wiki-pages:doctor", "doctor slash command"]
parent: "[[commands|Commands]]"
path: "commands"
sources: ["[[doctor-command|doctor command (/claude-wiki-pages:doctor)]]"]
related: []
tags: ["commands", "health-check", "slash-command", "diagnostics"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Doctor Command

The environment health check for claude-wiki-pages: verifies the vault, schema, hooks, git state, Bun presence, and glossary gate.

## Overview

`/claude-wiki-pages:doctor` runs the engine doctor, which performs ten checks (D01–D10) and returns structured `{ results, worst }` JSON. It is read-only by contract — the only slash command that never writes to the vault. Run it once after install and any time something feels wrong before invoking `/claude-wiki-pages:wiki`.

The primary path uses `engine.sh doctor --json`. When Bun is unavailable the command falls back to `doctor.sh`, which reports a coarser health status with exit codes 0–5.

## Key Facts

- **Invocation:** `/claude-wiki-pages:doctor`
- **Allowed tools:** Bash only (read-only by contract)
- **Ten checks (D01–D10):**
  - D01: Vault path resolves and exists
  - D02: `schema_version` present and supported
  - D03: `raw/` readable, `wiki/` writable
  - D04: Every `hooks.json` script exists and is `+x` (auto-fixable)
  - D05: Vault is a git repo — self-heal is reversible (auto-fixable)
  - D06: Bun engine present
  - D07: User config present / valid
  - D08: Legacy settings path migrated (auto-fixable)
  - D09: `verify` reports no errors (hint: `heal`)
  - D10: Glossary gate (plugin repo only)
- **`--fix` flag:** auto-repairs D04, D05, D08
- **`--strict` flag:** exits 3 on any warn/fail (enables CI gating)
- **Status values:** `pass | warn | fail | fixed | skip`
- **Companion:** `/claude-wiki-pages:wiki` — run after doctor reports healthy

## Related

The doctor command surfaces issues that the orchestrator also detects via the `graph_health` probe (`health-score.sh`). Doctor is the standalone diagnostic; the orchestrator's probe drives automatic heal routing.
