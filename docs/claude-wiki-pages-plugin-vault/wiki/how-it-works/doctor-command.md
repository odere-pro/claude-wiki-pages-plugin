---
title: "Doctor Command"
type: concept
aliases: ["Doctor Command", "doctor command", "/claude-wiki-pages:doctor", "doctor", "health check command"]
parent: "[[How It Works]]"
path: "how-it-works"
sources: ["[[Installation Guide]]", "[[User Guide 01: Getting Started]]", "[[Getting Started (CLI Quickstart)]]"]
related: ["[[Installation]]", "[[Onboarding Wizard]]", "[[claude-wiki-pages Plugin]]", "[[Time-to-First-Value]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "reference", "install", "health-check"]
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Doctor Command

> [!summary] > `/claude-wiki-pages:doctor` is the health check command. It verifies that the plugin installation is correct, prerequisites are satisfied, and the active vault is in a valid state. Exit 0 means OK. It is the recommended first command after install or reinstall and the first diagnostic step when something feels wrong.

## Key Principles

- Doctor is read-only: it checks state but never modifies the vault or the plugin installation.
- Exit 0 means all checks passed; any non-zero exit names the failing check and its remediation.
- Checks are additive — a failing early check may skip later checks that depend on it passing.
- Doctor is the recommended first step after install, after upgrading, and when something feels wrong.
- D11 (Obsidian CLI availability) and D12 (raw intake manifest consistency) are the two most recently added named checks.

## Examples

Running doctor after install and confirming clean state:

```
/claude-wiki-pages:doctor
```

Expected clean output:

```
D01: Claude Code version ≥ 2.0 ................... OK
D05: Vault is a git repository ................... OK
D06: Bun ≥ 1.2 present .......................... OK
D09: engine.sh verify passes ..................... OK
D11: obsidian-rename.sh reachable ................ OK
D12: source manifest consistent .................. OK
```

Doctor revealing a missing prerequisite:

```
D06: Bun ≥ 1.2 present .......................... FAIL[D06]
  Bun not found on PATH. Install: curl -fsSL https://bun.sh/install | bash
```

## Definition

The doctor command (`/claude-wiki-pages:doctor`) is a progressive-disclosure secondary entry point alongside the primary `/claude-wiki-pages:wiki`. It runs a suite of diagnostic checks and reports the results. Unlike `/claude-wiki-pages:wiki`, which reads vault state and takes action, doctor only reads — it never modifies the vault.

**When to use:**

- Immediately after `/plugin install claude-wiki-pages`
- After upgrading the plugin
- After reinstalling (`/plugin uninstall` + reinstall)
- When a wiki command produces unexpected output
- When the vault was modified outside the plugin

## What Doctor Checks

The checks are additive: if an early check fails, later checks may be skipped (they depend on the earlier check succeeding). Typical check sequence:

1. **Prerequisites** — Claude Code ≥ 2.0, `bash`, `git`, `jq`, `find` on PATH. Bun ≥ 1.2 reported as recommended (not required).
2. **Plugin installation** — skills, agents, hooks, and scripts loaded as context; `hooks.json` parsed.
3. **Vault resolution** — active vault path resolves via the 4-tier resolver (`CLAUDE_WIKI_PAGES_VAULT` env → settings.json → auto-detect → default).
4. **Vault structure** — `vault/CLAUDE.md` present with `schema_version`; `vault/wiki/index.md` and `vault/wiki/log.md` present.
5. **Schema version** — declared `schema_version` is in `SUPPORTED_SCHEMA_VERSIONS`.
6. **Bun and engine** — if Bun is present, `engine.sh --version` exits 0.

Exit code:

- `0` — all checks passed; vault is ready.
- Non-zero — at least one check failed; the report names the failing check and suggests a remediation.

## D11 and D12 Checks

Two named checks were added to cover specific failure modes:

- **D11** — `obsidian-rename.sh` binary availability (the Obsidian CLI renaming tool). Reports whether the Obsidian CLI is reachable for graph-color updates.
- **D12** — Raw intake manifest consistency: the source manifest at `wiki/_sources/manifest.md` is consistent with the raw files present. A mismatch here means the manifest is out of sync with what is on disk.

## Relationship to Onboarding

The [[Onboarding Wizard]] (`/claude-wiki-pages:init`) scaffolds the vault and then recommends running doctor as the verification step. Getting Started (User Guide 01) describes the pattern: install → init → doctor → confirm green → proceed to ingest. Doctor is the "trust but verify" step after onboarding.

## Related Concepts

- [[Installation]] — the three installation paths (marketplace, local, update) that doctor validates
- [[Onboarding Wizard]] — the wizard that scaffolds the vault; doctor is the recommended follow-up
- [[claude-wiki-pages Plugin]] — the plugin whose installation state doctor checks
- [[Time-to-First-Value]] — the condensed path from install to first cited answer; doctor is the verification gate
