---
case: curate-known-good
class: known-good
workflow: claude-wiki-pages-curator-agent
---

## Planted defects

```tsv
id	node	signature	severity	must_catch	detail
```

## Edge contracts

```tsv
seam	signature	must_hold	detail
curator->polish	handoff:ac-not-passed	yes	folder + index state passes to the polish tail
```

## Intent acceptance criteria

```tsv
ac	expect_status	owner_node	detail
checkpoint-before-change	met	curator	checkpoint commit precedes any edit
no-forged-provenance	blocked	curator	no source orphan to auto-link; provenance never forged
no-orphan-deletion	blocked	curator	no content orphan; nothing deleted
links-resolved-or-surfaced	met	curator	all links already resolve
idempotent-reverify	met	curator	clean vault yields zero fixes; re-verify clean
```
