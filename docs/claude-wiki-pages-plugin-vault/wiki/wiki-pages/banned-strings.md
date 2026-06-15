---
title: "Banned Strings"
type: concept
aliases: ["Banned Strings", "banned strings", "retired terminology", "banned terms", "validate-docs banned"]
parent: "[[wiki-pages|Wiki Pages]]"
path: "wiki-pages"
sources: ["[[_sources/glossary|Glossary]]"]
related: ["[[glossary-terms|Glossary Terms]]", "[[schema-authority|Schema Authority]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "reference", "glossary", "terminology"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Banned Strings

> [!summary]
> Banned strings are retired terminology that `scripts/validate-docs.sh` enforces as forbidden in all project docs, skills, and user-visible strings. The ban list is part of the [[glossary-terms|Glossary Terms]] and is checked in CI Tier 0. Violations cause `validate-docs.sh` to exit non-zero with `path:line:column` diagnostics.

## Key Principles

- Banned strings are retired terminology enforced as forbidden in all project docs, skills, and user-visible strings; violations cause `validate-docs.sh` to exit non-zero with `path:line:column` diagnostics.
- The ban is enforced in CI Tier 0 using bash and grep only — no Bun, no Node — making it the fastest terminology gate in the pipeline.
- The check scans `docs/`, `skills/`, and `agents/` but excludes `raw/` (source material is data, not prose) and `vault/output/` (deliverable scratch space).
- The Glossary is semver: new banned string additions are minor bumps; the enforcement check is updated in the same commit.
- Using a banned string in a skill or agent file can cause the LLM to use old terminology in wiki pages, user answers, or commit messages — hence the strict CI enforcement.

## Examples

Terms banned at schema v1:

| Banned string      | Reason                                                          |
| ------------------ | --------------------------------------------------------------- |
| `second-brain`     | Early plugin copy; retired in favor of "wiki"                   |
| `vault-synthesize` | Early slash command form; replaced by `/claude-wiki-pages:wiki` |

Running the ban check locally:

```bash
bash scripts/validate-docs.sh
# Check 1 — glossary gate: scans docs/, skills/, agents/ for banned strings
```

## Definition

The Glossary (the source document, not the wiki page) maintains a list of strings that must not appear anywhere in the project's documentation and user-facing text. These are terms that were used in earlier versions of the plugin and were retired either at the initial schema v1 release or at the 1.0.0 rebrand.

**Retired at schema v1:**

| Banned string      | Reason                                                          |
| ------------------ | --------------------------------------------------------------- |
| `second-brain`     | Early plugin copy; retired in favor of "wiki"                   |
| `second brain`     | Same (space variant)                                            |
| `vault-synthesize` | Early slash command form; replaced by `/claude-wiki-pages:wiki` |
| `vault-index`      | Early slash command form; same replacement                      |

**Banned since 1.0.0 rebrand:**

All `llm-wiki-stack-*` and `/llm-wiki-stack:` forms. The plugin was renamed from `llm-wiki-stack` to `claude-wiki-pages`. Any use of the old name in docs or user-visible strings is a naming violation.

## Enforcement

`validate-docs.sh` Check 1 (the glossary gate) scans all files in `docs/`, `skills/`, and `agents/` for banned strings using grep. It exits non-zero with a `path:line:column` report on the first violation. This check runs in CI Tier 0 — no Bun, no Node, just bash and grep.

The check does not scan `raw/` (source material is data, not prose) or `vault/output/` (deliverable scratch space). It does scan `CLAUDE.md` at the repo root and in `docs/vault-example/`.

## Why Banned Strings Matter

The Glossary is "input weight" — using established community terms activates LLM priors and lowers the chance of confused output. A banned string in a skill or agent file can cause the LLM to use the old terminology in wiki pages, user answers, or commit messages. Enforcing the ban list keeps the plugin's language consistent across all surfaces.

The Glossary is semver: additions are minor bumps (new terms added), renames or meaning changes are major bumps (terms change or are retired). A new banned string addition is a minor bump; the enforcement check is updated in the same commit.

## Related Concepts

- [[glossary-terms|Glossary Terms]] — the full glossary including the banned strings list and the two registers (Technical, Discoverability)
- [[schema-authority|Schema Authority]] — `vault/CLAUDE.md` as the schema authority; the glossary is authoritative for terminology while CLAUDE.md is authoritative for frontmatter
- Design-Drift Gate — Check 5 of `validate-docs.sh`; the glossary gate (Check 1) is a sibling check in the same script
