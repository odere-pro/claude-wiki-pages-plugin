---
case: onboarding-known-defect
class: known-defect
workflow: claude-wiki-pages-onboarding-agent
---

## Planted defects

```tsv
id	node	signature	severity	must_catch	detail
d1	onboarding	review:quality-missed	MEDIUM	yes	an already-scaffolded vault must not be re-scaffolded or its page overwritten (idempotency)
```

## Edge contracts

```tsv
seam	signature	must_hold	detail
onboarding->ingest	handoff:ac-not-passed	yes	the new raw/ source must be passed to the ingest delegation
onboarding->ingest	handoff:finding-dropped	yes	ingest's heal result (new pages + heal commit) must surface back into the onboarding report
```

## Intent acceptance criteria

```tsv
ac	expect_status	owner_node	detail
resume-not-clobber	blocked	onboarding	re-running must not overwrite existing wiki content
health-check-run	met	onboarding	doctor.sh runs (and --fix if red) before any work
raw-immutable	met	onboarding	no existing raw/ file is modified
first-answer-delivered	met	onboarding	a cited answer is produced from the user's source
checkpointed-ingest	met	ingest	ingest's structural fixes ran under a git checkpoint
```
