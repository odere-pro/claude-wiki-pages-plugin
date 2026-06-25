---
title: "Deterministic Engine"
type: concept
aliases: ["deterministic engine", "Bun CLI", "engine.sh", "engine verbs", "fail-closed engine bridge"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]", "[[docs-architecture|Four-Layer Architecture]]"]
related: []
tags: ["docs", "architecture", "engine"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.95
derived: false
proposed_by: "claude"
---

# Deterministic Engine

The Bun CLI (`src/cli/cli.ts`) that validates the vault and runs quality checks with zero LLM involvement — same input always produces the same result.

## Definition

The deterministic engine is the plugin's Layer 4 computation backbone. It is a Bun-based CLI that exposes a set of verbs for inspecting and modifying the vault without spawning an LLM. Every operation is a deterministic parse, check, or transformation: given the same vault state and the same arguments, the engine always produces the same output.

The engine requires Bun ≥ 1.2. Scripts that wrap it (`engine.sh`) apply the fail-closed posture: when Bun is absent, security-relevant calls exit non-zero (BLOCK) rather than silently degrading.

**Engine verbs:**
- **`verify`** — ERROR-tier integrity check; gates writes. Checks schema, required fields, provenance completeness.
- **`lint`** — WARN-tier advisory audit; never blocks. Checks quality and drift signals.
- **`backlog`** — enumerates unprocessed raw sources; the single source of truth for pending work.
- **`context`** — resolves ICM context layers (L0–L4) for a named skill; reports file lists and token estimates.
- **`okf export | import`** — OKF round-trip: export wiki as a portable bundle; import an external bundle into `raw/`.
- **`snapshot pre | post`** — git-checkpoints a write phase (pre = checkpoint, post = commit) so every vault mutation is revertible.
- **`heal`** — deterministic structural repair: fixes missing `parent:`, wrong `path:`, and plain-string hierarchy links mechanically.
- **`firewall`** — checks whether a given write path is within the active vault's allow-list; exits non-zero to block if not.
- **`route`** — returns the routing decision (Claude / approved local tier / BLOCKED) given offline policy, model approval, and reachability.
- **`migrate`** — upgrades schema version in place (v1→v2→v3), idempotent, git-checkpointed.
- **`search`** — deterministic keyword retrieval ranked by title, tag, and body hits; the backend for the query skill.
- **`propose`** — promote or reject a draft from `_proposed/` to `wiki/`, under a git checkpoint.
- **`config --json`** — reports the resolved configuration (merged project + user + defaults) as JSON.
- **`capabilities --json`** and **`ontology --json`** — machine-readable self-description for tooling.

## Key Principles

**No embeddings, no inference.** The engine performs only deterministic operations: file parsing, YAML frontmatter validation, regex and stemmed keyword matching, graph link-walking, and JSON reporting. LLM inference is the agent's job; the engine's job is to provide the facts the agent reasons from.

**Fail-closed on Bun absence.** The `engine.sh` wrapper distinguishes security-relevant calls from advisory calls. Verify, firewall, the lint gate, and any check whose verdict gates a write or asserts integrity exit non-zero when Bun is absent. Advisory calls (backlog summaries, self-descriptions) keep fail-open degradation. Bun is therefore a required dependency; `doctor` checks for it proactively.

**Self-describes via `capabilities --json` and `ontology --json`.** An agent that needs to know what the engine can do calls `engine capabilities --json` rather than hard-coding the verb list. This decouples agent logic from engine version.

**`backlog` is the single source of truth for pending sources.** The ingest agent always consults `engine backlog --target <vault> --json` rather than doing its own `find` on `raw/`. The engine's backlog verb enumerates `raw/` recursively (including nested wired-source snapshots), excludes `raw/assets/`, and dedupes against the log/manifest.

## Examples

After a user drops three PDFs into `raw/papers/`, running `engine backlog --target docs/vault --json` returns `{ "pendingRaw": ["raw/papers/paper1.pdf", "raw/papers/paper2.pdf", "raw/papers/paper3.pdf"] }`. The ingest agent reads this output and processes the three sources.

Running `engine verify --target docs/vault --json` with a page missing a `sources:` field returns `{ "errors": [{ "code": "missing-sources", "page": "wiki/docs/my-concept.md", "severity": "error" }] }` and exits 1, blocking the post-ingest gate.

## Related Concepts

The deterministic engine is the backbone of Layer 4. It is consumed by hooks, scripts, and agents throughout the plugin. The `verify` and `lint` verbs implement the error/warn severity split (ADR-0034). The `fail-closed engine bridge` governs its behavior when Bun is absent. The NO-RAG stance is enforced by the engine's keyword-only `search` command.
---
