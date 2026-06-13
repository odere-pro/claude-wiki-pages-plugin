---
title: "Reference"
type: index
aliases: ["Reference", "reference", "reference docs"]
parent: "[[Wiki Index]]"
path: "reference"
children:
  - "[[Approved Local Model]]"
  - "[[Backlog]]"
  - "[[Banned Strings]]"
  - "[[Capability Tier]]"
  - "[[Doctor Command]]"
  - "[[Frontmatter Validation]]"
  - "[[Glossary Terms]]"
  - "[[Heartbeat]]"
  - "[[Installation]]"
  - "[[Maintenance Loop]]"
  - "[[Multi-Vault Registry]]"
  - "[[Offline Policy]]"
  - "[[Required Fields]]"
  - "[[Schema Authority]]"
child_indexes: []
tags: ["reference"]
created: 2026-06-13
updated: 2026-06-13
---

# Reference

Map of Content for reference documentation: schema, terminology, operations, local models, and automation.

## Schema and Terminology

- [[Schema Authority]] — `vault/CLAUDE.md` as the single source of truth
- [[Glossary Terms]] — canonical terminology, banned strings, two registers
- [[Ontology Profile v1]] — predicate domain→range table + enum list
- [[Required Fields]] — per-type frontmatter requirements

## Operations

- [[Vault Resolution]] — 4-tier resolver for the active vault
- [[Multi-Vault Registry]] — settings.json, lifecycle commands
- [[Hook System]] — event → script mapping, blocking hooks

## Local Models

- [[Approved Local Model]] — `qwen3-coder:30b`, quality gate governance
- [[Capability Tier]] — ingest-extract, query, draft tiers
- [[Offline Policy]] — off / strict / prefer-local

## Automation

- [[Backlog]] — unprocessed sources + overdue lint
- [[Heartbeat]] — SessionStart recommendation when backlog exists; never mutates
- [[Maintenance Loop]] — autonomous catch-up via maintenance agent

## Operational Tools

- [[Doctor Command]] — `/claude-wiki-pages:doctor` health check after install

## Schema and Terminology

- [[Required Fields]] — per-type frontmatter requirements; machine-readable table in CLAUDE.md
- [[Frontmatter Validation]] — `validate-frontmatter.sh`; reads required-fields table from CLAUDE.md
- [[Banned Strings]] — retired terms; enforced by validate-docs.sh Check 1

## Installation

- [[Installation]] — marketplace, local, update/reinstall paths
