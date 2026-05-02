# 4. Review, validate, fix

> Reference. For the day-1 path, see [index.md](./index.md).

Three levels of validation: the one-command health check, the read-only lint skill, and the repair agent. Use them in that order. Most of the time the pipeline already ran lint-fix for you; you reach for this guide when you want to audit explicitly or when something drifted outside a pipeline run.

## Level 1 — status (one-command smoke test)

```
/llm-wiki-stack:llm-wiki-status
```

Exercises every hook path and reports green/red per path:

- `PreToolUse` frontmatter block — tries a known-bad write and confirms it is blocked.
- `PreToolUse` wikilink check — same, for markdown-link cross-references.
- `protect-raw.sh` block — tries a write under `vault/raw/` and confirms it is rejected.
- `validate-attachments.sh` — confirms source writes with missing attachments are rejected.
- `verify-ingest.sh` — runs against the current vault state.

The underlying `verify-ingest.sh` checks:

- Duplicate entries in `wiki/index.md`.
- `sources:` fields using plain strings instead of `[[wikilinks]]`.
- MOC `children:` / `child_indexes:` drift against the filesystem.
- Source summaries that no wiki page cites (orphan sources).
- Topic folders missing a per-folder MOC (`_index.md`).

Green across the board means clean. Red means the status report points at the script that flagged the issue — fix the trivial cases by hand and hand the rest to Level 2.

## Level 2 — `/llm-wiki-stack:llm-wiki-lint` (read-only audit)

```
/llm-wiki-stack:llm-wiki-lint
```

Beyond the Level 1 checks, lint scans for:

- Broken `[[wikilinks]]` — targets that match no title or alias. **Error**.
- Orphan pages — zero inbound wikilinks. **Warning**.
- Stale pages — no update despite newer sources. **Info**.
- Missing frontmatter fields per `type`. **Error**.
- Ghost nodes caused by a `title` missing from `aliases`. **Error**.
- Excessive folder nesting (>4 levels) and flat folder sprawl. **Warning**.
- Near-duplicate page bodies. **Warning**.
- Pages with `confidence ≥ 0.8` AND a single source (suspiciously confident). **Warning**.
- Plain-string `sources:` entries. **Error**.
- Banned frontmatter values. **Error**.

Lint only **reports**. It does not modify the wiki. Review the report; what you do next depends on whether each item is real.

## Level 3 — `/llm-wiki-stack:llm-wiki-stack-curator-agent` (auto-repair)

For structural issues, run the repair agent:

```
/llm-wiki-stack:llm-wiki-stack-curator-agent
```

Or, if you want to skip directly to auto-fix without the agent's analysis phase:

```
/llm-wiki-stack:llm-wiki-fix
```

The agent collects every issue first, then applies fixes in phases (sources → vault MOC → per-folder MOCs → parent/path → broken links → orphans → aliases → graph colors → flat-folder splits → body densification), then re-runs lint and compares before/after counts.

What the agent will NOT do on its own:

- Delete content. It never removes page bodies.
- Merge near-duplicate pages. It flags them; you decide.
- Create wikilinks to pages that do not exist. Unresolvable links are left alone and reported.
- Lower a `confidence` value. It flags the discrepancy; you update the number.

When the agent finishes, the `subagent-lint-gate.sh` hook inspects its output and aborts the completion if unresolved errors remain.

## Level 4 — manual review (what the agent punts)

| Issue                                 | How to resolve                                                                                                                                                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Near-duplicate bodies                 | Pick the more specific page as canonical. Merge facts into it; convert the other to a wikilink-only pointer, or delete if fully redundant.                                                                 |
| Single-source high confidence         | Either add a corroborating source or drop `confidence` to ≤ 0.6.                                                                                                                                           |
| Repeated content blocks               | Add a block ID (`^block-id`) to the canonical page and replace duplicates with `![[Canonical Page#^block-id]]` transclusions. For example, share a spec table between `[[LLM Wiki Pattern]]` and a synthesis note. |
| Orphan source (no wiki page cites it) | Find the most relevant entity/concept page and add the source to its `sources:` array. If nothing fits, the source probably does not belong in this vault.                                                 |
| Contradictions between pages          | Note both claims in the less-certain page's body, cite both sources, drop `confidence` accordingly, add `contradicts: ["[[Other Page]]"]` to frontmatter.                                                  |

## Cadence

- After every batch ingest → status check is already part of the pipeline. Read the report.
- Every 10 ingests → run `/llm-wiki-stack:llm-wiki-lint`, then `/llm-wiki-stack:llm-wiki-stack-curator-agent` if there are warnings.
- Before exporting a deliverable → run status + lint.

## Next step

- Produce something from the wiki → [guide 5](./05-export-outputs.md).
- Need a live dashboard of health → [guide 6](./06-check-the-dashboard.md).
