---
title: "MOC Repair Primitives"
type: concept
aliases: ["MOC Repair Primitives", "moc-build", "replaceYamlListField", "syncChildren", "buildIndexStub", "dedupeIndexLinks"]
parent: "[[engine-index|Engine — Index]]"
path: "engine"
sources: ["[[moc-build-ts-source|moc-build.ts Source]]", "[[engine-api-skill|Engine API Skill (SKILL.md)]]"]
related: ["[[deterministic-engine|Deterministic Engine]]", "[[folder-note|Folder Note]]", "[[lint-rules|Lint Rules]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["engine", "moc", "repair", "fix"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# MOC Repair Primitives

## Definition

MOC Repair Primitives are the four deterministic, idempotent functions in `src/core/moc-build.ts` that the `fix` verb uses to repair structural errors in the vault's Map of Content (MOC) layer. All operations produce byte-identical output when applied to an already-correct file — running fix twice is always safe. Body prose is never touched; only structural frontmatter lists and duplicate index bullets are modified.

## Key Principles

- **Idempotency**: all four functions return the unchanged input when no repair is needed. `fix` exploits this: it calls each function unconditionally and only writes when the output differs.
- **Body-safe**: these functions never modify any content after the closing `---` of the frontmatter. Only `children:`, `child_indexes:`, and index body bullet lines are in scope.
- **Single YAML list replacement**: `replaceYamlListField()` handles both inline (`field: [v1, v2]`) and block (`field:\n  - v1`) YAML list forms, replacing them with the provided items while preserving every other line.
- **`buildIndexStub()` generates canonical names**: the folder note title is `"FolderName — Index"` (title-cased from kebab/underscore) and `parent: "[[index|Wiki Index]]"`. Used when `fix` creates a missing folder note.

## Examples

```typescript
// syncChildren: set children: list on a folder note
const fixed = syncChildren(indexFileContent, ["Firewall", "Deterministic Engine"]);
// Result: children:\n  - "[[Firewall]]"\n  - "[[deterministic-engine|Deterministic Engine]]"

// dedupeIndexLinks: remove duplicate bullet lines
// Input body has two "- [[Firewall]]" lines → output keeps first only

// buildIndexStub: create a minimal folder note for "my-topic/"
const stub = buildIndexStub("my-topic", ["Concept A", "Concept B"], "2026-06-13");
// Produces a complete schema-valid folder note at wiki/my-topic/my-topic.md
```

## Related Concepts

- [[deterministic-engine|Deterministic Engine]] — the `fix` and `heal` verbs that call these primitives
- [[folder-note|Folder Note]] — the index page type these primitives maintain
- [[lint-rules|Lint Rules]] — the consistency checks that `fix` repairs deterministically
