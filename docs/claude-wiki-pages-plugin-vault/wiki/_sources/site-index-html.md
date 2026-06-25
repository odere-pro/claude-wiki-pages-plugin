---
title: "GitHub Pages Landing Page"
type: source
source_type: article
source_format: text
url: "https://odere-pro.github.io/claude-wiki-pages-plugin/"
author: "odere-pro"
publisher: "odere-pro"
date_published: 2026-06-05
date_ingested: 2026-06-25
tags: ["site", "marketing", "landing-page"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# GitHub Pages Landing Page

## Metadata

- **File**: `raw/repo/site/index.html`
- **URL**: `https://odere-pro.github.io/claude-wiki-pages-plugin/`
- **Type**: Static HTML landing page

## Summary

The public GitHub Pages website for the claude-wiki-pages plugin. A single-file static HTML page with inline CSS and a deferred Mermaid.js render. Describes the plugin as "Karpathy's LLM Wiki for Claude Code" and presents the four-layer architecture through a bento card grid, an architecture flowchart, and an engine explanation section. No build step — raw HTML served by GitHub Pages.

## Key Claims

Tagline: "an agent-operable wiki that heals itself." CTA: "Get it on GitHub." Architecture flowchart shows user → orchestrator → specialists → Bun engine → git-checkpointed heal → vault. Four-layer bento: Layer 1 (Data), Layer 2 (14 short verbs), Layer 3 (8 executors), Layer 4 (hooks). Engine section contrasts Bash (hot-path hooks, zero startup cost) with Bun (verify, fix, heal, doctor, context, okf — structured JSON output). OG/Twitter meta cards and Schema.org `SoftwareApplication` structured data are included. Mermaid renders lazily with reduced-motion awareness; fallback text provided. Apache-2.0 license, built for Claude Code, Karpathy's LLM Wiki pattern.
Covers: Landing Page, Four-Layer Architecture, GitHub Pages, Bun Engine, Plugin Marketing
