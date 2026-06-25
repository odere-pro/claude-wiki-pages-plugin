---
title: "GitHub Pages Site"
type: entity
entity_type: product
aliases: ["GitHub Pages site", "landing page", "plugin website"]
parent: "[[site|Site]]"
path: "site"
sources: ["[[site-index-html|GitHub Pages Landing Page]]", "[[site-robots-txt|Robots.txt]]", "[[site-sitemap-xml|Sitemap XML]]", "[[site-og-svg|OG Image SVG]]"]
related: []
tags: ["site", "marketing", "github-pages"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# GitHub Pages Site

The public website for the claude-wiki-pages plugin, hosted at `https://odere-pro.github.io/claude-wiki-pages-plugin/` — a single-file static HTML page with no build step.

## Overview

The site is a single `site/index.html` file served directly by GitHub Pages. It introduces the plugin to potential users through a hero section, an interactive Mermaid architecture flowchart, a bento card grid describing the four layers, and an engine explanation contrasting Bash (hooks) with Bun (engine).

## Key Facts

- **URL**: `https://odere-pro.github.io/claude-wiki-pages-plugin/`
- **Technology**: Static HTML, inline CSS (CSS custom properties with OKLCH palette), deferred ESM Mermaid.js
- **Tagline**: "An agent-operable wiki that heals itself."
- **Architecture presentation**: Hero CTA → "How it works" flowchart section → "Four layers" bento → "The deterministic engine" split card
- **SEO assets**: `robots.txt` (allow all, sitemap pointer) and `sitemap.xml` (one URL, weekly changefreq, priority 1.0)
- **Social preview**: OG and Twitter Card meta tags reference `og.png` (1200×630); source SVG is `site/og.svg`
- **Structured data**: Schema.org `SoftwareApplication` JSON-LD embedded in the page
- **Accessibility**: Skip-to-content link, `aria-label` on the terminal example, reduced-motion aware animations and Mermaid render, text fallback under the flowchart diagram

## Related

The site's flowchart and feature counts (8 agents, 14 verbs, 26 skills, 4 commands) are kept in sync with the plugin source in every repo-wide voice pass.
