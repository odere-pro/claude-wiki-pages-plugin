---
title: "Action Skills"
type: concept
aliases: ["Action Skills", "action skills", "plugin action skills"]
parent: "[[Skill Catalog]]"
path: "skills"
sources: ["[[architecture]]"]
related: ["[[Skill Catalog]]", "[[Agent Teaching Skills]]", "[[Orchestration Layer]]"]
tags: [skills, actions, layer2]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 0.9
---

# Action Skills

The 13 plugin-authored **action skills** are the verbs end-users and agents call directly. Each is a single-responsibility capability in `skills/`.

## The 13 Action Skills

| Skill | Role |
| --- | --- |
| `init` | Scaffold a new vault: create `raw/`, `wiki/`, `CLAUDE.md`, `wiki/index.md`, `wiki/log.md` |
| `ingest` | Full ingest pipeline: read `CLAUDE.md`, classify source, write `_sources/` stub, write wiki page(s), update `_index.md`, append log entry |
| `query` | Embedding-free recall with synonym expansion (ADR-0007); returns cited answer with `matched[]` score object (ADR-0006) |
| `lint` | Structural audit: broken wikilinks, orphan pages, frontmatter gaps, index drift, plain-string sources |
| `fix` | Curator fix: apply structural repairs that are unambiguous; stage judgment fixes to `_proposed/` |
| `status` | Vault health check: page count, cluster count, pending sources, days-since-lint, local-model tier table |
| `synthesize` | Write or update a `_synthesis/` note from a given set of wiki pages |
| `index` | Regenerate `wiki/index.md` from all `_index.md` files; regenerate per-folder `children:` lists |
| `markdown` | Format wiki pages: normalize headers, clean frontmatter whitespace, enforce wikilink style |
| `search` | Low-level search verb: keyword + alias match against the wiki, returns `SearchHit[]` with `score.matched[]` |
| `review` | Present `_proposed/` queue to the user; accept or reject each pending item |
| `draft` | Write a draft in `wiki/_proposed/` without going through the ingest pipeline; for human-authored notes |
| `sync` | Reconcile the vault with upstream git changes: pull, re-verify, re-index |

## Single-Responsibility Contract

Each skill does exactly one thing. The ingest agent chains skills (ingest → synthesize → index → log append) but each skill individually is testable and replaceable.

## Testing

Each action skill has a Bats integration test in `tests/scripts/`. Tier 1 runs all of them in under 30 seconds.
