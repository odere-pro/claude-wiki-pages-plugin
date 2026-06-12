---
title: "Feature Overview"
type: concept
aliases: ["Feature Overview", "feature overview", "plugin features"]
parent: "[[Features]]"
path: "features"
sources: ["[[features]]"]
related: ["[[Scaffolding Ablation]]", "[[Hook System]]", "[[Four-Layer Stack]]"]
tags: [features, schema, hooks]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# Feature Overview

> [!summary]
> `claude-wiki-pages` provides typed wiki pages with provenance by construction, hook-enforced immutability and validation, a one-command pipeline, Obsidian-native experience, and a five-tier test harness. The measured ablation (ADR-0020) shows the scaffolding drives schema validity from 0.00 to 1.00 and claim fidelity from 0.00 to 1.00.

## Schema

- **Typed wiki pages** with YAML frontmatter — nine page types and strict schema validation on every write.
- **Provenance by construction** — every non-source page carries a `sources:` field with `[[wikilinks]]` back to immutable raw content. Plain strings are a lint error.
- **Map of Content (MOC)** — per-folder `_index.md` and vault-level `wiki/index.md`, auto-maintained by the pipeline.
- **Confidence discipline** — `confidence ≥ 0.8` requires two corroborating sources; `1.0` requires a direct quote.
- **Cross-topic synthesis notes** with explicit `scope:` and `synthesis_type` (`comparison`, `theme`, `contradiction`, `gap`, `timeline`).

## Hook-Enforced Safety

- **Immutable `raw/`** — `protect-raw.sh` blocks any attempt to rewrite a source.
- **Frontmatter validation** — every Write and Edit passes through `validate-frontmatter.sh` and `check-wikilinks.sh` before landing.
- **`SubagentStop` completion gates** — long-running agents cannot leave the wiki in a half-written state.
- **Append-only operations log** — every ingest, lint, fix, query, and synthesis lands one entry in `wiki/log.md`.

## DX

- **One-command pipeline** — `/claude-wiki-pages:wiki` probes vault state and runs the right specialist.
- **Obsidian-native** — works with Dataview, Templater, Web Clipper, and the graph view out of the box.
- **Vault-portable** — switch vaults with `CLAUDE_WIKI_PAGES_VAULT` or `bash scripts/set-vault.sh`.

## Test Harness

Five tiers:

| Tier | Description |
| --- | --- |
| Tier 0 | Static (shellcheck, shfmt, markdownlint, lychee, gitleaks, glossary gate) |
| Tier 1 | Bats unit (~108 tests) |
| Tier 2 | Smoke |
| Tier 3 | Release readiness |
| Tier 4 | Adversarial (weekly; corpus replay) |

## Comparison

| Question | Competitors | `claude-wiki-pages` |
| --- | --- | --- |
| Can I run this locally? | `obsidian-llm-wiki-local`: yes, local-LLM only | Yes — provider-agnostic |
| Can I install it as a Claude plugin? | `rvk7895/llm-knowledge-bases`: yes, bag of commands | Yes, plus a four-layer architecture with hook-enforced gates |
| Does it ship a security model? | Nobody in the top 10 does | Yes — `SECURITY.md` threat model |
