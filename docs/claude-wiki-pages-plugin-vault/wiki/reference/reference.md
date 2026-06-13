---
title: "Reference"
type: index
aliases: ["Reference", "reference", "reference docs"]
parent: "[[Wiki Index]]"
path: "reference"
children:
  - "[[Glossary Terms]]"
  - "[[Ontology Profile v1]]"
  - "[[Schema Authority]]"
  - "[[Vault Resolution]]"
  - "[[Multi-Vault Registry]]"
  - "[[Offline Policy]]"
  - "[[Approved Local Model]]"
  - "[[Backlog]]"
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
- [[Heartbeat]] — SessionStart recommendation when backlog exists
- [[Maintenance Loop]] — autonomous catch-up via maintenance agent

## Installation

- [[Installation]] — marketplace, local, update/reinstall paths
