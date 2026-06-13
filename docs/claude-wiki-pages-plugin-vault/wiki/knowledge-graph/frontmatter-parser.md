---
title: "Frontmatter Parser"
type: concept
aliases: ["Frontmatter Parser", "frontmatter parser", "splitFrontmatter", "parseFrontmatter"]
parent: "[[Knowledge Graph]]"
path: "knowledge-graph"
sources: ["[[Frontmatter Parser (frontmatter.ts)]]"]
related: ["[[Wikilink Extractor]]", "[[Provenance Checks]]", "[[Schema Version Gate]]", "[[Schema Authority]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["typescript", "frontmatter", "parsing", "engine"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Frontmatter Parser

## Definition

The frontmatter parser is a TypeScript module (`frontmatter.ts`) that reads the
leading `--- … ---` YAML block from markdown files and exposes it as a typed object.
It uses the battle-tested `yaml` library rather than awk/sed heuristics. On
well-formed vault fixtures, the TypeScript parser and the bash `verify-ingest.sh`
implementation agree — this parity is enforced by a gate test.

The module exports the `SplitDoc` interface (`frontmatter: string | null`, `body: string`)
and five pure functions that cover the full lifecycle from raw file content to
individual field values.

## Key Principles

**Fail-safe parsing.** `parseFrontmatter` returns `{}` (never throws) when
frontmatter is absent or malformed. This mirrors the bash fallback: an unparseable
block is treated as absent, not as an error that halts processing.

**Bash parity.** `titleOf` falls back to the filename stem when `title:` is absent
or empty — exactly what the bash `verify-ingest.sh` does. `stringList` handles both
the inline `["a","b"]` and block scalar forms of YAML arrays, covering the two forms
used in practice in vault frontmatter.

**Unterminated frontmatter.** If the opening `---` is present but the closing `---`
is never found, the entire file is treated as `body` with `frontmatter: null`. This
matches the bash `sed` fallback behavior so the two parsers produce the same result
on corrupt inputs.

## Examples

The five exported functions and their roles:

| Function | Input | Output | Use case |
|----------|-------|--------|----------|
| `splitFrontmatter(content)` | Full file string | `SplitDoc` | Separate YAML block from body |
| `parseFrontmatter(content)` | Full file string | `Record<string, unknown>` | Get all frontmatter fields |
| `titleOf(content, filePath)` | Content + path | `string` | Page title with stem fallback |
| `stringList(value)` | Any frontmatter value | `string[]` | Normalize `sources:`, `related:` |
| `stripWikilink(s)` | `"[[Target]]"` | `"Target"` | Unwrap wikilink syntax from arrays |

`stringList` is the coercion bridge: `sources:` may be `["[[A]]","[[B]]"]` (array)
or `"[[A]]"` (plain string); `stringList` normalizes both to `string[]` before
further processing.

## Related Concepts

- [[Wikilink Extractor]] — sibling module; imports `splitFrontmatter` to isolate body before scanning
- [[Provenance Checks]] — uses `parseFrontmatter` to read `sources:` and `derived:` fields
- [[Schema Version Gate]] — uses `parseFrontmatter` to read `schema_version:`
- [[Schema Authority]] — defines the frontmatter schema that this parser reads
