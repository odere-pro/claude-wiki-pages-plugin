---
case: onboarding-known-good
class: known-good
workflow: claude-wiki-pages-onboarding-agent
---

## Planted defects

```tsv
id	node	signature	severity	must_catch	detail
```

## Edge contracts

```tsv
seam	signature	must_hold	detail
onboarding->ingest	handoff:ac-not-passed	yes	the remaining-step payload passes to the ingest delegation when needed
onboarding->ingest	handoff:finding-dropped	yes	ingest's heal result surfaces back into the onboarding report
```

## Intent acceptance criteria

```tsv
ac	expect_status	owner_node	detail
resume-not-clobber	blocked	onboarding	re-running does not overwrite existing wiki content
health-check-run	met	onboarding	doctor.sh runs before any work
raw-immutable	met	onboarding	no existing raw/ file is modified
first-answer-delivered	met	onboarding	a cited answer is produced from the ingested source
checkpointed-ingest	met	ingest	ingest's fixes ran under a git checkpoint
```
