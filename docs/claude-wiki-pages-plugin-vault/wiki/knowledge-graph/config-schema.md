---
title: "Config Schema"
type: concept
aliases: ["Config Schema", "config schema", "config.schema.json", "plugin config schema"]
parent: "[[knowledge-graph|Knowledge Graph]]"
path: "knowledge-graph"
sources: ["[[config-schema-json|Config Schema (config.schema.json)]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["config", "json-schema", "validation", "engine"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Config Schema

## Definition

The config schema (`config.schema.json`) is a JSON Schema draft-07 document that
validates both the user-level config (`~/.config/claude-wiki-pages/config.json`) and
the project-level config (`.claude/claude-wiki-pages.json`). It was created in
milestone M1 and has been enforced from M5 onward. Environment variable overrides
follow the `CLAUDE_WIKI_PAGES_*` naming prefix.

The schema is closed (`additionalProperties: false` on every object) — undeclared
config keys are rejected at validation time. `version` is a const field set to `1`;
bumping it signals a breaking config change.

## Key Principles

**Seven configuration groups.** The schema organizes all settings into seven
top-level objects: `vault` (explicit path override), `autoHeal` (repair policy),
`gitCheckpoint` (snapshot and push policy), `firewall` (vault isolation), `localModel`
(offline drafting and extraction), `maintenance` (background upkeep), and `modelHints`
(per-task model overrides). Each group is independently nullable — omitting a group
leaves all its defaults in effect.

**Closed schema, explicit defaults.** Every property carries a `default` value so
the validated config is self-describing when written to disk. The `additionalProperties: false`
constraint catches typos in config keys at startup rather than silently ignoring them.

**Aggressiveness ladder.** `autoHeal.aggressiveness` has three levels: `mechanical`
(wikilinks, MOCs, frontmatter only), `structural` (adds restructure and merge),
`aggressive` (adds deletions). The default `structural` is the safe middle ground —
it repairs graph structure without deleting data.

**Checkpoint modes.** `gitCheckpoint.mode` controls how the engine snapshots the
vault before destructive operations: `commit` (new commit on main), `branch` (new
branch), `both`, or `off`. Push is `off` by default — the plugin is not a hosted
service and never pushes without explicit configuration.

**Firewall deny-list.** `firewall.denyPaths` always blocks writes to
`**/.ssh/**`, `**/.aws/**`, `**/.env`, and `**/.git/config` regardless of
`allowPaths`. This is a hard security invariant: no plugin operation can be
configured to write to these paths.

**Local model tiers.** `localModel.tier` has three capability levels: `draft`
(local model writes to `_proposed/` only), `ingest-extract` (local model also runs
source extraction), `query` (local model composes cited answers, read-only, verified
at runtime per ADR-0019). Each tier is gated per ADR-0018: a tier with no gate-approved
model is wired but blocked.

## Examples

Minimal valid project config at `.claude/claude-wiki-pages.json`:

```json
{
  "version": 1,
  "vault": { "path": "docs/vault" },
  "autoHeal": { "enabled": true, "aggressiveness": "structural" },
  "gitCheckpoint": { "mode": "commit" },
  "firewall": { "enabled": true, "mode": "enforce" }
}
```

The `maintenance` group with its bounded defaults:

- `maxPerRun`: integer 1–50, default 10
- `lintEveryDays`: integer ≥ 1, default 7
- `cooldownMinutes`: integer ≥ 0, default 60
- `autoCatchupOnSessionStart`: boolean, default true

## Related Concepts

- Auto-Heal — the `autoHeal` group configures its enabled state, aggressiveness, and iteration cap
- Git Checkpoint — the `gitCheckpoint` group configures its mode and push policy
- Firewall — the `firewall` group configures its enforcement mode, allowPaths, and denyPaths
- Offline Policy — the `localModel.offlinePolicy` field controls fallback behavior
- Local Model Quality Gate — the `localModel.model` field must pass the ADR-0011 allow-list gate
- Degraded-Mode Routing — `localModel.tier` determines which tiers are available when degraded
