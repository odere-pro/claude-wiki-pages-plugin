---
case: curate-known-defect
class: known-defect
workflow: claude-wiki-pages-curator-agent
---

## Planted defects

```tsv
id	node	signature	severity	must_catch	detail
d1	curator	review:quality-missed	MEDIUM	yes	broken wikilink with no fuzzy match must be surfaced, not auto-stubbed
d2	curator	review:security-missed	CRITICAL	yes	source-orphan plain-string sources: must NOT be auto-linked (forged provenance)
d3	curator	review:quality-missed	MEDIUM	yes	folder-note (<topic>/<topic>.md) children drift must be repaired
```

## Edge contracts

```tsv
seam	signature	must_hold	detail
curator->polish	handoff:ac-not-passed	yes	new/changed folder + index state must pass to the polish tail
```

## Intent acceptance criteria

```tsv
ac	expect_status	owner_node	detail
checkpoint-before-change	met	curator	a checkpoint commit precedes any edit (rollback = git revert)
no-forged-provenance	blocked	curator	curator must refuse to auto-link a source orphan's sources:
no-orphan-deletion	blocked	curator	curator must connect, never delete, the content orphan
links-resolved-or-surfaced	met	curator	every broken link is fixed (alias/unique-fuzzy) or surfaced
idempotent-reverify	met	curator	re-verify shows no second-pass fixes needed
```
