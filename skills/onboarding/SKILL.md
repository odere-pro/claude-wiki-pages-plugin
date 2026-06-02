---
name: onboarding
description: >
  First-run guided tour for a brand-new user. Walks from a fresh project to a
  working wiki: health check → scaffold the vault → drop a first source →
  ingest (with automatic git-checkpointed self-heal) → ask a first question.
  Trigger when the user says "get started", "onboard me", "set this up",
  "what now", "how do I use this", "first time", or invokes
  /claude-wiki-pages:onboarding directly. Idempotent — safe to re-run; it
  resumes from wherever the vault already is.
allowed-tools: Read Bash Glob Grep
---

# Onboarding — guided first run

Take someone from "just installed the plugin" to "I have a cited answer from my
own wiki" in five short steps. Each step verifies before moving on and explains
what just happened, so the user learns the model by doing it once.

## Principles

- **One step at a time.** Do a step, show the result, say what is next. Never dump the whole pipeline.
- **Resume, don't restart.** Probe state first; skip steps already done. Re-running is always safe.
- **Self-healing.** Ingest runs the git-checkpointed auto-heal; never ask the user to fix structure by hand.
- **Plain language.** The user does not need to know the words "MOC" or "frontmatter" to finish onboarding.

## Steps

1. **Health check.** Run `/claude-wiki-pages:doctor` (or `bash scripts/doctor.sh`). If anything is red, run it with `--fix` and explain what was repaired. Confirm Bun is present (the engine) — if not, note that hooks still work and point to <https://bun.sh>.
2. **Scaffold the vault.** If no vault exists, run the `init` skill to create `vault/` (immutable `raw/`, maintained `wiki/`, schema in `vault/CLAUDE.md`). Tell the user where it is and that `raw/` is for *their* sources.
3. **Add a first source.** Ask the user to drop one file (a note, a PDF, a markdown doc) into `vault/raw/` — or offer to use the bundled sample. Confirm it landed.
4. **Ingest.** Run the ingest flow (`/claude-wiki-pages:wiki "ingest the new source"`). Explain that the plugin reads the source, writes cited wiki pages, and **auto-heals the wiki under a git checkpoint** (so it is always reversible with `git revert`). Show the new pages.
5. **Ask a question.** Run `/claude-wiki-pages:query "<a question the source can answer>"`. Show the answer with its `[[wikilink]]` citations — this is the payoff: answers grounded in the user's own material.

## Close

End with a short "what you can do next" map: ingest more sources (`/claude-wiki-pages:wiki`), check health (`/claude-wiki-pages:doctor`), ask questions (`/claude-wiki-pages:query`), and where rollback lives (`git log` in the vault). Point power users at `/claude-wiki-pages:engine-api` to drive the deterministic engine directly.

## Specification anchor

`/SPEC.md §9` (commands), `/SPEC.md §11` (`claude-wiki-pages-onboarding-agent`).
