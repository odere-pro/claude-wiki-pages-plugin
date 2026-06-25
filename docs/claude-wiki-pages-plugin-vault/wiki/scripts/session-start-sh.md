---
title: "session-start.sh"
type: entity
entity_type: tool
aliases: ["session-start.sh", "Session Initializer"]
parent: "[[scripts|Scripts]]"
path: "scripts"
sources: ["[[scripts-session-start-sh|scripts/session-start.sh]]"]
related: []
tags: ["scripts", "session", "layer-4", "moc-pointer"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# session-start.sh

SessionStart hook that initialises plugin settings and orients the agent at the start of every Claude Code session.

## Overview

`scripts/session-start.sh` runs on every session start. It calls `init_vault_settings()` to ensure settings.json exists, resolves the vault to an absolute canonical path, and emits structured lines that Claude reads to orient itself without loading full vault content into context.

## Key Facts

- **REMINDER line:** instructs the agent to read the vault's CLAUDE.md before any wiki operation.
- **INDEX line:** points to `wiki/index.md` (the MOC) so the agent can orient without loading it.
- **NEXT line:** suggests the appropriate next action based on vault state. Pending source count is computed by comparing raw/ file mtimes against `log.md` mtime (not a total count, which would overstate backlog).
- **ERROR line:** emitted when Bun is absent (disables engine commands, self-heal, json-tool, settings-tool).
- **NOTICE line:** emitted when jq is absent (JSON-parsing hooks cannot read tool-call payloads).
- **SETUP line:** emitted when the vault directory does not exist (prompts user to run init).
- Resolves vault to absolute path using `cd && pwd -P` to follow symlinks.
- Delegates heartbeat (maintenance backlog check) to `heartbeat.sh` with a wall-clock timeout.

## Related

`heartbeat.sh` handles the maintenance backlog recommendation. `resolve-vault.sh` provides the four-tier resolution.
