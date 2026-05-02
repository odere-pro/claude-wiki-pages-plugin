# llm-wiki-stack

> Karpathy's LLM Wiki, shipped as a Claude Code plugin — four layers, hook-enforced.

[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/version-0.2.0-green.svg)](./CHANGELOG.md)
[![Claude Code plugin](https://img.shields.io/badge/claude%20code-plugin-8A2BE2.svg)](https://docs.claude.com/en/docs/claude-code/plugins)

A Claude Code plugin that turns an **Obsidian vault** into a maintained, provenance-tracked **knowledge base** following [Andrej Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f). The human curates sources; the plugin maintains the wiki; **hooks enforce the schema at every tool-call boundary**.

The system is spec-driven: the contract lives in [`SPEC.md`](./SPEC.md), the schema in [`docs/vault-example/CLAUDE.md`](./docs/vault-example/CLAUDE.md), the canonical terms in [`docs/VOCABULARY.md`](./docs/VOCABULARY.md). Every skill, agent, and hook binds to them.

---

## What's inside

| Layer        | Surface                                                                                                                       | Count |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- | :---: |
| **Data**     | `docs/vault-example/` — immutable `raw/`, LLM-maintained `wiki/`, schema in `vault/CLAUDE.md`                                 |   1   |
| **Skills**   | 9 plugin-authored `llm-wiki-*` + `obsidian-graph-colors` + 3 third-party `obsidian-*` (MIT, kepano)                           |  13   |
| **Agents**   | Orchestrator (entry) + ingest, curator, analyst, polish — see [docs/operations.md](./docs/operations.md)                      |   5   |
| **Commands** | `/llm-wiki-stack:wiki`, `/llm-wiki-stack:wiki-doctor`                                                                         |   2   |
| **Hooks**    | `SessionStart` + `UserPromptSubmit` + 4 `PreToolUse` + 2 `PostToolUse` + 2 `SubagentStop`                                     |  10   |
| **Rules**    | Path-scoped guidance under `rules/`                                                                                           |   4   |
| **Tests**    | Five tiers — Tier 0 static, Tier 1 Bats unit, Tier 2 smoke, Tier 3 release, Tier 4 adversarial                                |   5   |

Long-form architecture: [docs/architecture.md](./docs/architecture.md). Feature list and competitor comparison: [docs/features.md](./docs/features.md).

---

## Prerequisites

| Tool        | Purpose                                                  | Install                                                  |
| ----------- | -------------------------------------------------------- | -------------------------------------------------------- |
| Claude Code | `>= 2.0`                                                 | [docs.claude.com/code](https://docs.claude.com/en/docs/claude-code) |
| `bash`, `git`, `find` | Hook scripts and file walking                  | Pre-installed on macOS / Linux                           |
| `jq`        | JSON parsing in hooks and resolvers                      | `brew install jq` / `apt-get install jq`                 |
| Obsidian    | Optional — for graph view, Dataview, Web Clipper         | [obsidian.md](https://obsidian.md/)                      |

**OS:** macOS or Linux verified. Windows/WSL unverified for hook scripts; markdown-only paths should work.

---

## Install

```text
/plugin marketplace add odere-pro/llm-wiki-stack
/plugin install llm-wiki-stack
/llm-wiki-stack:wiki-doctor
```

`wiki-doctor` should print all green. If it does not, fix the prerequisite it flags. Local-clone install, update, and uninstall: see [docs/install.md](./docs/install.md).

---

## Quickstart

```text
/llm-wiki-stack:wiki
```

The orchestrator probes vault state and dispatches:

- **No vault yet** → runs the `llm-wiki` wizard. Scaffolds `docs/vault/` from the example, writes the schema, prints the next three things to do.
- **New files in `raw/`** → runs `llm-wiki-stack-ingest-agent`. Produces typed wiki pages with citations and a `wiki/log.md` entry, then runs `llm-wiki-stack-polish-agent` to refresh graph colors and indexes.
- **Pending lint after an ingest** → runs `llm-wiki-stack-curator-agent` to audit and repair.
- **Analytical prompt** (`what`, `why`, `compare`, `summarize`, …) → runs `llm-wiki-stack-analyst-agent`. Every answer cites `[[wikilinks]]` back to source.

First-time walkthrough (~30 minutes): [docs/playbooks/200-foundational.md](./docs/playbooks/200-foundational.md). Full operations reference: [docs/operations.md](./docs/operations.md).

---

## Documentation

| Topic                          | Guide                                                                       |
| ------------------------------ | --------------------------------------------------------------------------- |
| Install / update / uninstall   | [docs/install.md](./docs/install.md)                                        |
| Day-to-day operations          | [docs/operations.md](./docs/operations.md)                                  |
| Features and comparison        | [docs/features.md](./docs/features.md)                                      |
| Architecture (four layers)     | [docs/architecture.md](./docs/architecture.md)                              |
| Spec (every contract)          | [SPEC.md](./SPEC.md)                                                        |
| Vocabulary                     | [docs/VOCABULARY.md](./docs/VOCABULARY.md)                                  |
| Security and threat model      | [docs/security.md](./docs/security.md)                                      |
| Step-by-step user guides       | [docs/llm-wiki/](./docs/llm-wiki/index.md)                                  |
| Playbooks (200 / 300 / 500)    | [docs/playbooks/](./docs/playbooks/index.md)                                |
| ADRs                           | [docs/adr/](./docs/adr/README.md)                                           |
| Risk and follow-up tracker     | [docs/risk-report-0.2.0.md](./docs/risk-report-0.2.0.md)                    |
| Test harness                   | [tests/README.md](./tests/README.md)                                        |
| Contributing                   | [CONTRIBUTING.md](./CONTRIBUTING.md)                                        |
| Release log                    | [CHANGELOG.md](./CHANGELOG.md)                                              |
| Vulnerability disclosure       | [SECURITY.md](./SECURITY.md), [SUPPORT.md](./SUPPORT.md)                    |

---

## Privacy

No telemetry. The plugin never phones home. Your vault, your hooks, your shell. Settings are local at `.claude/llm-wiki-stack/settings.json`.

---

## License and non-affiliation

Licensed under [Apache 2.0](./LICENSE). See [`NOTICE`](./NOTICE) for bundled third-party code and [`THIRD_PARTY_LICENSES.md`](./THIRD_PARTY_LICENSES.md) for full license text.

Not affiliated with Anthropic, Obsidian, or Andrej Karpathy — this is an independent implementation built on their public work. Credits:

- [Andrej Karpathy's LLM Wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — the pattern this implements.
- [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills) — MIT — `obsidian-markdown`, `obsidian-bases`, `obsidian-cli` skills, included unmodified.
- [Anthropic](https://www.anthropic.com/) — Claude Code and the plugin format.
- [Obsidian](https://obsidian.md/) — the vault format this plugin maintains.

Author: [odere-pro on GitHub](https://github.com/odere-pro).
