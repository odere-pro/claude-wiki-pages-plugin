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

Vault scaffolding is the structure created by `/claude-wiki-pages:init` — the one-time setup that turns a project directory into a fully wired wiki. The wizard copies `docs/vault-example/` from the plugin cache and writes a per-vault `vault/CLAUDE.md`.

## What gets created

```
vault/
├── CLAUDE.md               # authoritative schema for this vault
├── _templates/             # frontmatter templates per type
├── raw/
│   └── assets/             # images and attachments
├── wiki/
│   ├── index.md            # vault MOC — catalog of every wiki page
│   ├── log.md              # chronological operations record
│   ├── dashboard.md        # Dataview dashboard
│   ├── _sources/           # one summary per ingested source
│   └── _synthesis/         # cross-topic analyses
└── output/                 # optional git-ignored scratch space
```

Topic folders (`tools/`, `patterns/`, etc.) are created on demand by the ingest workflow; they do not exist until a source introduces that topic.

## Key invariants set by scaffolding

- `vault/CLAUDE.md` is the schema authority. Every skill and agent reads it before any operation.
- `vault/raw/` is immutable. The `protect-raw.sh` hook blocks writes to existing files.
- `vault/output/` is git-ignored scratch space — plain markdown, no schema, no validation.
- The vault is its own git repository (git-inited by `init`), making every write reversible.

## Second vault

A second vault in a different project uses the same plugin install. Run `/claude-wiki-pages:init` from the second project directory; the wizard scaffolds a fresh vault independently.
