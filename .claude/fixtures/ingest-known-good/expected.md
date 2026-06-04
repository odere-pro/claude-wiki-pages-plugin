---
case: ingest-known-good
class: known-good
workflow: claude-wiki-pages-ingest-agent
---

## Planted defects

```tsv
id	node	signature	severity	must_catch	detail
```

## Edge contracts

```tsv
seam	signature	must_hold	detail
ingest->curator	handoff:finding-dropped	yes	structural defects surface to the curator auto-heal when present
ingest->curator	handoff:ac-not-passed	yes	the fix-the-structure instruction passes to the curator sub-agent when needed
```

## Intent acceptance criteria

```tsv
ac	expect_status	owner_node	detail
provenance-traced	met	ingest	the one created page has sources: tracing to raw/source-clean.md
raw-immutable	met	ingest	no file under raw/ is modified
schema-respected	met	ingest	frontmatter matches vault/CLAUDE.md
plan-gate-honored	met	ingest	topic-tree plan written and approval gate honored
self-healed	met	curator	no structural errors on clean input (trivially met)
```
