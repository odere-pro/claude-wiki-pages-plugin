---
title: "project intake"
type: concept
aliases: []
parent: "[[vault-management-terms|Vault management terms]]"
path: "glossary/vault-management-terms"
sources: ["[[docs-glossary|Canonical Glossary]]"]
related: []
tags: ["glossary", "vault-management-terms", "terminology"]
created: 2026-06-26
updated: 2026-06-26
update_count: 1
status: active
confidence: 0.9
---

# project intake

## Definition

The "set up the wiki for this whole repository" flow (ADR-0024): wire the host project as a docs-only wired source, then ingest its snapshots into wiki pages. Offered as a first-run choice by the onboarding/init path, and reachable on an existing vault via an explicit orchestrator intent (`wire_project`). Because snapshots land **nested** at `raw/wired/<name>/`, every source-enumeration path is recursive (single source of truth: `engine.sh backlog`).

## Key Principles

- The "set up the wiki for this whole repository" flow (ADR-0024): wire the host project as a docs-only wired source, then ingest its snapshots into wiki pages.
- Canonical term in the claude-wiki-pages **Vault management terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `wire_project`
- `raw/wired/<name>/`
- `engine.sh backlog`

## Related Concepts

Part of the **Vault management terms** group: active vault, vault registry, vault lifecycle, vault merge, per-vault write confinement, registered vault roots, cross-vault, wired source.
