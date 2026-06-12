---
title: "Plugin Overview — claude-wiki-pages"
type: synthesis
synthesis_type: theme
aliases: ["Plugin Overview — claude-wiki-pages", "Plugin Overview"]
path: "_synthesis"
scope:
  - "[[Four-Layer Stack]]"
  - "[[Agent Roles]]"
  - "[[Skill Catalog]]"
  - "[[Orchestration Layer]]"
  - "[[Local Model Quality Gate]]"
  - "[[Scaffolding Ablation]]"
sources:
  - "[[architecture]]"
  - "[[GLOSSARY]]"
  - "[[operations]]"
  - "[[features]]"
  - "[[local-models]]"
  - "[[automation]]"
  - "[[ADR Source Files]]"
tags: [synthesis, overview, architecture]
created: 2026-06-12
updated: 2026-06-12
status: active
confidence: 0.95
---

# Plugin Overview — claude-wiki-pages

> [!summary]
> `claude-wiki-pages` is a Claude Code plugin that implements Karpathy's LLM Wiki pattern as a four-layer architecture. It turns an Obsidian vault into a provenance-tracked, hook-enforced, query-capable wiki. The plugin's core value proposition — measured in ADR-0020 — is that its scaffolding drives schema validity and claim fidelity from 0.00 to 1.00 compared to generic LLM extraction.

## What It Is

`claude-wiki-pages` is a [Karpathy LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) implementation packaged as a Claude Code plugin. The human curates sources; the LLM maintains the wiki. Most LLM-wiki implementations are one layer (a prompt and a folder convention). This one is four, because each layer has a different failure mode.

## The Four Layers

| Layer | Directory | Responsibility |
| --- | --- | --- |
| **Layer 1 — Data** | `docs/vault-example/raw/`, `wiki/`, `CLAUDE.md` | Immutable sources + wiki schema |
| **Layer 2 — Skills** | `skills/` (24 skills) | Single-responsibility slash commands |
| **Layer 3 — Agents** | `agents/` (7 agents) | Multi-step executors that chain skills |
| **Layer 4 — Orchestration** | `hooks/`, `scripts/`, `rules/`, `commands/` | Hooks, scripts, rules, provenance guards |

See [[Four-Layer Stack]] for the detailed breakdown and failure-mode mapping.

## The Seven Agents

- **Orchestrator** — the single user-facing entry (`/claude-wiki-pages:wiki`); probes vault state and dispatches to one specialist.
- **Onboarding** — guided first-run wizard.
- **Ingest** — full ingest → verify → curate → synthesize cycle.
- **Curator** — audit + auto-repair; gates judgment fixes behind approval.
- **Analyst** — five modes: query, dashboard, document compile, extract, challenge.
- **Polish** — tail-of-write: graph colors, vault MOC, per-folder MOC consistency.
- **Maintenance** — autonomous catch-up loop on a schedule.

See [[Agent Roles]] for the naming convention (ADR-0002) and dispatch table.

## Key ADRs and Their Contributions

| ADR | Decision | Effect |
| --- | --- | --- |
| ADR-0001 | Single top-level command + state-probing dispatch | One verb to teach, one verb to demo |
| ADR-0004 | `ontology-profile-v1` in the schema | One edge set for graph traversal, one enum list for classification |
| ADR-0006 | One search score object (`matched[]`) | Transparent ranking; no second ranker |
| ADR-0007 | Embedding-free recall (synonym lexicon + stemmer) | Zero-overlap misses fixed without vectors |
| ADR-0009 | Multi-vault registry + cross-vault deny | One active vault; writes confined; cross-vault blocked even through `allowPaths` |
| ADR-0010 | Durable-memory carve-out | Agents persist session learnings through `raw/agent-sessions/` and the `_proposed/` gate |
| ADR-0011 | Local model quality gate | Per-model, per-tier allow-list; fail-closed |
| ADR-0017 | Fabrication floor (verbatim partition) | Over-citation ≠ fabrication; the floor correctly targets invention |
| ADR-0018 | Offline policy + degraded-mode routing | Claude-primary; local fallback opt-in; per-tier gate-approved |
| ADR-0020 | Scaffolding ablation | Measured: without the plugin, schema validity and claim fidelity both drop to 0.00 |

## How the Pieces Connect

1. **Human drops a source into `raw/`.** Layer 1 holds it immutably.
2. **Human runs `/claude-wiki-pages:wiki`.** Layer 4's slash command invokes the orchestrator.
3. **Orchestrator probes vault state.** Layer 3 dispatch to the ingest agent.
4. **Ingest agent reads `CLAUDE.md`** (Layer 1 schema) and calls the `ingest` skill (Layer 2).
5. **Every write passes Layer 4 hooks** (firewall, frontmatter validation, wikilink check, raw protection) before landing.
6. **Ingest agent writes `_sources/`, updates wiki pages, updates `_index.md` files, appends to `log.md`.** All in Layer 1.
7. **`SubagentStop` hook** runs `verify-ingest.sh` and the commit backstop.
8. **Polish agent** refreshes graph colors, vault MOC, and per-folder MOC consistency.

The user sees one command, one answer. The four layers did the rest.

## The Measured Value

The scaffolding ablation (ADR-0020) is the empirical proof of this design. `qwen3-coder:30b` through the plugin arm: `schema_validity 1.00`, `claim_source_fidelity 1.00`, `dedup_correctness 1.00`. Through the baseline arm (generic prompt): all three drop to `0.00`. The baseline's clean zero-fabrication floor is vacuous — no frontmatter means no sourced claims to fabricate, so the claims are unauditable, not honest.

What the scaffolding actually enforces:

| Mechanism | What it ensures |
| --- | --- |
| `validate-frontmatter.sh` PreToolUse gate | Schema-valid, typed pages on every write |
| `source_quotes` verbatim rule + `verify-ingest.sh` | Claims traceable to sources |
| Two-pass alias-aware dedup (ingest contract) | Stable page set; no drift |
| Citation protocol + runtime verification (ADR-0019) | Grounded, verifiable answers |
| `protect-raw.sh` | Immutable source material |
| `firewall.sh` + engine parity (gate-11) | Writes confined to the vault |
| `snapshot` verb + SubagentStop commit backstop | Every LLM write git-revertible |
| One `_proposed/` channel + review gate | Drafts gated behind human review |
