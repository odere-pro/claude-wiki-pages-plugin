---
title: "ADR-0032: Piped and Path-Qualified Wikilinks"
type: entity
entity_type: standard
aliases: ["ADR-0032", "adr-0032", "piped wikilinks ADR", "path-qualified wikilinks"]
parent: "[[adrs|ADRs]]"
path: "docs/adrs"
sources: ["[[docs-adr-0032|ADR-0032: Piped and Path-Qualified Wikilinks]]"]
related: []
tags: ["docs", "adrs", "wikilinks", "schema"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0032: Piped and Path-Qualified Wikilinks

Formalizes `[[file-basename|Display Text]]` as the normative link form and defines the exact condition for path-qualification: only when a basename occurs in 2+ files anywhere in the vault.

## Overview

ADR-0032 closes the link-authoring gap that led to hundreds of ghost nodes in early vault runs. The rule is simple: default to bare basename form; path-qualify only on a provable collision; never guess the folder (guessing produces dangling links, which are worse than ghost nodes).

## Key Facts

**Status:** Accepted

**Normative form:** `[[file-basename|Display Text]]`
- `file-basename` — the kebab-case filename stem (no extension).
- `Display Text` — Title Case page title.

**When to path-qualify:** Only when the basename occurs in 2+ files anywhere in the vault (including `raw/` originals). A `wiki/_sources/foo.md` summary and its `raw/docs/foo.md` original share a basename — that is a genuine collision requiring path-qualification.

**How to path-qualify:** Use the target page's **actual** wiki-relative path, verified to exist: `[[_sources/foo|Foo Title]]`. Never guess — a wrong folder path creates a dangling link.

**Remediation tools:**
- `heal-ghost-links.sh` — rewrites bare `[[Title]]` links that slipped through.
- `migrate-piped-links.ts` — whole-vault migration to the piped-basename convention.

**Consequences:**
- Ghost nodes are prevented by construction: the link always targets a real basename.
- The path-qualification condition (`2+ files with the same basename`) is objective and checkable.
- Authors can always look up a source's basename in `wiki/_sources/` rather than synthesizing one from the title.

## Related

ADR-0030 defines the resolution priority that makes basename-vs-alias collisions detectable. ADR-0028 provides the dangling-link WARN that catches path-qualification mistakes.
