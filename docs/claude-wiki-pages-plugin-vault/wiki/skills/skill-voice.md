---
title: "Voice Skill"
type: entity
entity_type: tool
aliases: ["Voice Skill", "voice", "/claude-wiki-pages:voice", "house voice", "writing register"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-voice|Voice Skill — SKILL.md]]"]
related: []
tags: ["skills", "layer-2", "voice", "writing-standards"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Voice Skill

The `voice` skill defines the house writing voice for claude-wiki-pages — two registers, a blocklist of LLM artifacts, vocabulary rules, and how to write a wiki page. Reference material, not an action.

## Overview

Read before writing or editing any prose: a README, a guide, a design doc, an ADR, a section intro, or a wiki page. The schema in `skills/init/template/CLAUDE.md` owns frontmatter and structure; this skill owns the words.

## Key Facts

**Two registers** (chosen by audience):
- **Explanatory register**: for anyone learning what the thing is or why it matters. Short concrete sentences, active voice, lead with the point, show don't label, gloss a term on first use then commit to it, close with the one next step.
- **Engineer register**: for the reader who has to build, operate, or audit. Exact glossary terms, grounded in paths and contracts, terse beats chatty.

When a doc serves both: open in explanatory, shift to engineer register as it goes deep.

**LLM-artifact blocklist** (cut in both registers):
- Em-dash drama, filler openers ("It's worth noting"), hype adjectives (powerful, seamless, robust, effortless, leverage, utilize, unlock, supercharge)
- "Not just X it's Y" frame
- Hedge stacks ("generally typically usually")
- Over-bolding (bold for one or two real signals per section only)
- Echo summaries (closing sentence that restates the heading)
- Robotic triads (forced three-part parallelism)
- Provenance as adjective ("authoritative source", "definitive reference")
- Inline re-definition (re-explaining a term that already has its own page)

**Wiki page rules**:
- Open with the class definition in plain language (`concept`: "X is a …"; `entity/tool`: "X is a tool that …")
- The opening sentence stands alone — a reader who follows zero links learns what the page is
- Stay in the engineer register for the body
- Never assert an uncited fact
- End synthesis/query answers with a `## Sources` heading

**The aloud test**: if it sounds like a person who understands the system explaining it on purpose, ship it.

**Vocabulary gate**: `scripts/validate-docs.sh` enforces banned strings (`BANNED_STRINGS` list) and register-separation (discoverability words belong only in README tagline, `plugin.json`, and `marketplace.json`).

## Related

Enforced by `scripts/validate-docs.sh` (Check 0: banned strings; Check 1: SEO leak; Check 2: layer name case; Checks 3/4: slash command namespace; Check 5d: counts).
