---
schema_version: 3
---

# Tangled fixture vault

A deliberately entangled but spine-valid vault for the strict-tree machinery
(ADR-0036). Two topic islands (`alpha`, `beta`) with a clean `parent:` spine, but
cross-tree body links, an intra-tree sibling edge, a transitive-redundant edge,
and a cross-tree `related:` entry — the four shapes the strict-tree reducer
(`scripts/strict-tree-reduce.sh`) demotes to prose or to nested tags.
