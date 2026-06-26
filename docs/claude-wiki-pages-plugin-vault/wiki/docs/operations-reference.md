---
title: "Operations Reference"
type: concept
aliases: ["operations reference", "Operations Reference", "vault operations"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-operations|Operations]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "operations", "user-guide"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Operations Reference

The complete user-facing operations contract: the single entry verb, orchestrator dispatch rules, vault resolution, multi-vault registry, and the hook event table.

## Definition

`/claude-wiki-pages:wiki` is the single advertised entry point for all operations. The orchestrator probes vault state and dispatches to the right specialist automatically; users do not need to remember which specialist to call.

## Key Principles

**Orchestrator dispatch table:**

| State the orchestrator finds | What runs |
| --- | --- |
| No vault or no `schema_version` | init wizard (scaffold + orient) |
| Files in `raw/` not yet in `wiki/log.md` | ingest pipeline |
| Previous ingest not followed by lint | curator (audit-and-repair) |
| Analytical prompt | analyst |
| Pending drafts in `_proposed/` | review gate |

**Vault resolution order (first match wins):**

1. `CLAUDE_WIKI_PAGES_VAULT` env var
2. `.claude/claude-wiki-pages/settings.json` → `current_vault_path`
3. Auto-detect — scan up to 4 levels for `CLAUDE.md` with `schema_version` + `wiki/` sibling
4. Default — `docs/vault`

**Multi-vault registry.** Lives in `.claude/claude-wiki-pages/settings.json`. Contains `default_vault_path` (never overwritten by lifecycle commands), `current_vault_path` (sole active pointer), and `vaults` array (`{path, name}`). Invariant: `current_vault_path` must equal exactly one `vaults[].path`; malformed registry → fail-closed. Lifecycle commands via `scripts/set-vault.sh`: `add`, `remove`, `switch`, `list`.

**Hook event table:**

| Event | Behaviour |
| --- | --- |
| `SessionStart` | `session-start.sh` reports vault status; creates settings.json on first run; emits `DEGRADED:` advisory when local model enabled |
| `UserPromptSubmit` | `prompt-guard.sh` warns on phrasing that suggests editing `raw/` or destructive ops |
| Any Write or Edit | `validate-frontmatter.sh`, `check-wikilinks.sh`, `protect-raw.sh`, `validate-attachments.sh` block-or-allow |
| After Write or Edit | `post-wiki-write.sh` and `post-ingest-summary.sh` emit reminders and counts |
| Subagent finishes | `subagent-lint-gate.sh`, `subagent-ingest-gate.sh`, `subagent-tree-gate.sh` warn on bad completions; `subagent-commit-gate.sh` commits any uncommitted vault changes (commit backstop — never blocks) |

## Examples

Power-user bypasses skip the orchestrator's state probe: call agents directly (`/claude-wiki-pages:claude-wiki-pages-ingest-agent`, `/claude-wiki-pages:claude-wiki-pages-curator-agent`, `/claude-wiki-pages:claude-wiki-pages-analyst-agent`). Use when routing is redundant or polish tail-step is wasted work.

Offline/degraded mode (ADR-0018): when Claude API unreachable and `offlinePolicy: prefer-local`, the engine `route` command returns `local` and routes to the approved local tier. `doctor` is always deterministic and needs no model.

## Related Concepts

The operations reference is the user-facing companion to the four-layer architecture. The multi-vault registry confinement invariant is enforced by the firewall (ADR-0009, ADR-0016).
