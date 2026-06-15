---
title: "Onboarding Wizard"
type: concept
aliases: ["Onboarding Wizard", "onboarding-wizard", "onboarding wizard", "init wizard", "first-run wizard"]
parent: "[[how-it-works|How It Works]]"
path: "how-it-works"
sources: ["[[_sources/getting-started|Getting Started (CLI Quickstart)]]", "[[llm-wiki-index|User Guide: Index]]", "[[llm-wiki-01-getting-started|User Guide 01: Getting Started]]", "[[llm-wiki-02-create-new-vault|User Guide 02: Create a New Vault]]", "[[_sources/install|Installation Guide]]", "[[plugin-onboarding-agent|Onboarding Agent Source]]"]
related: ["[[Installation]]", "[[ingest-pipeline|Ingest Pipeline]]", "[[vault-resolution|Vault Resolution]]", "[[git-checkpoint|Git Checkpoint]]", "[[plugin|claude-wiki-pages Plugin]]"]
tags: ["onboarding", "guides", "getting-started"]
created: 2026-06-13
updated: 2026-06-13
update_count: 6
status: active
confidence: 1.0
---

# Onboarding Wizard

> [!summary]
> The Onboarding Wizard is the guided first-run experience invoked by `/claude-wiki-pages:onboarding` (or automatically by the orchestrator when no vault exists). It walks a user from a fresh plugin install to a working, queryable wiki in a single Claude Code session. The wizard is idempotent — running it again on a partially onboarded vault is safe.

## Key Principles

- The wizard is idempotent: running it again on a partially onboarded vault resumes from where it left off — no content is overwritten.
- The wizard's goal is TTFV: minimize the time from install to the user's first cited answer.
- Advanced features (local model configuration, multi-vault registry, maintenance automation) are not surfaced during onboarding — they are progressive-disclosure items.
- The ingest write phase runs inside a `snapshot pre` → write → `snapshot post` git checkpoint envelope, making it fully reversible.
- Each step probes state before acting; the wizard never overwrites existing vault content.

## Examples

Two entry points — the orchestrator detects no vault and dispatches automatically, or the user invokes directly:

```
/claude-wiki-pages:wiki             # auto-dispatch when no vault detected
/claude-wiki-pages:onboarding       # direct invocation
```

Vault structure scaffolded by the wizard:

```
vault/
├── CLAUDE.md               # authoritative schema for the vault
├── _templates/             # frontmatter templates per type
├── raw/
│   ├── sample-source.md    # bundled sample for first ingest
│   └── assets/
├── wiki/
│   ├── index.md            # vault MOC
│   ├── log.md              # operations log
│   ├── _sources/
│   └── _synthesis/
└── output/
```

## Definition

The Onboarding Wizard is the guided first-run flow of the `claude-wiki-pages` plugin. It is executed by the `claude-wiki-pages-onboarding-agent` when the orchestrator detects no vault exists, or invoked directly via `/claude-wiki-pages:onboarding`. The wizard's goal is to minimize time-to-first-value: the elapsed time from install to the user's first successful cited answer.

## Entry Points

```
/claude-wiki-pages:wiki            # orchestrator detects no vault → dispatches wizard automatically
/claude-wiki-pages:onboarding      # direct invocation
```

The orchestrator's dispatch rule: if no vault exists (no `vault/CLAUDE.md` with `schema_version` and no `wiki/` sibling), run the init wizard. The wizard ends with a structured `NEXT_STEP:` trailing line that the orchestrator parses to decide whether to chain immediately to ingest.

## The Five Steps

### 1. Health Check

Runs `engine.sh verify` to confirm prerequisites:

- git initialized and vault is a repo
- schema version present in `CLAUDE.md`
- `wiki/index.md` exists
- `wiki/log.md` exists

### 2. Scaffold

Creates the vault directory structure if absent, copying `docs/vault-example/` into the user's project as `docs/vault/` (or the path set in `CLAUDE_WIKI_PAGES_VAULT`):

```
vault/
├── CLAUDE.md               # authoritative schema for the vault
├── _templates/             # frontmatter templates per type
├── raw/
│   ├── sample-source.md    # bundled sample — ingest this first
│   └── assets/             # images and attachments
├── wiki/
│   ├── index.md            # vault MOC
│   ├── log.md              # operations log
│   ├── _sources/
│   └── _synthesis/
└── output/                 # optional git-ignored scratch space
```

### 3. Add a Source

Guides the user to drop a document into `raw/` and confirms it appears. The bundled `sample-source.md` provides something to ingest immediately if the user has no files ready.

### 4. Ingest

Triggers the full 13-step ingest pipeline under a git checkpoint:

- Source summary written to `wiki/_sources/`
- Entities/concepts extracted to topic folders
- Folder notes updated
- `wiki/index.md` updated
- `wiki/log.md` updated

### 5. First Cited Answer

Runs a sample query to show the `## Sources` contract in action — a real cited answer from the user's own wiki within a few minutes of starting.

## Design Principles

- **Idempotent:** Each step probes state before acting. Running the wizard on a half-onboarded vault resumes from where it left off — it never overwrites existing content.
- **Progressive disclosure:** Advanced operations (`/claude-wiki-pages:doctor`, optimization passes) are introduced after the basics are established — not at step 1.
- **Git-checkpointed ingest:** The write phase runs inside a `snapshot pre` → write → `snapshot post` envelope, making it fully reversible.
- **Step-by-step with explanations:** After each action, the wizard gives a plain-language explanation so the user understands what just happened.

## After the Wizard

The user's mental model:

```
/claude-wiki-pages:wiki   ← type this any time
```

The orchestrator will probe vault state and route to ingest, curator, or analyst automatically. The user never needs to remember the specialist commands unless they want tighter scope.

## Related Concepts

- [[Installation]] — prerequisites before running the wizard
- [[ingest-pipeline|Ingest Pipeline]] — the full 13-step process the wizard triggers in step 4
- [[vault-resolution|Vault Resolution]] — how the wizard locates or creates the vault (4-tier resolution)
- [[git-checkpoint|Git Checkpoint]] — the snapshot mechanism protecting ingest writes
- [[plugin|claude-wiki-pages Plugin]] — what gets installed before the wizard runs
