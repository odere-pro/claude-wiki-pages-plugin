---
title: "ADR-0005: Git Required Per Vault Init"
type: entity
entity_type: standard
aliases: ["ADR-0005", "adr-0005", "git required ADR"]
parent: "[[decisions|Decisions]]"
path: "decisions"
sources: ["[[docs-adr-0005|ADR-0005: Git Required Per Vault Init]]"]
related: []
tags: ["docs", "adrs", "architecture", "git"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0005: Git Required Per Vault Init

Mandates that every vault must be its own git repository; `init` git-inits the vault, and structural writes produce commits that enable reversible self-heal.

## Overview

ADR-0005 establishes git as a non-negotiable vault dependency. Without git, the snapshot mechanism, the reversible curator heal, and the durable-memory write-back cannot operate safely. The `verify-ingest.sh` health check fails if `.git` is absent.

## Key Facts

**Status:** Accepted

**Drivers:**
- Reversible self-heal requires a rollback path: `git revert <snapshot-commit>`.
- The snapshot.sh pre/post pattern depends on git commits as checkpoints.
- Durable memory write-backs (ADR-0010 agent-session carve-out) need an immutable history to distinguish new vs replayed sessions.

**Decision:** Every vault is its own git repository. The `init` skill git-inits the vault directory. Structural writes (ingest, heal, optimize, synthesize) produce one commit per operation.

**Consequences:**
- `verify-ingest.sh` performs a `.git` existence check and fails the health check if absent.
- `snapshot.sh pre` and `snapshot.sh post` use `git commit` to create revertible checkpoints.
- The curator's heal pass runs under a checkpoint; any bad fix is `git revert`-able.
- The vault is a first-class git repository — branching, diffing, and history work normally.

## Related

The snapshot mechanism is documented in `docs/operations.md`. The durable memory carve-out (ADR-0010) relies on this foundation for idempotent session replay detection.
