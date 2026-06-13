---
title: "Architecture Decision Record"
type: concept
aliases: ["Architecture Decision Record", "ADR", "ADRs", "architecture decision record"]
parent: "[[Decisions]]"
path: "decisions"
sources: ["[[ADR Index]]"]
related: ["[[ADR Convention]]", "[[Design-Drift Gate]]"]
tags: ["concept", "adr", "governance"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Architecture Decision Record

## Definition

An Architecture Decision Record (ADR) is a document that captures the rationale behind a system-design decision: what was decided, the alternatives that were weighed, and the conditions under which the decision should be revisited. ADRs explain *why* a path was taken; the contracts themselves live in `architecture.md` and `vault/CLAUDE.md`.

## Key Principles

- **Format:** Status → Date → Context → Decision → Alternatives considered → Consequences → Revisit when.
- **Status values:** Proposed (implementing), Accepted (merged), Superseded by ADR-MMMM (replaced), Deprecated.
- **Immutability:** ADRs are immutable history once accepted, except for trivial typo fixes. A change to an accepted decision arrives as a new ADR that supersedes the prior one.
- **Self-contained:** each ADR states the design choice and reasoning directly, without depending on transient planning artifacts.
- **One file per decision:** named `ADR-NNNN-<kebab-slug>.md` with four-digit zero-padded ID.

## Examples

All 23 ADRs are in `docs/adr/`. The index is at `raw/docs/adr/README.md`.

## Related Concepts

- [[ADR Convention]] — the format and governance rules
- [[Design-Drift Gate]] — CI gate that checks design docs against reality
