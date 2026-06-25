---
title: "Confidence and Staleness"
type: concept
aliases: ["confidence", "confidence decay", "staleness signal", "confidence field", "stale page"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]"]
related: []
tags: ["docs", "schema", "lint"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.9
derived: false
proposed_by: "claude"
---

# Confidence and Staleness

The `confidence` float field (0.0–1.0) that records how well a page's claims are supported by its sources, and the decay and staleness mechanisms that flag pages whose evidence may have aged.

## Definition

`confidence` is a required frontmatter field on every typed wiki page (except `index`, `manifest`, and `log`). It is a float between 0.0 and 1.0 representing how directly and completely the page's claims are supported by its cited sources. The field is maintained by the ingest agent (set on creation, updated on each ingest that touches the page) and monitored by the lint process (low confidence triggers a WARN).

**Calibration guidance:**
- **1.0** — direct quote or settled fact from a single authoritative source.
- **0.8** — at least two independent sources corroborate the claim.
- **0.6** — single-source internal-policy claim.
- Below **0.5** — inference not supported by explicit source text; flagged for review or removal by lint.
- **`derived: true` pages** should keep `confidence` below 0.8 unless multi-source corroboration is present.

**Confidence decay** is the gradual decrease in a page's `confidence` score as time passes without a source refresh. The curator agent drives staleness detection: it compares a page's `updated` date to the dates of newer related sources and flags the page as `stale` if the gap exceeds 30 days and newer sources exist that could update the page.

A **staleness signal** is any indicator — elapsed time, missing sources, or low `confidence` — that a page may no longer reflect its raw sources. Lint reports stale pages as WARN findings; the curator's staleness check surfaces them for editorial attention.

## Key Principles

**Never default to 1.0.** The ingest agent and any human editor must set `confidence` honestly based on the evidence at hand. A concept derived by synthesis across two sources that do not state it explicitly should not carry `confidence: 1.0`. The calibration guide above provides the thresholds.

**`update_count` tracks evidence depth.** Each ingest run that touches a page increments `update_count`. A high `update_count` indicates the page has been confirmed or enriched by multiple sources — a signal of well-evidenced content. A low `update_count` (1 or 2) combined with low `confidence` is a candidate for review.

**Contradictions weaken confidence.** When a newer source contradicts a claim on an existing page, the ingest agent should lower `confidence` on the contradicted claim and note the contradiction in the page body or via the `contradicts:` predicate field. A `contradicts:` link from a newer concept page to the older one is the structured way to record the disagreement.

**`derived: true` makes inference explicit.** When the page (or a claim on it) is LLM synthesis across sources rather than stated in any single source, `derived: true` makes this explicit. A reviewer knows that a `derived: true` page carries less direct evidentiary weight than a `derived: false` page at the same `confidence` level.

**`status: stale` is set by lint.** When the lint process determines a page has not been updated in 30+ days despite newer related sources existing, it sets `status: stale`. `status: superseded` is set manually (or by the ingest agent) when a page is explicitly replaced by a newer one.

## Examples

A concept page freshly created from a single source carries `confidence: 0.8` (single source, claim is stated explicitly). After a second independent source confirms the same claim, the ingest agent raises it to `confidence: 0.9`. After a third source provides a minor contradicting data point, the agent lowers it to `confidence: 0.7` and adds the contradiction to the body.

A page created 90 days ago from a source that has since been superseded carries `status: stale` and `confidence: 0.5` after the lint process flags it. The curator surfaces it in the final report: "3 stale pages with confidence < 0.6 — recommend re-ingest or removal."

## Related Concepts

Confidence relates to the `derived` field (LLM inference marker), `update_count` (evidence depth), the `status` field (`active`, `stale`, `superseded`, `draft`), and the lint process (WARN on low confidence, stale pages). The `source_quotes` field provides claim-level evidence that can anchor a specific claim's confidence independently of the page-level score.
---
