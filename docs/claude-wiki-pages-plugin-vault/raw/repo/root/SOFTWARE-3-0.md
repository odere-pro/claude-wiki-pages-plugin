# SOFTWARE-3-0.md — the dual entry point

**New here? This is the front door** — for a person and for an agent. Pick your on-ramp just
below; everything after the first section is reference you don't need on day one.

> **The one rule of this file:** it *links*, it never *restates*. Every surface of this
> project — docs, tools, design, system design, context, and memory — must be reachable
> here, and must be **equally usable by a person and by an agent**. Each row below gives
> both on-ramps. If a row ever has only one, that is a defect (a parity gate enforces it).

**Are you a person?** → Start at [Getting started](./docs/getting-started.md), then run
`/claude-wiki-pages:wiki` (the single entry verb). New to the terms? Keep
[the Glossary](./docs/GLOSSARY.md) open.

**Are you an agent?** → Load [`skills/engine-api`](./skills/engine-api/SKILL.md) (the tool
surface) and [`skills/maintain-contract`](./skills/maintain-contract/SKILL.md) (safe
read/write order), then act through the deterministic engine and the `_proposed/` review gate.

This file is **dev-time only** — it describes the repository for contributors and for agents
working *on* the project. It is **not** copied into a user's vault on install (see the
dev-time vs runtime separation in [`CLAUDE.md`](./CLAUDE.md)). At runtime, a session's on-ramp
is the resolved vault's `CLAUDE.md`, surfaced by [`scripts/session-start.sh`](./scripts/session-start.sh).

## Six surfaces, two readers

> Reference map — you don't need this on day one. It's where each surface lives for when you do,
> and the agent's index. Every row has both a human and an agent on-ramp.

| Surface | Human on-ramp | Agent on-ramp |
| --- | --- | --- |
| **Docs** | [docs/getting-started.md](./docs/getting-started.md), [docs/operations.md](./docs/operations.md) | [docs/GLOSSARY.md](./docs/GLOSSARY.md) (canonical terms), [CLAUDE.md](./CLAUDE.md) (repo map) |
| **Tools** | [docs/operations.md](./docs/operations.md) (the verbs), `/claude-wiki-pages:wiki` | [`skills/engine-api`](./skills/engine-api/SKILL.md) (engine subcommands, `--json`, exit codes) |
| **Design** | [docs/architecture.md](./docs/architecture.md) (the four-layer stack), [docs/design/](./docs/design/README.md) (diagrams, multi-zoom) | [docs/design/](./docs/design/README.md) (mermaid source) + per-skill / per-agent frontmatter contracts |
| **System design** | [docs/adr/](./docs/adr/README.md) (decisions), [docs/teams.md](./docs/teams.md) (who builds what), [docs/design/06-feature-relations.md](./docs/design/06-feature-relations.md) | [schemas/](./schemas/) + [hooks/hooks.json](./hooks/hooks.json) + [.claude-plugin/plugin.json](./.claude-plugin/plugin.json) |
| **Context** | [skills/init/template/CLAUDE.md](./skills/init/template/CLAUDE.md#ontology-profile-ontology-profile-v1) (the schema, `ontology-profile-v1`) | same schema + [`skills/maintain-contract`](./skills/maintain-contract/SKILL.md) (what to read before acting) |
| **Memory** | [docs/adr/ADR-0010-durable-memory-carve-out.md](./docs/adr/ADR-0010-durable-memory-carve-out.md), the vault `wiki/log.md` | [`scripts/session-memory.sh`](./scripts/session-memory.sh) (`source_type: agent-session` provenance) |

## Authoring — one path, both writers

A person and an agent author the **same** way: a typed template
([skills/init/template/_templates/](./skills/init/template/_templates/)) →
[`skills/draft`](./skills/draft/SKILL.md) writes to `_proposed/` →
[`skills/review`](./skills/review/SKILL.md) gates promotion into `wiki/`. Nothing reaches the
wiki unreviewed. The ontology a page must conform to (named classes, frontmatter properties,
typed predicates) is the `ontology-profile-v1` contract in
[skills/init/template/CLAUDE.md](./skills/init/template/CLAUDE.md) — read it, do not fork it.

## Secure & traceable by construction

- **Write confinement** — every write is fenced to the resolved vault by
  [`scripts/firewall.sh`](./scripts/firewall.sh) (a `PreToolUse` hook); `raw/` is immutable.
  Vault resolution: [`scripts/resolve-vault.sh`](./scripts/resolve-vault.sh).
- **Structural provenance** — every claim traces to `raw/` via `sources` / `source_quotes` /
  `derived` / `confidence` (the schema). No embeddings, no vector store: retrieval is wiki
  pages + wikilinks + frontmatter.
- **Audit trail** — agent session learnings land as committed `source_type: agent-session`
  raw sources through the [ADR-0010](./docs/adr/ADR-0010-durable-memory-carve-out.md)
  carve-out and the `_proposed/` gate; maintenance activity is logged to the vault `wiki/log.md`.
- **Threat model** — [SECURITY.md](./SECURITY.md).

## Contributing

[CONTRIBUTING.md](./CONTRIBUTING.md) · the development teams and how they run:
[docs/teams.md](./docs/teams.md) · the term-gate every doc must pass:
[`scripts/validate-docs.sh`](./scripts/validate-docs.sh).
