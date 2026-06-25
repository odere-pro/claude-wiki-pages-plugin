---
title: "tests/gates/gate-11-firewall-parity.sh"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["tests", "gates"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

## Metadata

- File: `tests/gates/gate-11-firewall-parity.sh`
- Role: CI engine gate — firewall verdict golden-snapshot (post-twin-retirement)

## Summary

After the firewall bash twin was retired, this gate flipped from bash==engine to engine==golden-verdict-table. Runs the engine `firewall` command against each fixture path in a matrix (baseline, cross-vault, symlink-escape scenarios) and compares each verdict to a hardcoded expected string. Any change to engine decision logic that moves a verdict turns the gate red.

## Key Claims

Covers: Write-Path Firewall, Golden-Snapshot Testing, CI Gates
- Twin-retirement pattern: when only one implementation exists, compare against a pinned golden table rather than a second implementation.
- The golden table was proven equivalent to the retired bash twin in the firewall-twin-retire dual-run.
- Mode suffix `(mode=…)` is stripped before comparison to keep the golden strings stable across mode changes.
