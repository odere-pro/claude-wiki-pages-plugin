---
title: "Vault Scaffolding"
type: concept
aliases: ["Vault Scaffolding", "vault scaffolding", "scaffold"]
parent: "[[Patterns]]"
path: "patterns"
sources:
  - "[[Getting Started]]"
  - "[[Create a New Vault]]"
  - "[[Using claude-wiki-pages]]"
related:
  - "[[LLM Wiki Pattern]]"
  - "[[Hook-Enforced Guarantees]]"
  - "[[claude-wiki-pages Plugin]]"
depends_on:
  - "[[claude-wiki-pages Plugin]]"
tags: []
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Vault Scaffolding

The directory structure and bookkeeping files created by `/claude-wiki-pages:init` that turn a plain project directory into a fully wired, schema-compliant wiki.

## Definition

Vault scaffolding is the one-time setup performed by the onboarding wizard (`/claude-wiki-pages:init`). The wizard copies `docs/vault-example/` from the plugin cache into the project, writes a per-vault `vault/CLAUDE.md` tailored to the project's domain, and creates the minimum bookkeeping files (`wiki/index.md`, `wiki/log.md`, `wiki/dashboard.md`). After scaffolding, the vault is a valid git repository with hooks wired and the schema authority in place.

Topic folders (`tools/`, `patterns/`, etc.) are not created during scaffolding. They appear on demand when the ingest pipeline processes a source that introduces a new topic.

## Key Principles

One schema per vault — `vault/CLAUDE.md` is the authoritative schema for that vault. Every skill and agent reads it before any operation. Customizing the schema means editing that file, not the plugin skills.

Git from the start — scaffolding git-inits the vault, making every subsequent write reversible via `git revert`. The snapshot scripts (`snapshot.sh pre` / `snapshot.sh post`) checkpoint ingest and heal passes as individually revertible commits.

Immutability by convention — `vault/raw/` is designated as immutable during scaffolding. The `protect-raw.sh` hook enforces this at every write boundary from that point on.

Second vault, same plugin — a second vault in a different project uses the same global plugin install. Running `/claude-wiki-pages:init` from the second project directory scaffolds an independent vault with its own `vault/CLAUDE.md`.

## Examples

After running `/claude-wiki-pages:init`, the project directory contains:

```
vault/
├── CLAUDE.md               # authoritative schema for this vault
├── _templates/             # frontmatter templates per type
├── raw/
│   └── assets/
├── wiki/
│   ├── index.md
│   ├── log.md
│   ├── dashboard.md
│   ├── _sources/
│   └── _synthesis/
└── output/                 # git-ignored scratch space
```

The vault is immediately ready for a first ingest run. No topic folders exist yet — they will be created when the first source is processed.

## Related Concepts

- [[LLM Wiki Pattern]] — the pattern that vault scaffolding enables.
- [[Hook-Enforced Guarantees]] — the hook scripts that scaffolding wires into Claude Code's hook bus.
- [[Ingest Pipeline]] — the workflow that extends the scaffold by adding topic folders and content pages.
