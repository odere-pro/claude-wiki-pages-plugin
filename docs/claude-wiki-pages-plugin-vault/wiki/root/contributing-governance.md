---
title: "Contributing and Governance"
type: concept
aliases: ["contributing", "governance", "contributor guide", "code of conduct", "support policy"]
parent: "[[root|Root]]"
path: "root"
sources: ["[[root-contributing-md|Contributing Guide]]", "[[root-misc|Root Miscellaneous Files]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["root", "contributing", "governance", "support"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Contributing and Governance

Governance for the claude-wiki-pages plugin: contribution ground rules, the PR process, the community support posture, and the code of conduct.

## Definition

The project is maintained best-effort by the project owner (odere-pro). All contribution happens through GitHub — issues, PRs, and Discussions. The code of conduct is Contributor Covenant v2.1. Security issues use private channels only.

## Key Principles

**Ground rules for contributors:**
- The schema (`skills/init/template/CLAUDE.md`) is authoritative — skill defaults that conflict must be overridden, not the schema.
- Every proposed change must identify which layer it belongs to (Data, Skills, Agents, Orchestration).
- Hooks and scripts are coupled — never rename a hook script without updating `hooks/hooks.json`.
- Provenance over prose: describe the failure mode a feature catches and which layer catches it.

**PR process:** Open issue first (for non-trivial changes), wait for maintainer feedback, keep PRs focused (one concern per PR), update `CHANGELOG.md` under `[Unreleased]`.

**Things that won't merge:** Weakened frontmatter validation, network-access dependencies during ingest/query, hidden telemetry or analytics, `eval` on vault content.

**Support posture:** Best-effort, no SLA. Bug reports need: plugin version, vault `schema_version`, command sequence, minimal `vault/raw/` fixture, and expected vs. actual behavior. Critical bugs (hook fails open, `raw/` becomes mutable, vault data lost) get hotfix priority.

## Examples

Local plugin development workflow:
1. `bash tests/install-deps.sh` — install dev deps
2. `/plugin marketplace add /absolute/path/to/plugin` then `/plugin install claude-wiki-pages@claude-wiki-pages`
3. Test each hook script by piping JSON to stdin

## Related Concepts

`SECURITY.md` defines the private vulnerability disclosure channels and the threat model. `CODE_OF_CONDUCT.md` (Contributor Covenant v2.1) governs community conduct. `LICENSE`: Apache-2.0. `NOTICE` and `THIRD_PARTY_LICENSES.md` cover the bundled MIT-licensed kepano/obsidian-skills.
