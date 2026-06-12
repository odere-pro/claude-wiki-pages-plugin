---
title: "ADR-0015 Engine Self-Description"
type: concept
aliases: ["ADR-0015 Engine Self-Description", "ADR-0015", "engine self-description ADR", "capabilities json ADR"]
parent: "[[ADRs]]"
path: "adrs"
sources: ["[[ADR-0015-engine-self-description-surfaces]]"]
related: ["[[ADR-0004 Ontology Profile v1]]", "[[Canonical Terms]]"]
tags: [adr, engine, api, capabilities]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# ADR-0015: Engine Self-Description Surfaces

**Status:** Accepted | **Date:** 2026-06-05

## Problem

Agents calling the engine needed to discover which verbs are safe to invoke (`capabilities --json`) and what the vault's ontology contains (`ontology --json`) without parsing prose or guessing. The drift hazard: the verb surface was triple-stated by hand in `src/cli/cli.ts` — the `IMPLEMENTED` Set, the `PLANNED` array, `ALL`, and a `usage()` literal. A `capabilities` verb reading only the Set would leave the `usage()` literal as a fourth copy that silently drifts.

## Decision

**Collapse the four copies to one** in `src/cli/cli.ts`. The `IMPLEMENTED` Set becomes the single source; `capabilities --json` reads from it. The `usage()` literal is rewritten to derive its "Implemented:" text from `IMPLEMENTED`, closing the four-to-one collapse.

**`capabilities --json`** — returns the list of implemented verbs, required args/flags per verb, and whether each verb is read-only or has side effects. Reads from `IMPLEMENTED` only. Same structured envelope as other engine commands.

**`ontology --json`** — projects the `ontology-profile-v1` tables (ADR-0004) as machine-readable JSON — the predicate domain→range table and the enum list. Does not duplicate or restate the tables; it reads from the profile the schema already contains and re-emits them in a parsed, structured form.

**The prohibition** (veto V1): the engine must not infer or generate any content. `ontology --json` is a **projection**, not a generation. It reports what the profile states; it does not synthesize new ontology content.

## Key Principle

Both surfaces read from their single existing source (the `IMPLEMENTED` Set and the `ontology-profile-v1` tables) and never maintain a parallel copy. One mechanism per job.
