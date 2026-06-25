---
title: "Release History"
type: concept
aliases: ["release history", "changelog", "CHANGELOG", "version history"]
parent: "[[root|Root]]"
path: "root"
sources: ["[[root-changelog-md|CHANGELOG]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["root", "changelog", "releases", "versioning"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Release History

The plugin uses Keep a Changelog format and SemVer. Pre-1.0 minors may break public interfaces; every break is called out in CHANGELOG.md. The vault `schema_version` and the plugin `version` are independent counters.

## Definition

`CHANGELOG.md` is the authoritative record of every feature added, changed, fixed, and removed per release. An `[Unreleased]` section accumulates changes for the next tag. Releases are tagged on `main` after Tier 0 + Tier 1 + Tier 2 tests pass and published as GitHub Releases.

## Key Principles

**Major features in the Unreleased section (at time of capture):**

- **Strict-tree topology (ADR-0036)**: `parent` spine is the only wikilink among visible topic pages; associations become nested `topic/<tree>` tags; `strict-tree-reduce.sh` is the sole link reducer.
- **Voice skill (#26)**: Two registers — explanatory (Karpathy-simple) and engineer (precise). All plugin-authored pages open with a plain one-line definition.
- **Host-project intake (ADR-0024)**: Fresh vault init offers wiring the project docs (README, `docs/`, ADRs) into `raw/wired/<name>/`.
- **Schema v3 (ADR-0022)**: Folder notes named after their folder (`wiki/<topic>/<topic>.md`), not `_index.md`.
- **`snapshot` verb**: `snapshot pre` checkpoints the vault; `snapshot post` commits write-phase output as one revertible git commit.
- **SubagentStop commit backstop**: Uncommitted vault changes after a write-path agent are committed as a labelled backstop commit.
- **Autonomous maintenance**: Opt-in `maintenance` config block; `heartbeat.sh` detects backlog and recommends catch-up at SessionStart.
- **Local model drafting**: Ollama/LM Studio into `_proposed/`; `review` skill gates promotion. Only `qwen3-coder:30b` currently on the allow-list.
- **Universal graph machinery**: Topics derived from the vault's actual `wiki/` folders via `src/core/topics.ts`; no more hardcoded topic lists.
- **Escaped-pipe ghost twin fix**: `normaliseTarget` strips trailing `\` from table-cited wikilinks, preventing duplicate grey ghost nodes.

## Examples

Release cadence: tagged on `main` after all Tier 0–2 gates are green. Schema version bump requires an explicit "Spec changes" entry in CHANGELOG.md per the project non-goals. `release-please` automates the changelog and release PR via `.release-please-manifest.json`.

## Related Concepts

ADR-0036 (strict tree), ADR-0022 (schema v3 folder notes), ADR-0024 (host-project intake), ADR-0023 (wiki-only graph), ADR-0010 (durable memory carve-out), ADR-0017 (local model quality gate).
