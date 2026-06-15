---
title: "Architecture Decision Record"
type: concept
aliases: ["Architecture Decision Record", "ADR", "ADRs", "architecture decision record"]
parent: "[[How It Works]]"
path: "how-it-works"
sources: ["[[ADR Index]]", "[[Architecture Documentation]]"]
related: ["[[Design-Drift Gate]]", "[[Four-Layer Stack]]", "[[Deterministic Engine]]", "[[Schema Authority]]", "[[Lint Rules]]"]
tags: ["concept", "adr", "governance"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Architecture Decision Record

> [!summary]
> An Architecture Decision Record (ADR) is a document that captures the rationale behind a system-design decision: what was decided, the alternatives that were weighed, and the conditions under which the decision should be revisited. ADRs explain _why_ a path was taken; the contracts themselves live in `docs/architecture.md` and `vault/CLAUDE.md`. The project has 23 ADRs (ADR-0001 through ADR-0023, excluding ADR-0021 which was skipped).

## Key Principles

- ADRs record settled decisions, not proposals. A document in `Proposed` status becomes immutable when accepted; further changes arrive as a new superseding ADR.
- Each ADR is self-contained: it states the design choice and reasoning without depending on transient planning artifacts.
- Supersession preserves history: when a decision changes, the old ADR's status becomes `Superseded by ADR-MMMM` — it is never modified to reflect the new choice.
- ADRs explain _why_, not _what_: the contracts themselves live in `docs/architecture.md` and `vault/CLAUDE.md`.
- The ADR index in `wiki/_sources/adr-readme.md` is the canonical list; individual ADR files are in `docs/adr/`.

## Examples

Anatomy of ADR-0001 (Four-Layer Orchestrator) — the pattern file:

- **Context:** flat skill namespace required users to chain `ingest → lint → fix → status` manually.
- **Decision:** adopt a single top-level orchestrator (`/claude-wiki-pages:wiki`) that probes vault state and dispatches automatically.
- **Alternatives rejected:** keep flat namespace (documentation doesn't substitute for right defaults); replace with one omnibus agent (kills testability and composability).
- **Consequence:** user's mental model collapses to one verb.

Status lifecycle:

```
Proposed → Accepted → Superseded by ADR-0MMMM
                   ↓
             Deprecated
```

## Definition

An ADR records a _settled_ decision. It is self-contained: it states the design choice and its reasoning directly, without depending on transient planning artifacts. When a decision changes, a new ADR supersedes the old one — the old ADR stays immutable as history.

ADRs explain _why_ a particular path was taken; they are not the spec. The contracts themselves live in the documents that own them: `docs/architecture.md` (the four-layer model and command/agent contracts) and `vault/CLAUDE.md` (the schema).

## Format

Every ADR follows the same structure:

- **Status:** `Proposed` (implementing) → `Accepted` (merged) → `Superseded by ADR-MMMM` (replaced) → `Deprecated`
- **Date:** date the decision was recorded
- **Context:** what problem or tension is being resolved
- **Decision:** what was decided and how
- **Alternatives considered:** other options that were seriously weighed and why they were rejected
- **Consequences:** positive and negative outcomes of the decision
- **Revisit when:** conditions under which the decision should be reconsidered

## Conventions

- **One file per decision**, named `ADR-NNNN-<kebab-slug>.md` with a four-digit zero-padded ID.
- **Immutability:** ADRs are immutable history once accepted, except for trivial typo fixes. A change to an accepted decision arrives as a **new** ADR that supersedes the prior one — the old ADR's status becomes `Superseded by ADR-MMMM`.
- **Self-contained:** each ADR states the design choice and reasoning directly, without depending on transient planning artifacts.

## Example: ADR-0001 (Four-Layer Orchestrator)

ADR-0001 shows the pattern well. The context was that the flat namespace of skills required users to remember and chain multiple commands (`ingest` → `lint` → `fix` → `status`). The decision adopted a single top-level orchestrator (`/claude-wiki-pages:wiki`) that probes vault state and dispatches to the right specialist automatically. The key alternatives rejected were: keeping the flat namespace (documentation doesn't substitute for the right default), and replacing skills with one omnibus agent (kills testability and composability). The consequence is that the user's mental model collapses to one verb.

## All 23 ADRs

All ADRs are in `docs/adr/`. The index is at `wiki/_sources/adr-readme.md`.

| ADR  | Summary                                                                           |
| ---- | --------------------------------------------------------------------------------- |
| 0001 | Single top-level command (`/wiki`), state-probing orchestrator dispatch           |
| 0002 | Agent naming convention: `{plugin-name}-{role}-agent`                             |
| 0003 | Polish agent owns tail-of-write (graph colors, MOC refresh)                       |
| 0004 | `ontology-profile-v1` block in `vault/CLAUDE.md` as single ontology source        |
| 0005 | Git required per vault; nesting guard; bun-absent availability shim               |
| 0006 | One search score object with `matched[]` breakdown                                |
| 0007 | Wiki-native recall: NO-RAG, synonym lexicon, Porter stemming                      |
| 0008 | One graph-traversal primitive (`walk()` BFS, N≤2 hop-decayed)                     |
| 0009 | Multi-vault registry, fail-closed write confinement, `merge` deferred             |
| 0010 | Durable-memory carve-out: `raw/agent-sessions/`, `_proposed/` gate                |
| 0011 | Local-model quality gate: golden-set eval, zero-fabrication floor                 |
| 0012 | Vault merge: design-accepted, implementation deferred                             |
| 0013 | Design-drift gate (`validate-docs.sh` Check 5)                                    |
| 0014 | Single-source required-fields table in CLAUDE.md; machine-readable                |
| 0015 | Engine self-description: `capabilities --json`, `ontology --json`                 |
| 0016 | Simultaneous multi-vault management: fail-closed registry, audit roll-up          |
| 0017 | Fabrication floor: verbatim partition, over-citation vs fabrication               |
| 0018 | Offline policy and degraded-mode routing (`engine route`)                         |
| 0019 | Query tier and runtime answer verification                                        |
| 0020 | Scaffolding ablation: plugin arm vs baseline arm, measured                        |
| 0022 | Folder notes and graph quality (schema v3)                                        |
| 0023 | Wiki-only graph: exclude `raw/`/`_templates/`/`_proposed/`; graph config as cache |

## Related Concepts

- [[Design-Drift Gate]] — `validate-docs.sh` that checks design docs against reality (ADR-0013)
- [[Four-Layer Stack]] — the architecture that ADR-0001 formalized
- [[Deterministic Engine]] — the engine whose self-description surfaces ADR-0015 added
