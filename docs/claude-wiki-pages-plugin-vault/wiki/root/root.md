---
title: "Root"
type: index
aliases: ["root", "Root", "repository root", "project root"]
parent: "[[index|Wiki Index]]"
path: "root"
children:
  - "[[plugin-overview|Plugin Overview]]"
  - "[[npm-package|NPM Package]]"
  - "[[security-model|Security Model]]"
  - "[[dev-tooling|Dev Tooling]]"
  - "[[contributing-governance|Contributing and Governance]]"
  - "[[release-history|Release History]]"
child_indexes: []
tags: ["root", "overview"]
created: 2026-06-25
updated: 2026-06-25
---

# Root

Repository root files: README, CLAUDE.md, package.json, SECURITY.md, CONTRIBUTING.md, CHANGELOG.md, SOFTWARE-3-0.md, and tooling configuration for the claude-wiki-pages plugin.

## Pages

### Entities

- [[npm-package|NPM Package]] — `@odere-pro/claude-wiki-pages`; Bun/TypeScript ESM CLI; ships `dist/`, `schemas/`, `templates/`, agent definitions; runtime dep is yaml@2.6.1

### Concepts

- [[plugin-overview|Plugin Overview]] — what the plugin is, the four-layer dispatch flow, dev-time vs. runtime separation, and the one-verb entry point
- [[security-model|Security Model]] — structural threat model covering prompt injection, provenance tracking, and vault poisoning; disclosure policy and Tier 4 adversarial CI
- [[dev-tooling|Dev Tooling]] — Bun runtime + test runner, TypeScript strict config, ESLint 9 flat config, Knip dead-code detection, and the full pre-commit chain
- [[contributing-governance|Contributing and Governance]] — contribution ground rules, PR process, support posture, code of conduct, and things that won't merge
- [[release-history|Release History]] — Keep a Changelog format; SemVer; key Unreleased features: strict-tree topology, schema v3, snapshot verb, universal graph machinery

## Subtopics

