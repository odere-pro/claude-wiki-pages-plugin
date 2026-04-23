# llm-wiki-stack

> Karpathy's LLM Wiki, shipped as a Claude Code plugin — four layers, hook-enforced.

[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-green.svg)](./CHANGELOG.md)
[![Claude Code plugin](https://img.shields.io/badge/claude%20code-plugin-8A2BE2.svg)](https://docs.claude.com/en/docs/claude-code/plugins)

<!-- Banner: drop a 1280×640 SVG or PNG at docs/banner.svg when ready -->

## What it is

A Claude Code plugin that turns an Obsidian vault into a maintained, provenance-tracked knowledge base following [Andrej Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f). The human curates sources; the plugin maintains the wiki; hooks enforce the schema at every tool-call boundary.

The contract lives in [`docs/SPECIFICATION.md`](./docs/SPECIFICATION.md) and the schema lives in [`example-vault/CLAUDE.md`](./example-vault/CLAUDE.md). Every skill, agent, and hook in this plugin is bound to them.

## Why another one

Every other Claude-Code plugin is a toolbox. This one is a four-layer architecture with hook-enforced boundaries.

| Question                             | Competitor stance                                                                                          | `llm-wiki-stack`                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Can I run this locally?              | [`obsidian-llm-wiki-local`](https://github.com/kytmanov/obsidian-llm-wiki-local): yes, local-LLM only      | Yes — provider-agnostic, via whichever model Claude Code uses    |
| Can I install it as a Claude plugin? | [`rvk7895/llm-knowledge-bases`](https://github.com/rvk7895/llm-knowledge-bases): yes, as a bag of commands | Yes, **plus** a four-layer architecture with hook-enforced gates |
| Does it ship a security model?       | Nobody in the top 10 does                                                                                  | Yes — see [`docs/security.md`](./docs/security.md)               |

## The stack

Four layers. Each one catches a different class of failure.

- **Layer 1 — Data** — `example-vault/` with an immutable `raw/` and an LLM-maintained `wiki/`, governed by the schema in [`example-vault/CLAUDE.md`](./example-vault/CLAUDE.md).
- **Layer 2 — Skills** — 12 single-responsibility capabilities in [`skills/`](./skills/): `llm-wiki` (onboarding), `llm-wiki-ingest`, `llm-wiki-query`, `llm-wiki-lint`, `llm-wiki-fix`, `llm-wiki-status`, `llm-wiki-synthesize`, `llm-wiki-index`, `obsidian-graph-colors`, `obsidian-markdown`, `obsidian-bases`, `obsidian-cli`.
- **Layer 3 — Agents** — 3 multi-step executors in [`agents/`](./agents/): `llm-wiki-ingest-pipeline`, `llm-wiki-lint-fix`, `llm-wiki-analyst`.
- **Layer 4 — Orchestration** — hooks wired in [`hooks/hooks.json`](./hooks/hooks.json), scripts in [`scripts/`](./scripts/), path-scoped rules in [`rules/`](./rules/).

The long version lives in [`docs/architecture.md`](./docs/architecture.md).

## Quick start

```
/plugin marketplace add odere-pro/llm-wiki-stack
/plugin install llm-wiki-stack@llm-wiki-stack
/llm-wiki-stack:llm-wiki
```

The third command runs the onboarding wizard, which scaffolds a vault in your project by copying `example-vault/`, smoke-tests the install, and prints the next three things to do.

## Operations

The one verb you need to know is **the pipeline** — it runs ingest, verifies the result, lint-fixes any structural drift, and files a synthesis note if the run warrants one.

| Verb         | Slash command                          | Notes                                                                                                                 |
| ------------ | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Pipeline** | `/llm-wiki-stack:llm-wiki-ingest-pipeline` | Default. Chains ingest → verify → lint-fix → synthesize.                                                          |
| **Query**    | `/llm-wiki-stack:llm-wiki-query`       | Traversal starts from the vault MOC and topic per-folder MOCs; every answer cites `[[wikilinks]]` back to wiki pages. |
| **Status**   | `/llm-wiki-stack:llm-wiki-status`      | One-command health check — exercises every hook path and reports green/red.                                           |

Power-user skills for running the individual verbs: `llm-wiki-ingest`, `llm-wiki-lint`, `llm-wiki-fix`, `llm-wiki-synthesize`, `llm-wiki-index`. Contracts for each live in [`docs/SPECIFICATION.md`](./docs/SPECIFICATION.md) §8.

Step-by-step walkthroughs: [`docs/llm-wiki/`](./docs/llm-wiki/index.md).

## Security model

Three threats, one unenforceable boundary.

- **Prompt injection via ingested sources** — the schema is read before the source, not after it. `raw/` is immutable. Frontmatter-bound writes block malicious output shapes.
- **Provenance drift** — every non-source page has a `sources` field; `confidence` is lower-bounded by the count of corroborating sources; `llm-wiki-lint-fix` repairs structural drift.
- **Vault poisoning** — ingest is additive. A contradicting source adds to `contradicts`; it does not silently overwrite.
- **MCP auth** — the plugin does not expose an MCP server. When it does, it will be scoped to the vault path.
- **What it does not defend** — unsigned provenance, non-sandboxed hook scripts, LLM-opinion confidence scores. Full list in [`docs/security.md`](./docs/security.md).

## Credits

- [Andrej Karpathy's LLM Wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — the pattern this implements.
- [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills) — MIT — `obsidian-markdown`, `obsidian-bases`, `obsidian-cli` skills, included unmodified.
- [Anthropic](https://www.anthropic.com/) — Claude Code and the plugin format.
- [Obsidian](https://obsidian.md/) — the vault format this plugin maintains.

## License and non-affiliation

Licensed under [Apache 2.0](./LICENSE). See [`NOTICE`](./NOTICE) for a summary of bundled third-party code and [`THIRD_PARTY_LICENSES.md`](./THIRD_PARTY_LICENSES.md) for full license text. Not affiliated with Anthropic, Obsidian, or Andrej Karpathy — this is an independent implementation built on their public work.

## Links

- Author — [odere-pro on GitHub](https://github.com/odere-pro)
- Architecture — [`docs/architecture.md`](./docs/architecture.md)
- Security — [`docs/security.md`](./docs/security.md)
- User guides — [`docs/llm-wiki/`](./docs/llm-wiki/index.md)
- Schema — [`example-vault/CLAUDE.md`](./example-vault/CLAUDE.md)
