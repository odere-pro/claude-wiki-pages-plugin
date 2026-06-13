---
title: "Glossary Terms"
type: concept
aliases: ["Glossary Terms", "glossary terms", "terminology", "canonical terms"]
parent: "[[Reference]]"
path: "reference"
sources: ["[[Glossary]]"]
related: ["[[Schema Authority]]", "[[Design-Drift Gate]]", "[[Banned Strings]]"]
tags: ["concept", "glossary", "reference"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Glossary Terms

## Definition

The `docs/GLOSSARY.md` file is the canonical term list for `claude-wiki-pages`. All docs, skills, and user-visible strings must conform to it. `validate-docs.sh` enforces it in CI Tier 0.

## Key Principles

- **Glossary is "input weight":** using established community terms (MOC, vault, wiki, frontmatter, provenance, ingest) activates LLM priors and lowers session drift.
- **Two registers:** Technical (inside the product) and Discoverability (README, plugin.json, marketplace description). They do not mix.
- **Banned strings** (retired as of schema v1): `second-brain`, `second brain`, `vault-synthesize`, `vault-index`. All `llm-wiki-stack-*` forms are banned since the 1.0.0 rebrand.
- **Semver:** additions = minor bump; renames/meaning changes = major bump. Every change is logged in `CHANGELOG.md`.
- **Enforcement:** `validate-docs.sh` checks (1) banned-string leaks, (2) discoverability-in-technical-surface leaks. Exit 0 = clean; exit 1 = violation with `path:line:column rule-id`.

## Examples

Correct: "The `wiki/` directory holds LLM-maintained typed pages." (Technical register uses "wiki".)
Incorrect in technical prose: "The LLM Wiki Stack vault holds…" (`LLM Wiki Stack` is a discoverability-only phrase.)

## Related Concepts

- [[Schema Authority]] — `CLAUDE.md` that also defines enum lists
- [[Design-Drift Gate]] — `validate-docs.sh` that runs both gates together
- [[Banned Strings]] — the specific strings `validate-docs.sh` rejects
