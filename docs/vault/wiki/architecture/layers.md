---
title: "Layer 1 — Data"
type: concept
aliases: ["Layer 1 — Data", "Layer 1", "Data layer", "Layer 1 Data"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Architecture]]", "[[Glossary]]", "[[Features]]"]
related: ["[[Four-Layer Stack]]", "[[Provenance]]", "[[Hook-Enforced Safety]]"]
contradicts: []
supersedes: []
depends_on: []
tags: [architecture, data-layer]
created: 2026-06-11
updated: 2026-06-11
update_count: 1
status: active
confidence: 1.0
---

# Layer 1 — Data

The vault: immutable `raw/` source material, LLM-maintained `wiki/` pages, and the vault schema (`docs/vault-example/CLAUDE.md`). Passive — holds the material.

## Components

- **`raw/`** — Immutable source material. Writes blocked by `protect-raw.sh`. Sources enter here and are never rewritten.
- **`wiki/`** — LLM-maintained typed pages organized in a topic tree. Every page cites at least one source.
- **`CLAUDE.md`** (vault schema) — The schema authority; every skill and agent defers to it. Defines frontmatter, required fields, ontology, and ingest rules.

## Provenance is Structural

Every claim in every wiki page carries a `sources` field back to at least one `raw/` item. This is structural provenance — it is enforced by the schema and validated by `verify-ingest.sh`, not by convention alone.

## Failure Mode

Data corruption looks like a missing `sources` field or an orphan page. Caught by Layer 4 (`validate-frontmatter.sh`, lint) — the only layer where this failure can be observed.

---

# Layer 2 — Skills

Single-responsibility slash commands. Twenty-three ship: 12 plugin-authored verbs (`init`, `ingest`, `query`, `lint`, `fix`, `status`, `synthesize`, `index`, `markdown`, `search`, `review`, `draft`), `onboarding`, 5 agent-teaching skills (`engine-api`, `maintain-contract`, `analyst-modes`, `curator-fixes`, `ingest-pipeline`), `obsidian-graph-colors`, `obsidian-vault`, and 3 MIT-licensed `obsidian-*` reference skills.

## Naming Convention

- **Skills** use bare short verbs or noun suffixes: `ingest`, `query`, `lint`.
- Skills targeting Obsidian keep an `obsidian-` prefix: `obsidian-graph-colors`.
- Third-party reference skills retain their upstream MIT names: `obsidian-markdown`, `obsidian-bases`, `obsidian-cli`.

## Failure Mode

A skill misbehaving looks like bad output for one command. Caught by the human re-running with different input.

---

# Layer 3 — Agents

Multi-step executors composing skills. Seven ship: orchestrator, onboarding, ingest, curator, analyst, polish, and maintenance.

See individual agent pages: [[claude-wiki-pages-orchestrator-agent]], [[claude-wiki-pages-ingest-agent]], [[claude-wiki-pages-curator-agent]], [[claude-wiki-pages-analyst-agent]], [[claude-wiki-pages-polish-agent]], [[claude-wiki-pages-maintenance-agent]], [[claude-wiki-pages-onboarding-agent]].

## Failure Mode

An agent misbehaving looks like a half-written wiki after a long run. Caught by Layer 4's `SubagentStop` gates.

---

# Layer 4 — Orchestration

Hooks, scripts, and rules that enforce the schema at every tool call.

- **Slash commands**: `commands/wiki.md` (`/claude-wiki-pages:wiki`), `commands/doctor.md` (`/claude-wiki-pages:doctor`).
- **`PreToolUse` hooks**: block frontmatter violations, non-wikilink cross-references, edits to `raw/`.
- **`PostToolUse` hooks**: remind the LLM to update `_index.md` and `index.md` after writes.
- **`SubagentStop` hooks**: run `verify-ingest.sh` after the ingest pipeline; surface unresolved lint errors.
- **Rules in `rules/`**: path-scoped guidance (`raw/` is immutable, wiki uses `[[wikilinks]]`).

## Failure Mode

Orchestration misbehaving looks like hooks not firing. Caught by startup reminders and the health check in `/claude-wiki-pages:doctor`.
