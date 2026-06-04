# claude-wiki-pages brainstorm — agent-team apparatus

A dev-only setup for running a team of agents that brainstorms the development course of
`claude-wiki-pages`. It is **not** part of the shipped plugin (`agents/`, `skills/`, `hooks/`)
and is never loaded as end-user session context — it sits alongside `docs/plan/` and `docs/adr/`.

## What's here

```
docs/brainstorm/
  TEAM-BRIEF.md          # shared context every teammate reads first
  README.md              # this file
  roles/                 # one structured prompt per role
    wiki-brainstorm-lead.md
    wiki-retrieval-engineer.md
    wiki-schema-architect.md
    wiki-ingest-engineer.md
    wiki-context-engineer.md
    wiki-portability-engineer.md
    wiki-skeptic.md
```

## Prerequisites

- Claude Code ≥ 2.1.32 (Agent Teams). Verify: `claude --version`.
- Agent Teams enabled: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `~/.claude/settings.json`.
  **The flag is read at startup — restart Claude Code after enabling it.**

## How to run (live Agent Teams)

In a session opened at the repo root, paste this to the team lead:

> Create a 7-teammate agent team for the claude-wiki-pages brainstorm. Every teammate first
> reads `docs/brainstorm/TEAM-BRIEF.md`, then adopts one role from `docs/brainstorm/roles/`
> (one teammate per file). Spawn each with the model named in its role header (opus or sonnet).
> Run the three-round protocol in the Brief §9 (divergence → cross-critique → convergence).
> At convergence, the lead writes the phased roadmap to `docs/plan/` in the structure of the
> Brief §7. Keep everything read-only on the plugin and grounded with repo-path citations.

The Lead orchestrates the rounds, resolves conflicts (Brief §9), and writes the roadmap.

## The three-round protocol (summary)

1. **Divergence** — each role produces ideas in isolation (`IDEA-<role>-<n>` template).
2. **Cross-critique** — roles file `OBJ-<from>-<to>-<n>` objections; the Skeptic critiques all.
3. **Convergence** — the Lead merges into the roadmap; non-negotiables win, Skeptic vetoes
   stand unless the Lead overrides and logs the rejected alternative.

## Output

One phased roadmap in `docs/plan/` (a proposal, not a decision — `docs/adr/` is for decisions).

## Dogfood the result (optional)

Prove the ingest + search loop on the roadmap **without touching the shipped example vault**:

1. `export CLAUDE_WIKI_PAGES_VAULT=/tmp/wiki-brainstorm-scratch`
2. Scaffold it with `/claude-wiki-pages:init`.
3. Copy the roadmap into the scratch vault's `raw/`, then run `/claude-wiki-pages:wiki` to
   ingest → curate → polish.
4. Run `/claude-wiki-pages:search` and `/claude-wiki-pages:query` to confirm topic-scoped
   retrieval returns the roadmap pages.
5. Discard the scratch vault.

**Never** point `CLAUDE_WIKI_PAGES_VAULT` at `docs/vault-example/` — that vault is the shipped,
schema-pinned reference and must stay untouched.
