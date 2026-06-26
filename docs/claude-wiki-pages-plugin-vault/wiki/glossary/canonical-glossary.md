---
title: "Canonical Glossary"
type: concept
aliases: ["canonical glossary", "GLOSSARY.md"]
parent: "[[glossary|Glossary]]"
path: "glossary"
sources: ["[[docs-glossary|Glossary]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "glossary", "governance"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Canonical Glossary

The single-source term list for claude-wiki-pages that every doc, skill description, and user-visible string must conform to, enforced by `validate-docs.sh` in CI.

## Definition

`docs/GLOSSARY.md` is input weight, not a lexicon. An LLM reading this project already carries strong priors for established community terms — MOC, vault, wiki, frontmatter, provenance, ingest. Naming artifacts with those terms activates those priors and lowers drift.

The glossary is under semver alongside the schema: additions are a minor bump, renames or changes in meaning are a major bump. Every change is logged in `CHANGELOG.md`.

## Key Principles

**Two registers.** Technical terms are used inside the product — docs, skills, agents, scripts, schema. Discoverability terms are used on SEO surfaces only (README tagline, GitHub About, `plugin.json` description). The registers do not mix.

**One term, one row, no alternates.** Every concept has a single canonical form. Prefer established community terms; invent only when nothing off-the-shelf fits.

**Enforcement.** `validate-docs.sh` scans for banned-string leaks, discoverability-in-technical-surface leaks, and terms outside fenced code blocks (code spans and fenced blocks are exempt). Exit 0 = clean; exit 1 = violations with `path:line:column rule-id` output. Wired as a `PostToolUse` hook on markdown edits and as a `pre-commit` hook.

**Banned strings.** Retired from the glossary at schema version 1:

| Banned | Replacement |
| --- | --- |
| `second-brain` | `init` (the skill) |
| `second brain` | `LLM Wiki` (discoverability) |
| `vault-synthesize` | `synthesize` |
| `vault-index` | `index` |
| `llm-wiki-stack` | `claude-wiki-pages` |
| `llm-wiki` (in skill context) | bare verb (`ingest`, `query`, …) |

## Examples

Correct: `/claude-wiki-pages:wiki` probes vault state and dispatches to the ingest specialist.

Wrong: `/llm-wiki-stack:wiki runs the vault-index to synthesize the second-brain.`

The glossary covers: schema terms (frontmatter, type, sources, MOC, folder note, confidence, staleness), ontology terms (ontology, class, property, predicate, domain, range, controlled vocabulary), architecture terms (four-layer stack, deterministic engine, verify, lint, firewall, snapshot, commit backstop), retrieval terms (synonym lexicon, stemming, graph link-walk, query expansion), graph connectivity terms (piped wikilink, path-qualified wikilink, strict tree, spine edge, tag de-cycling), vault management terms, ingest and memory terms, capability/model terms, and UX/DX terms.

## Related Concepts

The glossary is the authority for naming; `docs/architecture.md` is the authority for the four-layer contracts; `skills/init/template/CLAUDE.md` is the authority for the schema.
