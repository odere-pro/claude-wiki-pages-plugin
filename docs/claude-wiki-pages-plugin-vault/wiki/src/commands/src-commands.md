---
title: "Src Commands"
type: index
aliases: ["src-commands", "Engine Commands", "Engine Verbs"]
parent: "[[src|Src]]"
path: "src/commands"
children:
  - "[[verify-command|Verify Command]]"
  - "[[search-command|Search Command]]"
  - "[[heal-command|Heal Command]]"
  - "[[snapshot-command|Snapshot Command]]"
  - "[[hook-gate|Hook Gate]]"
child_indexes: []
tags: ["src", "commands", "engine"]
created: 2026-06-25
updated: 2026-06-25
---

# Src Commands

The engine verbs implemented in `src/commands/`. Each subdirectory is one command: `<cmd>/<cmd>.ts` exports a pure handler that resolves the vault, does its work through `core/` primitives, and returns its own typed report. Commands stay thin.

## Convention

- Handler signature: `(opts: { target?, ... }) => Promise<Report> | Report`
- Router owns stdout and exit-code mapping
- Vault resolution always through `resolveVault` / `resolveVaultPath`
- Mutating verbs (`fix`, `heal`, `migrate`, `propose`, `snapshot`) are idempotent and git-bounded
- All vault git operations are pathspec-scoped (`-- .`) so vault ops never stage unrelated files

## Implemented Commands

| Command | Purpose |
| --- | --- |
| [[verify-command|Verify]] | Deterministic vault integrity check (CHECK 0–5) |
| [[search-command|Search]] | Deterministic full-text + frontmatter search |
| [[heal-command|Heal]] | Git-bounded verify→fix→re-verify loop |
| [[snapshot-command|Snapshot]] | Git-bound an LLM write phase (pre/post) |
| [[hook-gate|Hook]] | PreToolUse security gate dispatcher |
| `fix` | Idempotent repair of safe structural drift |
| `doctor` | Environment + vault health (D01–D12) |
| `config` | Show or validate effective layered config |
| `migrate` | Upgrade schema_version (additive, git-bounded) |
| `firewall` | Decide whether a write is permitted |
| `backlog` | Probe outstanding maintenance |
| `propose` | Review/approve/reject drafted pages in `_proposed/` |
| `route` | Degraded-mode routing decision (ADR-0018) |
| `context` | Resolve L0–L4 context set for a skill |
| `okf` | OKF export/import |
| `ontology` | Project ontology-profile-v1 |
| `lint` | Structural lint of a vault |
| `export` | Render wiki as portable markdown |
| `capabilities` | List all implemented/planned verbs |

## Planned (declared, not implemented)

- `index` — vault index generation
- `link-suggest` — wikilink suggestions
