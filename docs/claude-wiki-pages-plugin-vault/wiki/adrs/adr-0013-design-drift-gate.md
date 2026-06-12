---
title: "ADR-0013 Design Drift Gate"
type: concept
aliases: ["ADR-0013 Design Drift Gate", "ADR-0013", "design-drift gate ADR", "validate-docs Check 5"]
parent: "[[ADRs]]"
path: "adrs"
sources: ["[[ADR-0013-design-drift-gate]]"]
related: ["[[Canonical Terms]]", "[[Feature Relations]]"]
tags: [adr, validation, ci, design-drift]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# ADR-0013: Design-Drift Gate

**Status:** Accepted | **Date:** 2026-06-05

## Problem

The Software-3.0 work introduced `docs/design/` mermaid diagrams and a root dual-entry router (`SOFTWARE-3-0.md`). "Equally usable by humans and agents" is only real if **enforced**: a gate must fail the build when a diagram names a path that no longer exists, a link dies, a depicted hook chain drifts from `hooks/hooks.json`, a stated count drifts from reality, or a router row offers only one on-ramp.

The team rejected shipping up to six separate doc/diagram checks plus a standalone router-parity gate. **D10** consolidates them into **one new `validate-docs.sh` Check 5**.

## Decision

One new Check 5 in `scripts/validate-docs.sh` with five sub-checks:

1. **(5a) Mermaid node grounding** — every path-shaped token inside a mermaid fence resolves to a real repo path or is covered by a `[speculative]` marker. Prose labels with no path-shaped token contribute nothing to grounding.
2. **(5b) Dead relative links** — relative links in `docs/design/*.md` and `SOFTWARE-3-0.md` resolve to real files.
3. **(5c) Hook/script name grounding** — hook and script names named in design docs match entries in `hooks/hooks.json`.
4. **(5d) Count assertions** — count assertions in `06-feature-relations.md` match reality.
5. **(5e) Parity gate** — every row of `SOFTWARE-3-0.md` must have a non-empty human cell and a non-empty agent cell, each with a resolving link. A single-ramped row fails the build.

**Strict toolchain constraint:** Tier-0 — **grep/awk/bash only**. No Bun, no mermaid parser, no new runtime dependency.

**`[speculative]` marker** — exempts an unresolved mermaid node, fence, or diagram from the node-grounding check. Used when a diagram depicts a planned-but-not-yet-built path. A `[speculative]` node always passes the gate even if its path token does not resolve.
