# Design — diagrams as documentation

This tree explains the system with mermaid diagrams at several zoom levels and from
several perspectives, so the design is legible and checkable by both a person and an
agent. Diagrams are committed Markdown (versioned, diffable, gate-checked); they are the
visual half of the [`SOFTWARE-3-0.md`](../../SOFTWARE-3-0.md) dual entry point and stay DRY by
linking the authorities ([`docs/architecture.md`](../architecture.md), the schema, the hooks)
rather than restating them.

**New here? If you read one diagram, read [01-system-context.md](./01-system-context.md)** — it
shows the whole system on one screen. Come back for the rest when you need detail.

## Zoom levels (C4-style)

> "C4" is just a four-level zoom convention — **C**ontext → **C**ontainer → **C**omponent →
> **C**ode — read from the outside in.

| Level | Question it answers | File |
| --- | --- | --- |
| **L0 — Context** | Who uses the system, and what does it touch? | [01-system-context.md](./01-system-context.md) |
| **L1 — Containers / Layers** | What are the big moving parts (the four-layer stack + the engine + the vault)? | [01-system-context.md](./01-system-context.md) |
| **L2 — Components** | What is inside each layer, and how do they wire together? | [02-component-design.md](./02-component-design.md) |
| **L3 — Sequences** | What happens, step by step, on the key flows? | [03-sequences.md](./03-sequences.md) |

## Perspectives

| Perspective | What it shows | File |
| --- | --- | --- |
| **Component design** | The engine, skills, agents, hooks and scripts as components | [02-component-design.md](./02-component-design.md) |
| **Patterns** | The recurring design patterns this codebase uses | [02-component-design.md](./02-component-design.md) |
| **Sequences** | Ingest write-path, SessionStart, agent write-back with human approval | [03-sequences.md](./03-sequences.md) |
| **Teams & agents** | How the dev teams and the 8 runtime agents work | [04-teams-and-agents.md](./04-teams-and-agents.md) |
| **Config · security · isolation** | How `.claude` config is set up, secured, and isolated | [05-claude-config-security.md](./05-claude-config-security.md) |
| **Feature relations** | How Claude Code features connect (agents, hooks, rules, skills, MCP, scripts, plugins, commands, scheduled tasks, workflows, goals) | [06-feature-relations.md](./06-feature-relations.md) |
| **Ontology classes and predicates** | What page classes exist and which typed predicates may connect them (ER-style, from `ontology-profile-v1`) | [07-ontology.md](./07-ontology.md) |

## Conventions

- **One fence per diagram:** ` ```mermaid ` … ` ``` `. Keep each diagram to one idea; zoom in
  with a new diagram rather than overloading one.
- **Ground every node** in a real repo entity (a file, a skill, a hook, an agent). A node that
  names nothing in the tree is a `[speculative]` note, labelled as such.
- **Layer names are Title Case** ("Layer 1 — Data"), per the glossary gate.
- **No RAG / no embeddings** anywhere in the design — retrieval is wiki pages + wikilinks +
  frontmatter. If a diagram implies similarity search, it is wrong.
- **Render:** GitHub, Obsidian, and most IDEs render mermaid natively. Agents read the fenced
  source directly — same source, two readers.

## What is NOT here yet (dev-team backlog)

The deeper L3 sequences for the maintenance loop and the per-vault firewall decision tree are
tracked in `tmp/SOFTWARE-3-0-plan.md` (the diagram workstream). Add them here as they land.

The ER-style ontology diagram landed as [07-ontology.md](./07-ontology.md) (PM.7 — delivered).

> **Gate status:** the "node grounding" and link-existence checks described above are **live** — the
> design-drift gate shipped as `validate-docs.sh` **Check 5** ([ADR-0013](../adr/ADR-0013-design-drift-gate.md),
> Accepted). It grounds path-shaped tokens (5a), resolves repo-relative links (5b), enforces wired-hook
> coverage (5c), verifies the [06-feature-relations.md](./06-feature-relations.md) counts (5d), requires an
> Authority link per doc (5e), checks router parity (5f), and grounds ontology predicates (5g). It runs in
> CI Tier 0 alongside `gate-10` (markdownlint), `gate-05` (verify parity) and `gate-11` (firewall parity).
> "Ground every node" is now enforced, not just a convention — honor the `[speculative]` marker to exempt a
> doc from 5a node-grounding.
