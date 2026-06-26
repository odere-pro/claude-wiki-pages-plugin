---
title: "ADR-0005: Git Required Per Vault Init"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-05-10
date_ingested: 2026-06-25
tags: ["docs", "adrs", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0005: Git Required Per Vault Init

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-05-10
- **URL:** —

## Summary

ADR-0005 mandates that every vault must be initialized as its own git repository. The `init` skill git-inits the vault directory; structural writes produce commits. Git is the foundation for reversible self-heal, checkpoints, durable-memory write-backs, and the snapshot mechanism.

## Key Claims

Status: Accepted. Git is a non-negotiable vault requirement: `verify` checks for a `.git` directory and fails the health check if absent. The snapshot.sh script (pre/post) uses git commits as revertible checkpoints. The self-heal curator runs under a checkpoint so every fix can be undone with `git revert`. Without git, the autonomous maintenance loop cannot guarantee reversibility.

Covers: Git Requirement, Vault Init, Snapshot Mechanism, Reversible Self-Heal
