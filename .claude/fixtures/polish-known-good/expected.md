---
case: polish-known-good
class: known-good
workflow: claude-wiki-pages-polish-agent
---

## Planted defects

```tsv
id	node	signature	severity	must_catch	detail
```

## Edge contracts

```tsv
seam	signature	must_hold	detail
orchestrator->polish	handoff:ac-not-passed	yes	vault_path is passed; polish does not re-probe the vault
```

## Intent acceptance criteria

```tsv
ac	expect_status	owner_node	detail
append-only	blocked	polish	polish never deletes a page, link, or children: entry
preserve-user-prose	met	polish	user-authored prose in index.md is kept verbatim
counts-accurate	met	polish	page counts already match the filesystem
idempotent-rerun	met	polish	an already-polished vault produces zero diff
```
