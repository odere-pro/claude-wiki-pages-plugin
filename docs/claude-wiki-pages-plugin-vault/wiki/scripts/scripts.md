---
title: "Scripts"
type: index
aliases: ["scripts", "Scripts", "Layer 4 Scripts", "shell scripts"]
parent: "[[index|Wiki Index]]"
path: "scripts"
children:
  - "[[engine-sh|engine.sh]]"
  - "[[resolve-vault-sh|resolve-vault.sh]]"
  - "[[firewall-sh|firewall.sh]]"
  - "[[verify-ingest-sh|verify-ingest.sh]]"
  - "[[session-start-sh|session-start.sh]]"
  - "[[snapshot-sh|snapshot.sh]]"
  - "[[graph-quality-sh|graph-quality.sh]]"
  - "[[strict-tree-reduce-sh|strict-tree-reduce.sh]]"
  - "[[doctor-sh|doctor.sh]]"
  - "[[fail-closed-pattern|Fail-Closed Security Pattern]]"
  - "[[bash-bun-wrapper-pattern|Bash-to-Bun Wrapper Pattern]]"
  - "[[four-tier-vault-resolution|Four-Tier Vault Resolution]]"
  - "[[typescript-script-group|TypeScript Utility Scripts]]"
  - "[[validation-scripts-group|Validation and Lint Scripts]]"
child_indexes: []
tags: ["scripts", "layer-4"]
created: 2026-06-25
updated: 2026-06-25
---

# Scripts

The Layer 4 orchestration scripts: 82 shell and TypeScript files that wire hooks, vault resolution, ingest checkpointing, graph quality, and security enforcement.

## Core Pipeline Scripts

The engine bridge and vault resolution library underpin every other script:

- [[engine-sh|engine.sh]] — bash bridge from all hooks/agents to the Bun TypeScript engine; graceful degradation when Bun is absent
- [[resolve-vault-sh|resolve-vault.sh]] — sourceable library defining the four-tier vault resolution chain; sourced by every hook script
- [[session-start-sh|session-start.sh]] — SessionStart hook: initialises settings, emits REMINDER/INDEX/NEXT/ERROR lines, delegates heartbeat
- [[snapshot-sh|snapshot.sh]] — git-bounds every LLM write phase with pre/post checkpoint commits; delegates to engine or inline git fallback

## Security and Write-Path Hooks

Scripts that enforce the security perimeter at PreToolUse time:

- [[firewall-sh|firewall.sh]] — confines Write/Edit to the resolved vault; fail-closed on missing Bun
- [[verify-ingest-sh|verify-ingest.sh]] — post-ingest structural and provenance verification; bash twin of the engine verify verb

## Graph Quality and Tree Reduction

Scripts that measure and remediate the Obsidian graph topology:

- [[graph-quality-sh|graph-quality.sh]] — dangling-wikilink scanner and topic-cluster metric reporter
- [[strict-tree-reduce-sh|strict-tree-reduce.sh]] — sole link reducer: demotes non-spine wikilinks to plain text per ADR-0036

## Diagnostics

- [[doctor-sh|doctor.sh]] — five-step health check; wrapped by the /claude-wiki-pages:doctor command

## Architectural Patterns

- [[fail-closed-pattern|Fail-Closed Security Pattern]] — security gates block writes when Bun is absent
- [[bash-bun-wrapper-pattern|Bash-to-Bun Wrapper Pattern]] — thin bash wrappers preserve caller contracts while delegating to the engine
- [[four-tier-vault-resolution|Four-Tier Vault Resolution]] — env var → settings file → auto-detect → default
- [[typescript-script-group|TypeScript Utility Scripts]] — standalone Bun TS scripts for graph remediation and link migration
- [[validation-scripts-group|Validation and Lint Scripts]] — schema, structural, and authoring-quality gates

## Unprocessed Scripts (Backlog)

57 scripts were not processed in this run. Notable backlog includes: heartbeat.sh, protect-raw.sh, check-wikilinks.sh, scope-guard.sh, apply-obsidian-config.sh and apply-obsidian-config.ts, set-vault.sh, validate-docs.sh, validate-frontmatter.sh, check-duplicate-claims.sh, enforce-dmi.sh, enforce-must-rule.sh, lint-structural.sh, heal-ghost-links.sh and heal-ghost-links.ts, scaffold-vault.sh, graph-quality.ts, disambiguate-collisions.ts, declutter-source-outlinks.ts, migrate-piped-links.ts, and the full eval-*, lib-*, and maintenance/subagent-gate script families.
