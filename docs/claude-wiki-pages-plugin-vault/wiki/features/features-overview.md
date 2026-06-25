---
title: "Features Overview"
type: concept
aliases: ["features overview", "Features Overview", "plugin features"]
parent: "[[features|Features]]"
path: "features"
sources: ["[[docs-features|Features]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "features", "schema"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Features Overview

What claude-wiki-pages actually gives you: typed wiki pages, hook-enforced safety, one-command pipeline, a five-tier test harness, and measured evidence of what the scaffolding buys.

## Definition

The plugin delivers provenance-tracked wiki pages with schema-valid frontmatter, hook-enforced immutability of raw sources, automatic maintenance via a state-probing orchestrator, and reproducible evidence of its value via scaffolding ablation.

## Key Principles

**Schema features.** Typed wiki pages with YAML frontmatter (nine page types). Structural provenance: every non-source page carries `sources:` as `[[wikilinks]]` back to immutable raw content. Per-folder folder notes (`wiki/<topic>/<topic>.md`, schema v3) and vault-level `wiki/index.md`, auto-maintained by the pipeline. Confidence discipline: `confidence >= 0.8` requires two corroborating sources; `1.0` requires a direct quote. Cross-topic synthesis notes with explicit `scope:` and `synthesis_type`.

**Hook-enforced safety.** `protect-raw.sh` blocks any attempt to rewrite a source. Every Write and Edit goes through `validate-frontmatter.sh` and `check-wikilinks.sh`. `SubagentStop` completion gates prevent half-written wiki states. Append-only `wiki/log.md` for every operation.

**DX.** One-command pipeline: `/claude-wiki-pages:wiki` probes vault state and runs the right specialist. Obsidian-native (Dataview, Templater, Web Clipper, graph view). Vault-portable via `CLAUDE_WIKI_PAGES_VAULT` or `set-vault.sh`.

**Five-tier test harness.** Tier 0: static (shellcheck, shfmt, markdownlint, lychee, gitleaks, glossary gate). Tier 1: Bats unit (~108 tests). Tier 2: smoke. Tier 3: release readiness. Tier 4: adversarial (weekly corpus replay).

**Scaffolding ablation (ADR-0020).** The plugin arm vs baseline arm on the same model (qwen3-coder:30b), same golden inputs:

| Metric | Plugin arm | Baseline arm |
| --- | --- | --- |
| `schema_validity` | 1.00 / 1.00 | 0.00 / 0.00 |
| `claim_source_fidelity` | 1.00 / 1.00 | 0.00 / 0.00 |
| `dedup_correctness` | 1.00 / 1.00 | 0.00 / 0.00 |
| **Verdict** | **PASS / PASS** | **FAIL / FAIL** |

Without the plugin: zero auditable claims (baseline has no `sources:` at all — its fabrication floor is vacuous, not honest), no schema, no dedup.

## Examples

What you lose without the plugin, mapped to the enforcing mechanism:
- Schema-valid typed pages → `validate-frontmatter.sh` PreToolUse gate + prompt contract
- Claims traceable to sources → `source_quotes` verbatim rule + `verify-ingest.sh`
- Immutable source material → `protect-raw.sh` PreToolUse block
- Writes confined to vault → `firewall.sh` + engine parity (gate-11)
- Every LLM write git-revertible → `snapshot` verb + SubagentStop commit backstop

## Related Concepts

The features are built on the four-layer architecture. The scaffolding ablation is documented in ADR-0020. The test harness is documented in `tests/README.md`.
