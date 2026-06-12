---
case: polish-known-defect
class: known-defect
workflow: claude-wiki-pages-polish-agent
---

## Planted defects

```tsv
id	node	signature	severity	must_catch	detail
d1	polish	review:quality-missed	MEDIUM	yes	a new top-level folder with no graph color group must get one appended
d2	polish	review:quality-missed	MEDIUM	yes	a folder note (<topic>/<topic>.md) children: missing an on-disk sibling must have it appended
d3	polish	review:quality-missed	MEDIUM	yes	a stale page-count line in wiki/index.md must be regenerated
```

## Edge contracts

```tsv
seam	signature	must_hold	detail
orchestrator->polish	handoff:ac-not-passed	yes	vault_path must be passed; polish must not re-probe the vault
```

## Intent acceptance criteria

```tsv
ac	expect_status	owner_node	detail
append-only	blocked	polish	polish must never delete a page, link, or children: entry
preserve-user-prose	met	polish	user-authored prose in index.md is kept verbatim
counts-accurate	met	polish	regenerated page counts match the filesystem
idempotent-rerun	met	polish	a second consecutive run produces zero diff
```
