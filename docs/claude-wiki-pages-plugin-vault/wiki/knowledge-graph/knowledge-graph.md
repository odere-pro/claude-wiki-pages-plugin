---
title: "Knowledge Graph"
type: index
aliases: ["Knowledge Graph", "knowledge-graph", "knowledge graph"]
parent: "[[Wiki Index]]"
path: "knowledge-graph"
children:
  - "[[Frontmatter Parser]]"
  - "[[Wikilink Extractor]]"
  - "[[Config Schema]]"
child_indexes: []
tags: ["knowledge-graph", "implementation", "parsing"]
created: 2026-06-13
updated: 2026-06-13
---

# Knowledge Graph

Implementation-level knowledge about the `claude-wiki-pages` knowledge graph layer:
the TypeScript modules that parse frontmatter, extract wikilinks, and validate
configuration. These pages cover the low-level data structures and parsing primitives
that underpin verification, graph traversal, and schema enforcement.

## Pages

### Parsing Primitives

- [[Frontmatter Parser]] — `splitFrontmatter`, `parseFrontmatter`, `titleOf`, `stringList`, `stripWikilink` from `frontmatter.ts`
- [[Wikilink Extractor]] — `extractWikilinks`, `duplicates`, `markdownLinkViolation` from `wikilinks.ts`

### Configuration

- [[Config Schema]] — JSON Schema for user and project config; `autoHeal`, `gitCheckpoint`, `firewall`, `localModel`, `maintenance` groups

## Subtopics

_No sub-folders; all knowledge-graph pages are siblings in this folder._
