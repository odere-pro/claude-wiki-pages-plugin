---
title: "Default Config"
type: concept
aliases: ["default config", "default.config.json", "seed config", "plugin defaults"]
parent: "[[templates|Templates]]"
path: "templates"
sources: ["[[templates-default-config-json|Default Config Template]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["templates", "config", "defaults", "bootstrapping"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Default Config

`templates/default.config.json` is the seed configuration file the plugin writes on first enable, providing minimal opinionated defaults that users can override.

## Definition

The default config is a JSON file that must validate against `schemas/config.schema.json`. When the plugin scaffolds a new project, it writes this file as `.claude/claude-wiki-pages.json`. It defines the baseline for every config section — users only override what they need.

## Key Principles

- **Minimal by design.** Only `version`, `vault` (empty), `autoHeal`, `gitCheckpoint`, and `modelHints` are present. Opt-in features (`firewall`, `maintenance`, `localModel`) are omitted — their schema defaults apply.
- **Lockstep with the schema.** Every value in this file must be a valid schema value. `gate-07` CI check enforces this contract at every commit.
- **Structural aggressiveness by default.** `autoHeal.aggressiveness: "structural"` is the safe middle ground — it fixes wikilinks, MOCs, and frontmatter, plus restructure and merge, but does not delete pages.
- **Commit mode for checkpointing.** `gitCheckpoint.mode: "commit"` makes each write-phase reversible with `git revert <sha>` without creating extra branches.

## Examples

The shipped default:

```json
{
  "$schema": "...",
  "version": 1,
  "vault": {},
  "autoHeal": { "enabled": true, "aggressiveness": "structural", "maxIterations": 5 },
  "gitCheckpoint": { "mode": "commit" },
  "modelHints": {}
}
```

## Related Concepts

`schemas/config.schema.json` defines every permitted key and its allowed values. `gate-07` CI check pins the two files together. `scripts/resolve-vault.sh` reads the resolved config on every run.
