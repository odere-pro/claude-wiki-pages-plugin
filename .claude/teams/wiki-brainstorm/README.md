# claude-wiki-pages UX & adoption brainstorm — agent-team apparatus

A dev-only setup for running a team of agents that brainstorms the **UX & adoption** course of
`claude-wiki-pages` — onboarding, authoring ergonomics, ontology clarity, capability tiers, and
configuration. It is **not** part of the shipped plugin (`agents/`, `skills/`, `hooks/`) and is
never loaded as end-user session context — it sits alongside `tmp/plan/` and `docs/adr/`.

It is the **ideation** counterpart to the engineering team in `.claude/teams/wiki-dev/` (which
*implements* roadmaps). See `docs/teams.md` for how the two teams relate and when to use each.

## What's here

```text
.claude/teams/wiki-brainstorm/
  TEAM-BRIEF.md          # shared context every teammate reads first (charter, vision, non-negotiables, roster, protocol)
  README.md              # this file
  roles/                 # one structured prompt per role
    product-manager.md             # PM + facilitator (frames rounds, writes the roadmap)
    architect.md                   # four-layer coherence; co-owns convergence
    structure-authoring-architect.md
    ontology-engineer.md
    senior-engineer.md
    plugin-expert.md
    plugin-power-user.md
    new-claude-user.md
    claude-code-config-expert.md
    grill-me-interrogator.md       # drives the external grill-me skill
    skeptic.md                     # guardian: NO-RAG, KISS, DRY, glossary
```

## Roster (11 personas)

A UX/adoption-oriented panel spanning the whole user spectrum — novice, power user, agent — plus
the authoring, ontology, engineering, and configuration expertise to keep proposals buildable and
coherent. There is **no separate Lead**: the **Product Manager** carries the facilitator/synthesizer
hat and the **Architect** co-owns architectural coherence at convergence. Full table with model and
effort in `TEAM-BRIEF.md` §8.

## External dependency: the grill-me skill

The `grill-me-interrogator` role drives a **grill-me** skill that is **not** in this repo and not
yet installed in `~/.claude/`. Before running the team, wire the role to the real skill
(location/namespace) — see the **Wire this in** note in `roles/grill-me-interrogator.md`. If it is
unavailable at run time, the role applies the same Socratic interrogation method by hand.

## Prerequisites

- Claude Code ≥ 2.1.32 (Agent Teams). Verify: `claude --version`.
- Agent Teams enabled: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `~/.claude/settings.json`.
  **The flag is read at startup — restart Claude Code after enabling it.**

## How to run (live Agent Teams)

In a session opened at the repo root, paste this to the team lead:

> Create an 11-teammate agent team for the claude-wiki-pages UX & adoption brainstorm. Every
> teammate first reads `.claude/teams/wiki-brainstorm/TEAM-BRIEF.md`, then adopts one role from
> `.claude/teams/wiki-brainstorm/roles/` (one teammate per file). Spawn each with the model named in its role
> header (opus or sonnet). The `product-manager` is the facilitator: it frames Round 1, runs the
> three-round protocol in Brief §9 (divergence → cross-critique → convergence), and writes the
> phased roadmap to `tmp/plan/` in the structure of Brief §7, with the `architect`'s coherence
> sign-off. Keep everything read-only on the plugin and grounded with repo-path citations.

The Product Manager orchestrates the rounds, resolves conflicts (Brief §9), and writes the roadmap.

## The three-round protocol (summary)

1. **Divergence** — each role produces ideas in isolation (`IDEA-<role>-<n>` template).
2. **Cross-critique** — roles file `OBJ-<from>-<to>-<n>` objections; the Skeptic critiques all and
   the Grill-Me Interrogator grills every headline proposal into a falsifiable requirement.
3. **Convergence** — the Product Manager merges into the roadmap (Architect coherence sign-off);
   non-negotiables win, Skeptic vetoes stand unless the facilitator overrides and logs the rejected
   alternative.

## Output

One phased roadmap in `tmp/plan/` (a proposal, not a decision — `docs/adr/` is for decisions).

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
