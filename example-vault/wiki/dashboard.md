---
title: "Wiki Dashboard"
type: index
parent: "[[Wiki Index]]"
path: ""
children: []
child_indexes: []
aliases: ["Wiki Dashboard"]
tags: [dashboard]
created: 2026-04-18
updated: 2026-04-18
---

# Wiki Dashboard

> [!warning] Requires Dataview plugin — does NOT render statically
> Every block on this page is a Dataview query. In Obsidian with the [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin installed they render as live tables. In GitHub, `cat`, IDE previews, or any non-Obsidian viewer they appear as empty code blocks. If you need a shareable snapshot, run the `obsidian-cli` skill (at `.claude/skills/obsidian-cli/SKILL.md`) and commit a rendered `dashboard-snapshot.md` alongside this page.

## All pages by type

```dataview
TABLE type, status, confidence, path, updated, update_count
FROM "wiki"
WHERE type != "index"
SORT type ASC, confidence DESC
```

## Topic tree overview (all indexes)

```dataview
TABLE parent, length(children) AS "notes", length(child_indexes) AS "subtopics"
FROM "wiki"
WHERE type = "index"
SORT path ASC
```

## Stale pages (not updated in 30+ days)

```dataview
TABLE title, type, path, updated, confidence
FROM "wiki"
WHERE status = "active" AND updated < date(today) - dur(30 days)
SORT updated ASC
```

## Low confidence pages

```dataview
TABLE title, type, path, confidence, sources
FROM "wiki"
WHERE confidence < 0.6
SORT confidence ASC
```

## Pages with contradictions

```dataview
TABLE title, path, contradicts
FROM "wiki"
WHERE length(contradicts) > 0
```

## Pages missing parent or path

```dataview
TABLE title, type
FROM "wiki"
WHERE type != "index" AND (!parent OR !path)
```

## Recent activity

```dataview
TABLE title, type, updated
FROM "wiki"
SORT updated DESC
LIMIT 20
```
