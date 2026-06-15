---
title: "Six Surfaces Dual-Reader Contract"
type: concept
aliases: ["Six Surfaces Dual-Reader Contract", "six surfaces dual-reader contract", "six surfaces", "dual-reader contract", "six-surfaces table"]
parent: "[[LLM]]"
path: "llm"
sources: ["[[llm-software-3-0|SOFTWARE-3-0: Dual Entry Point]]"]
related: ["[[dual-entry-point|Dual Entry Point]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "architecture", "dual-reader", "entry-point"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Six Surfaces Dual-Reader Contract

## Definition

The Six Surfaces Dual-Reader Contract is the organizing principle of the `SOFTWARE-3-0.md` dual entry point. It states that every surface of the `claude-wiki-pages` project must be reachable from the entry point with both a human on-ramp and an agent on-ramp. A row with only one on-ramp is a defect — a parity gate enforces this invariant.

The contract maps six project surfaces to their on-ramps:

| Surface           | Human on-ramp                                                                   | Agent on-ramp                                                               |
| ----------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Docs**          | `docs/getting-started.md`, `docs/operations.md`                                 | `docs/GLOSSARY.md` (canonical terms), `CLAUDE.md` (repo map)                |
| **Tools**         | `docs/operations.md` (the verbs), `/claude-wiki-pages:wiki`                     | `skills/engine-api` (engine subcommands, `--json`, exit codes)              |
| **Design**        | `docs/architecture.md` (four-layer stack), `docs/design/` (diagrams)            | `docs/design/` (mermaid source) + per-skill/per-agent frontmatter contracts |
| **System design** | `docs/adr/` (decisions), `docs/teams.md`, `docs/design/06-feature-relations.md` | `schemas/` + `hooks/hooks.json` + `.claude-plugin/plugin.json`              |
| **Context**       | `docs/vault-example/CLAUDE.md` (schema, `ontology-profile-v1`)                  | same schema + `skills/maintain-contract`                                    |
| **Memory**        | `docs/adr/ADR-0010-durable-memory.md`, vault `wiki/log.md`                      | `scripts/session-memory.sh` (`source_type: agent-session` provenance)       |

## Key Principles

**The one rule.** `SOFTWARE-3-0.md` links, it never restates. Every surface of the project — docs, tools, design, system design, context, and memory — must be reachable here, and must be equally usable by a person and by an agent. If a row ever has only one on-ramp, that is a defect.

**Tools surface entry point.** The single advertised entry verb `/claude-wiki-pages:wiki` is the human's on-ramp to the Tools surface. The agent's on-ramp is `skills/engine-api` (the engine subcommands reference) and `skills/maintain-contract` (the safe read/write order contract). The distinction is intentional: a human navigates through the entry verb; an agent reads the API skill directly.

**Context surface.** Both readers converge on the same schema: `docs/vault-example/CLAUDE.md` with the `ontology-profile-v1` contract. The difference is that the human on-ramp emphasizes reading for understanding; the agent on-ramp combines the schema with `skills/maintain-contract` to know what to read before acting.

**Parity gate.** A gate enforces the dual-reader invariant. The exact mechanism is in `scripts/validate-docs.sh` (the same doc validation that enforces the GLOSSARY gate). This prevents the six-surfaces table from drifting to a single-reader state as the project evolves.

## Examples

A new contributor adding a surface (e.g., a Monitoring surface for CI dashboards) must add both a human on-ramp (`docs/monitoring.md`) and an agent on-ramp (a skill or schema reference) to the six-surfaces table in `SOFTWARE-3-0.md`, or the parity gate will fail.

## Related Concepts

- [[dual-entry-point|Dual Entry Point]] — the `SOFTWARE-3-0.md` pattern that implements this contract
- Plugin Dev-Time vs Runtime — the dev-time vs runtime boundary that determines what each reader sees
- Plugin Manifest — the `plugin.json` that registers the plugin's runtime surfaces with Claude Code
- Analyst Agent — the agent whose on-ramp in the Tools surface is `skills/engine-api`
