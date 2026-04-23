# 6. Check the dashboard

> Reference. For the day-1 path, see [index.md](./index.md).

The dashboard gives you a live view of the vault's health and coverage. It is an Obsidian Dataview page — useful in Obsidian, empty everywhere else.

## Where it lives

`vault/wiki/dashboard.md`

## Prerequisite

Obsidian with the [Dataview](https://github.com/blacksmithgu/obsidian-dataview) community plugin installed and enabled. The page opens with a warning callout that restates this.

Without Dataview, the queries render as empty code blocks. Switch to Obsidian (Preview mode) to see the tables.

## What it shows

| Section           | What you learn                                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| All pages by type | Every page in the vault with its type, status, confidence, path, last updated date, and update count. Sort by confidence to surface weakly-evidenced claims. |
| Sources           | How many sources are in `wiki/_sources/` and which have never been cited. Orphans appear at the bottom.                                                      |
| Topic tree        | Each topic folder, page counts, and its per-folder MOC. Flat-folder sprawl (>12 pages) jumps out here.                                                          |
| Contradictions    | Pages with non-empty `contradicts:` frontmatter.                                                                                                             |
| Stale candidates  | Pages not updated in 30+ days with low `update_count`.                                                                                                       |

Exact queries are in the file. Edit the page if you want extra views — the Dataview plugin uses plain DQL.

## Reading the dashboard

Use it before and after batch operations:

- **Before ingest** — know the current state so you can diff mentally afterwards.
- **After lint/fix** — confirm warnings dropped.
- **Before an export** — spot pages with `confidence < 0.5` that shouldn't be cited.
- **Monthly** — sweep for stale pages and orphan sources.

## Static snapshot

If you need a non-Obsidian-rendered snapshot (e.g., for a PR, a report, or a non-technical stakeholder), use the Obsidian CLI reference skill:

```
/llm-wiki-stack:obsidian-cli
```

Ask it to run a Dataview query and write the result to `vault/wiki/dashboard-snapshot.md`. The skill drives the Obsidian CLI, which has access to the rendered Dataview result. Commit the snapshot file alongside `dashboard.md`.

## Common dashboard findings and what to do

| Finding                                     | Action                                                                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Lots of rows with `confidence: 1.0`         | The `1.0` default was not honestly set. Run lint — the single-source-high-confidence check will flag them.             |
| Orphan sources (not cited by any wiki page) | Find the right entity/concept page and add the source. If nothing fits, the source probably shouldn't be in the vault. |
| Flat folder with > 12 direct children       | Run `/llm-wiki-stack:llm-wiki-fix` — the flat-folder phase restructures large folders into subtopic subfolders.    |
| `update_count: 1` on a foundational page    | That page is under-evidenced. Either retire it or run the pipeline with new sources that cover the topic.              |
| `status: stale` pages                       | Lint flagged them. Either refresh with new sources or set `status: superseded` and link to the replacement.            |

## Next step

- Pull a cited answer out of the wiki → [guide 7](./07-query-the-wiki.md).
