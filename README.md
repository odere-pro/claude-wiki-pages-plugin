# llm-wiki-stack

> Karpathy's LLM Wiki, shipped as a Claude Code plugin — four layers, hook-enforced.

[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/version-0.2.0-green.svg)](./CHANGELOG.md)
[![Claude Code plugin](https://img.shields.io/badge/claude%20code-plugin-8A2BE2.svg)](https://docs.claude.com/en/docs/claude-code/plugins)

<!-- TODO(SEO, gap-3): create docs/banner.svg (1280×640). Social share cards
     (Twitter, LinkedIn, Slack unfurls, GitHub OG image) fall back to GitHub's
     auto-generated card without one. Depict the four-layer stack.
     Once the asset exists, replace this comment with:
     `![llm-wiki-stack banner](./docs/banner.svg)` -->

<!-- TODO(SEO, gap-6): capture a screenshot or GIF of the plugin in action
     (e.g. split-screen of Obsidian graph view with the plugin maintaining
     indexes, plus a Claude Code session running
     `/llm-wiki-stack:wiki`). Place under `docs/assets/`
     and reference it here above "What it is" to raise click-through on
     shared links. -->

## What it is

A Claude Code plugin that turns an **Obsidian vault** into a maintained, provenance-tracked **knowledge base** following [Andrej Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f). The human curates sources; the plugin maintains the wiki; **hooks enforce the schema at every tool-call boundary**.

The entire system is **spec-driven**: the contract lives in [`SPEC.md`](./SPEC.md) and the authoritative schema lives in [`docs/vault-example/CLAUDE.md`](./docs/vault-example/CLAUDE.md). Every skill, agent, and hook binds to them. Canonical terminology is locked down by [`docs/VOCABULARY.md`](./docs/VOCABULARY.md) and enforced in CI.

### Features

- **Typed wiki pages** with YAML frontmatter — six page types (`source`, `entity`, `concept`, `synthesis`, `index`, `log`) and strict schema validation on every write.
- **Provenance by construction** — every non-source page carries a `sources:` field with `[[wikilinks]]` back to immutable raw content under `raw/`. Plain strings are a lint error.
- **Map of Content (MOC)** — per-folder `_index.md` and vault-level `wiki/index.md`, auto-maintained by the pipeline.
- **Hook-enforced immutability** of `raw/` — `protect-raw.sh` blocks any attempt to rewrite a source.
- **`SubagentStop` completion gates** — long-running ingest and lint-fix agents cannot leave the wiki in a half-written state.
- **One-command pipeline** — `ingest → verify → lint-fix → synthesize` in a single run; stops on any drift.
- **Cross-topic synthesis notes** with explicit `scope:` and `synthesis_type` (`comparison`, `theme`, `contradiction`, `gap`, `timeline`).
- **Confidence discipline** — `confidence ≥ 0.8` requires two corroborating sources; `1.0` requires a direct quote.
- **Obsidian-native** — works with Dataview, Templater, Web Clipper, and the graph view out of the box.
- **Five-tier test harness** (Tier 0 static / Tier 1 Bats unit / Tier 2 smoke / Tier 3 release / Tier 4 adversarial).

## Why another one

Every other Claude-Code plugin is a toolbox. This one is a four-layer architecture with hook-enforced boundaries.

| Question                             | Competitor stance                                                                                          | `llm-wiki-stack`                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Can I run this locally?              | [`obsidian-llm-wiki-local`](https://github.com/kytmanov/obsidian-llm-wiki-local): yes, local-LLM only      | Yes — provider-agnostic, via whichever model Claude Code uses    |
| Can I install it as a Claude plugin? | [`rvk7895/llm-knowledge-bases`](https://github.com/rvk7895/llm-knowledge-bases): yes, as a bag of commands | Yes, **plus** a four-layer architecture with hook-enforced gates |
| Does it ship a security model?       | Nobody in the top 10 does                                                                                  | Yes — see [`docs/security.md`](./docs/security.md)               |

## The stack

Four layers. Each one catches a different class of failure.

- **Layer 1 — Data** — `docs/vault-example/` with an immutable `raw/` and an LLM-maintained `wiki/`, governed by the schema in [`docs/vault-example/CLAUDE.md`](./docs/vault-example/CLAUDE.md).
- **Layer 2 — Skills** — 13 single-responsibility capabilities in [`skills/`](./skills/): `llm-wiki` (onboarding), `llm-wiki-ingest`, `llm-wiki-query`, `llm-wiki-lint`, `llm-wiki-fix`, `llm-wiki-status`, `llm-wiki-synthesize`, `llm-wiki-index`, `llm-wiki-markdown`, `obsidian-graph-colors`, `obsidian-markdown`, `obsidian-bases`, `obsidian-cli`.
- **Layer 3 — Agents** — 5 multi-step executors in [`agents/`](./agents/): `llm-wiki-stack-orchestrator-agent` (entry), `llm-wiki-stack-ingest-agent`, `llm-wiki-stack-curator-agent`, `llm-wiki-stack-analyst-agent`, `llm-wiki-stack-polish-agent` (tail-of-write Obsidian-side refresh).
- **Layer 4 — Orchestration** — hooks wired in [`hooks/hooks.json`](./hooks/hooks.json), scripts in [`scripts/`](./scripts/), path-scoped rules in [`rules/`](./rules/).

The long version lives in [`docs/architecture.md`](./docs/architecture.md).

## Installation

### Remote (marketplace)

```
/plugin marketplace add odere-pro/llm-wiki-stack
/plugin install llm-wiki-stack
/llm-wiki-stack:llm-wiki
```

### Local (contributors / forks)

```bash
git clone https://github.com/odere-pro/llm-wiki-stack
```

Then from a Claude Code session:

```
/plugin marketplace add /path/to/llm-wiki-stack
/plugin install llm-wiki-stack
/llm-wiki-stack:llm-wiki
```

The third command in either path runs the **onboarding wizard**, which scaffolds a vault in your project by copying `docs/vault-example/`, smoke-tests the install, and prints the next three things to do. See [`docs/llm-wiki/01-getting-started.md`](./docs/llm-wiki/01-getting-started.md) for the walkthrough.

### Update / reinstall

**Remote:** uninstall and reinstall to pull the latest version.

```
/plugin uninstall llm-wiki-stack
/plugin install llm-wiki-stack
```

**Local:** changes in the source directory take effect on the next Claude Code session — no reinstall needed. If `marketplace.json` or `plugin.json` changed, re-add the marketplace first:

```
/plugin marketplace remove llm-wiki-stack
/plugin marketplace add /path/to/llm-wiki-stack
/plugin uninstall llm-wiki-stack
/plugin install llm-wiki-stack
```

### Uninstall

```
/plugin uninstall llm-wiki-stack
```

Your vault (`vault/`) is not touched — only the plugin is removed.

## Operations

The one verb you need to know is **the pipeline** — it runs ingest, verifies the result, lint-fixes any structural drift, and files a synthesis note if the run warrants one.

| Verb         | Slash command                              | Notes                                                                                                                 |
| ------------ | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| **Wiki**     | `/llm-wiki-stack:wiki`                     | Top-level entry. Probes vault state and routes to init, ingest, curator, or analyst — one verb does the right thing. |
| **Doctor**   | `/llm-wiki-stack:wiki-doctor`              | Environment health check. Run after install and any time something feels wrong.                                       |
| **Query**    | `/llm-wiki-stack:llm-wiki-query`           | Traversal starts from the vault MOC and topic per-folder MOCs; every answer cites `[[wikilinks]]` back to wiki pages. |
| **Status**   | `/llm-wiki-stack:llm-wiki-status`          | One-command health check — exercises every hook path and reports green/red.                                           |

Power-user skills for running the individual verbs: `llm-wiki-ingest`, `llm-wiki-lint`, `llm-wiki-fix`, `llm-wiki-synthesize`, `llm-wiki-index`. Contracts for each live in [`SPEC.md`](./SPEC.md) §9.

Step-by-step walkthroughs: [`docs/llm-wiki/`](./docs/llm-wiki/index.md).

## Security model

Three threats, one unenforceable boundary. Each defense is test-backed; the test file is named inline.

- **Prompt injection via ingested sources** — the schema is read before the source, not after it. `raw/` is immutable (`tests/scripts/protect-raw.bats`). Frontmatter-bound writes block malicious output shapes (`tests/scripts/validate-frontmatter.bats`, `check-wikilinks.bats`). `SubagentStop` gates halt on unresolved ingest errors (`tests/scripts/subagent-ingest-gate.bats`, `subagent-lint-gate.bats`).
- **Provenance drift** — every non-source page has a `sources` field; `confidence` is lower-bounded by the count of corroborating sources; `llm-wiki-stack-curator-agent` repairs structural drift (`tests/scripts/verify-ingest.bats`, `tests/smoke/fresh-install.sh`).
- **Vault poisoning** — ingest is additive. A contradicting source adds to `contradicts`; it does not silently overwrite. Every ingest lands a `wiki/log.md` entry for human audit (`tests/scripts/post-ingest-summary.bats`, `post-wiki-write.bats`).
- **MCP auth** — the plugin does not expose an MCP server. When it does, it will be scoped to the vault path.
- **Tier 4 adversarial** — weekly `.github/workflows/adversarial.yml`: `garak` and `osv-scanner` run live; the prompt-injection corpus replay is **stubbed pending fixture**.
- **What it does not defend** — unsigned provenance, non-sandboxed hook scripts, LLM-opinion confidence scores. Full list with per-threat test mapping in [`docs/security.md`](./docs/security.md).

## Documentation

Start with whichever doc matches your question:

| Doc                                                                                                | Purpose                                                                                                     |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [`SPEC.md`](./SPEC.md)                                                                             | Reproducibility-grade system spec. Every contract an implementer needs.                                     |
| [`docs/VOCABULARY.md`](./docs/VOCABULARY.md)                                                       | Canonical term list. Technical vs. discoverability registers; banned strings; enforced by validate-docs.sh. |
| [`docs/architecture.md`](./docs/architecture.md)                                                   | Four-layer model explained in prose.                                                                        |
| [`docs/security.md`](./docs/security.md)                                                           | Threat model, known limits, responsible-disclosure process.                                                 |
| [`docs/llm-wiki/index.md`](./docs/llm-wiki/index.md)                                               | User-facing entry point. Links out to the seven step-by-step guides.                                        |
| [`docs/llm-wiki/01-getting-started.md`](./docs/llm-wiki/01-getting-started.md)                     | Day 1 → Day 7 → Day 30 walkthrough.                                                                         |
| [`docs/llm-wiki/02-create-new-knowledge-base.md`](./docs/llm-wiki/02-create-new-knowledge-base.md) | Scaffold a vault from the example.                                                                          |
| [`docs/llm-wiki/03-update-existing.md`](./docs/llm-wiki/03-update-existing.md)                     | Add sources, images, and batches.                                                                           |
| [`docs/llm-wiki/04-review-validate-fix.md`](./docs/llm-wiki/04-review-validate-fix.md)             | Four levels of review — from spot-check to auto-repair.                                                     |
| [`docs/llm-wiki/05-export-outputs.md`](./docs/llm-wiki/05-export-outputs.md)                       | Compile reports, briefs, and ADRs from the wiki.                                                            |
| [`docs/llm-wiki/06-check-the-dashboard.md`](./docs/llm-wiki/06-check-the-dashboard.md)             | The Dataview dashboard and what it tells you.                                                               |
| [`docs/llm-wiki/07-query-the-wiki.md`](./docs/llm-wiki/07-query-the-wiki.md)                       | Query and analyst-mode patterns.                                                                            |
| [`tests/README.md`](./tests/README.md)                                                             | Test harness — tiers, fixtures, smoke, local runs.                                                          |
| [`docs/adr/`](./docs/adr/README.md)                                                                | Architecture Decision Records — the rationale behind decisions in `/SPEC.md`.                               |
| [`docs/plan/`](./docs/plan/)                                                                       | In-flight design plans before they become ADRs.                                                             |
| [`CHANGELOG.md`](./CHANGELOG.md)                                                                   | Release log.                                                                                                |
| [`SECURITY.md`](./SECURITY.md)                                                                     | Security policy — vulnerability reporting and supply chain.                                                 |
| [`SUPPORT.md`](./SUPPORT.md)                                                                       | How to get help, where to file what.                                                                        |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md)                                                             | Contribution guide.                                                                                         |

## Credits

- [Andrej Karpathy's LLM Wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — the pattern this implements.
- [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills) — MIT — `obsidian-markdown`, `obsidian-bases`, `obsidian-cli` skills, included unmodified.
- [Anthropic](https://www.anthropic.com/) — Claude Code and the plugin format.
- [Obsidian](https://obsidian.md/) — the vault format this plugin maintains.

## License and non-affiliation

Licensed under [Apache 2.0](./LICENSE). See [`NOTICE`](./NOTICE) for a summary of bundled third-party code and [`THIRD_PARTY_LICENSES.md`](./THIRD_PARTY_LICENSES.md) for full license text. Not affiliated with Anthropic, Obsidian, or Andrej Karpathy — this is an independent implementation built on their public work.

Author: [odere-pro on GitHub](https://github.com/odere-pro).
