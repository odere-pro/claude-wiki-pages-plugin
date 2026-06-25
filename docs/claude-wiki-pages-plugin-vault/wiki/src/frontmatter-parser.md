---
title: "Frontmatter Parser"
type: concept
aliases: ["frontmatter-parser", "splitFrontmatter", "parseFrontmatter", "Frontmatter Parsing"]
parent: "[[src|Src]]"
path: "src"
sources: ["[[src-core-frontmatter|src/core/frontmatter.ts — Frontmatter Parsing]]"]
related: []
tags: ["src", "core", "frontmatter", "parsing", "yaml"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Frontmatter Parser

YAML frontmatter parsing for wiki pages using the `yaml` library (not awk/sed heuristics). Produces `SplitDoc` and parsed frontmatter objects consumed by every check and command in the engine.

## Definition

`core/frontmatter.ts` splits the leading `--- … ---` YAML block and parses it. On well-formed vault fixtures the `yaml` library and the awk/sed heuristics in `scripts/verify-ingest.sh` produce identical results — the parity gate asserts this.

## Key Principles

**`splitFrontmatter(content)`**: splits into `{ frontmatter: string | null, body: string }`. The `frontmatter` field is `null` for absent or unterminated frontmatter (treats the whole file as body, matching the bash `sed` fallback).

**`parseFrontmatter(content)`**: returns `Record<string, unknown>`. Returns `{}` when absent or invalid YAML — never throws. Uses the `yaml` library for correctness.

**`titleOf(content, filePath)`**: the `title:` field value, falling back to the filename stem (mirrors the bash default). Used everywhere a human-readable page title is needed.

**`stringList(value)`**: coerces a frontmatter field into `string[]`, handling:
- YAML block array: `["a", "b"]` → `["a", "b"]`
- Scalar string: `"one item"` → `["one item"]`
- Empty / null / wrong type: `[]`

**`stripWikilink(s)`**: strips surrounding `[[ … ]]` leaving the inner target. Used when unwrapping a frontmatter wikilink for resolution.

## Examples

- Content with `---\ntitle: Foo\n---\n# Foo` → `{ frontmatter: "title: Foo", body: "# Foo" }`
- `stringList("[[agents|Agents]]")` → `["[[agents|Agents]]"]`
- `titleOf` falls back to filename stem when `title:` is missing

## Related Concepts

- The `yaml` library is the only external parsing dependency in `core/`
- Used by virtually every check in `verify` and by the `search` command
- `link-resolver.ts` uses `parseFrontmatter` to read `title:` and `aliases:` for the link index
