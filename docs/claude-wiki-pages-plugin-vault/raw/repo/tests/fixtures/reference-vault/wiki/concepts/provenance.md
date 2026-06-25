---
title: "Provenance"
type: concept
aliases: ["Provenance", "provenance"]
parent: "[[Concepts — Index]]"
path: "concepts"
sources: ["[[Provenance Primer]]"]
related: ["[[Sample Tool]]"]
contradicts: []
supersedes: []
depends_on: []
tags: []
created: 2026-04-18
updated: 2026-04-18
update_count: 1
status: active
confidence: 0.9
---

# Provenance

## Definition

Provenance is the record of where a piece of information came from. In a wiki built
from source documents, it is the traceable chain that links every claim on a page
back to a specific source under `raw/`.

## Key Principles

- Every claim has an origin: no assertion exists without a traceable source.
- The chain is followable: claim to page to source summary to raw file.
- Provenance enables revision: when a newer source contradicts an older one, the
  affected pages can be found and corrected.

## Examples

The [[Sample Tool]] entity records its provenance by citing [[Provenance Primer]],
which in turn cites `raw/sample-source.md`. Following those links from the tool to
the source to the raw file is provenance in action.

## Related Concepts

See [[Sample Tool]] for a fixture entity that applies these principles.
