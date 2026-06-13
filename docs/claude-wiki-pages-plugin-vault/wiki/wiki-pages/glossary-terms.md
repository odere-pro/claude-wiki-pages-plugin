---
title: "Glossary Terms"
type: concept
aliases: ["Glossary Terms", "glossary terms", "terminology", "canonical terms"]
parent: "[[Wiki Pages]]"
path: "wiki-pages"
sources: ["[[Glossary]]", "[[Architecture Documentation]]"]
related: ["[[Schema Authority]]", "[[Design-Drift Gate]]", "[[Banned Strings]]", "[[claude-wiki-pages Plugin]]"]
tags: ["concept", "glossary", "reference"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Glossary Terms

> [!summary]
> `docs/GLOSSARY.md` is the canonical term list for `claude-wiki-pages`. Every doc, skill, and user-visible string must conform to it. `validate-docs.sh` enforces it in CI Tier 0. The glossary is "input weight" — using established community terms activates LLM priors and lowers session drift. It has two registers: Technical (inside the product) and Discoverability (SEO surfaces only).

## Definition

The glossary at `docs/GLOSSARY.md` is the single source of truth for every term used in the plugin. It is not a lexicon — it is "input weight": an LLM reading this project already carries strong priors for established community terms (MOC, vault, wiki, frontmatter, provenance, ingest). Naming artifacts with those terms activates those priors and lowers drift. Novel compounds waste weight: the model has to learn them from scratch every conversation, and prose drifts as it forgets.

## Two Registers

| Register | Where used | Example |
| --- | --- | --- |
| **Technical** | Inside the product: docs, skills, agents, scripts, schema | `vault` (the directory), `wiki` (LLM-maintained pages), `MOC` |
| **Discoverability** | SEO surfaces only: README tagline, GitHub About, `plugin.json` description | `LLM Wiki` (the audience phrase) |

The registers do not mix. `vault` is the technical term for the directory; `LLM Wiki` is the discoverability term for the audience. Use each in its own surface only. `validate-docs.sh` flags stray discoverability terms outside the allowed surfaces.

## Banned Strings

These strings are retired from the glossary as of schema version 1 and must not appear in new prose:

| Banned | Replacement |
| --- | --- |
| `second-brain`, `second brain` | `init` for the onboarding skill; the specific verb for others |
| `vault-synthesize` | `synthesize` |
| `vault-index` | `index` |

Renamed in `1.0.0` (plugin rebrand):

| Banned (pre-1.0.0) | Replacement |
| --- | --- |
| `llm-wiki-stack` | `claude-wiki-pages` |
| `llm-wiki-stack-{orchestrator,ingest,curator,analyst}-agent` | `claude-wiki-pages-…-agent` |
| `llm-wiki` (the onboarding skill name) | `init` |

## Enforcement by `validate-docs.sh`

The script treats `GLOSSARY.md` as input and enforces three rules:

1. **Banned-string leaks** — flags the banned strings above outside the explicit allowlist (this file and `CHANGELOG.md` historical entries).
2. **Discoverability-in-technical-surface leaks** — flags `LLM Wiki Stack` (Title Case drift) and `agent harness` outside the SEO allowlist.
3. **Exemptions** — content inside fenced code blocks (` ``` ` and `~~~`) and inline code spans is not scanned. Heading text is scanned; the canonical form must win.

Exit codes: `0` clean; `1` any violation, with `path:line:column rule-id description` output.

## Semver Governance

The glossary is under semver along with the schema:
- **Additions** = minor bump
- **Renames or meaning changes** = major bump
- Every change is logged in `CHANGELOG.md` under a "Glossary changes" subsection

## Key Terms (Sampling)

A representative set from the Technical register:

| Term | Description |
| --- | --- |
| `vault` | The user's knowledge directory. Holds `raw/`, `wiki/`, `CLAUDE.md`. |
| `wiki` | LLM-maintained typed pages in `wiki/`. Every page cites at least one source. |
| `raw content` | Immutable source material in `raw/`. Writes blocked by `protect-raw.sh`. |
| `MOC` | Map of Content. Per-folder MOC is the folder note; vault MOC is `wiki/index.md`. |
| `folder note` | Per-folder index file named exactly after its folder (`<topic>/<topic>.md`, `type: index`). |
| `provenance` | Traceable chain from a wiki page's `sources:` through `_sources/` to raw content. |
| `deterministic engine` | Bun CLI that validates the vault without embeddings or inference. |
| `four-layer stack` | The architecture: Data · Skills · Agents · Orchestration. |
| `wiki-only graph` | Obsidian graph showing only generated `wiki/` pages (ADR-0023). |
| `snapshot` | Git-bounding an LLM write phase via `engine snapshot pre/post`. |
| `commit backstop` | `SubagentStop` safety net that commits any uncommitted vault changes. |
| `scaffolding ablation` | Eval measuring what the plugin buys over plain LLM extraction (ADR-0020). |

## Related Concepts

- [[Schema Authority]] — `vault/CLAUDE.md` that also defines enum lists
- [[Design-Drift Gate]] — `validate-docs.sh` that runs both the glossary gate and node-grounding gate
- [[Banned Strings]] — the specific strings `validate-docs.sh` rejects
- [[claude-wiki-pages Plugin]] — the product the glossary describes
