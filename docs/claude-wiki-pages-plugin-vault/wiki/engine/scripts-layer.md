---
title: "Scripts Layer"
type: concept
aliases: ["Scripts Layer", "Layer 4 shell", "scripts directory", "hook scripts", "shell orchestration"]
parent: "[[engine-index|Engine — Index]]"
path: "engine"
sources: ["[[engine-scripts-layer-claude|Engine Scripts Layer (CLAUDE.md)]]", "[[engine-api-skill|Engine API Skill (SKILL.md)]]"]
related: ["[[engine-sh|engine.sh]]", "[[hook-system|Hook System]]", "[[Firewall]]", "[[vault-resolution|Vault Resolution]]", "[[deterministic-engine|Deterministic Engine]]", "[[git-checkpoint|Git Checkpoint]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["engine", "bash", "hooks", "layer4"]
created: 2026-06-13
updated: 2026-06-14
update_count: 2
status: active
confidence: 1.0
---

# Scripts Layer

## Definition

The Scripts Layer is the `scripts/` directory of the plugin — the Layer 4 Orchestration hot path. It is deliberately shell-first: hooks fire synchronously and per-keystroke-class, so the enforcement gates stay in bash and never spawn a Bun runtime per write. The shell bridges to the Bun engine through `engine.sh` when deterministic structure work (verify, fix, heal) is needed, and degrades gracefully when Bun is absent.

## Key Principles

- **Shell-first for hooks**: `PreToolUse` fires on every write; a per-call runtime startup would add unacceptable latency. Bash scripts are the right tool.
- **Standard script anatomy**: every executable script begins with `#!/bin/bash`, `set -euo pipefail`, then `source "$(dirname "$0")/resolve-vault.sh"` to get the active vault path. Consistent, testable in one place.
- **Two run modes**:
  - **Hook mode**: reads tool-call JSON from stdin; optionally emits `{"decision":"block","reason":"…"}` on stdout; ALWAYS exits 0 (non-zero exit from a hook is a harness error, not a policy block). The exception is `enforce-dmi.sh`, which exits 2.
  - **CLI mode**: accepts `--target <vault>` / `--file <path>` flags; prints plain output; uses real exit codes (0=clean, 1=issues). Used by tests and manual runs.
- **Sourceable helpers**: `resolve-vault.sh` (vault resolution) and `vault-lock.sh` (the advisory write lock) are the two files meant to be `source`d; both omit `set -euo pipefail` to avoid mutating the caller's shell options and fail closed per-function instead.
- **Write-safety**: scripts that move or sync files (`obsidian-rename.sh`, `sync-source.sh`) confine with physical `realpath` so a symlink or `../` hop cannot escape the vault, and snapshot/commit sequences serialize through the advisory `vault-lock.sh` (see [[git-checkpoint|Git Checkpoint]]).
- **Shell↔TS parity gates**: `firewall.sh` ↔ `firewall.ts` (gate-11) and `verify-ingest.sh` ↔ engine `verify` (gate-05) are byte-aligned twins; if they diverge CI fails. (`vault-lock.sh` ↔ `vault-lock.ts` share an invariant but use different mechanisms — flock vs. in-process queue — so they are companions, not byte-pinned twins.)
- **Coupling by design**: `hooks/hooks.json` + scripts + `tests/scripts/*.bats` are one unit. Change all three together when updating a hook.

## Hook Wiring Table

| Event                 | Matcher                  | Scripts (in order)                                                                                          |
| --------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `SessionStart`        | —                        | `session-start.sh`                                                                                          |
| `UserPromptSubmit`    | —                        | `prompt-guard.sh`                                                                                           |
| `PreToolUse`          | `Write\|Edit`            | `firewall.sh`, `validate-frontmatter.sh`, `check-wikilinks.sh`, `protect-raw.sh`, `validate-attachments.sh` |
| `PreToolUse`          | `Write\|Edit\|MultiEdit` | `enforce-dmi.sh`, `enforce-must-rule.sh` (path-filtered)                                                    |
| `PostToolUse`         | `Write\|Edit`            | `post-wiki-write.sh`, `post-ingest-summary.sh`                                                              |
| `SubagentStop`        | —                        | `subagent-lint-gate.sh`, `subagent-ingest-gate.sh`, `subagent-commit-gate.sh`                               |
| `Stop` / `SessionEnd` | —                        | `session-memory.sh`                                                                                         |

## Examples

Standard script header pattern (used by every executable in `scripts/`):

```bash
#!/bin/bash
set -euo pipefail
source "$(dirname "$0")/resolve-vault.sh"
VAULT="$(resolve_vault)"
```

Hook mode vs CLI mode invocation:

```bash
# Hook mode (reads JSON from stdin, always exits 0)
echo '{"tool":"Write","input":{"path":"docs/vault/wiki/engine/test.md"}}' | bash scripts/firewall.sh

# CLI mode (accepts --target flag, uses real exit codes)
bash scripts/firewall.sh --target docs/vault --file wiki/engine/test.md
```

## Related Concepts

- [[engine-sh|engine.sh]] — the bridge from this layer to the Bun engine
- [[hook-system|Hook System]] — the broader hook event system the scripts plug into
- [[Firewall]] — the write-confinement gate implemented as a script in this layer
- [[vault-resolution|Vault Resolution]] — the four-tier resolver sourced by every script here
- [[deterministic-engine|Deterministic Engine]] — the Bun tier that the scripts bridge to for structural work
