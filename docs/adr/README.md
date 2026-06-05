# Architecture Decision Records

This directory holds the ADRs for `claude-wiki-pages`. Each ADR captures the **rationale** behind a
system-design decision: what was decided, the alternatives that were weighed, and the conditions
under which the decision should be revisited. The *contracts* themselves live in the documents that
own them — [`architecture.md`](../architecture.md) (the four-layer model and command/agent
contracts) and [`vault-example/CLAUDE.md`](../vault-example/CLAUDE.md) (the schema). ADRs explain
*why* a particular path was taken; they are not the spec.

## Index

| ID | Title |
| --- | --- |
| 0001 | [Four-layer orchestrator](./ADR-0001-four-layer-orchestrator.md) |
| 0002 | [Agent naming convention](./ADR-0002-agent-naming-convention.md) |
| 0003 | [Polish-agent and Obsidian-side experience](./ADR-0003-polish-agent-and-obsidian-side.md) |
| 0004 | [`ontology-profile-v1`](./ADR-0004-ontology-profile-v1.md) |
| 0005 | [Git-required per-vault init](./ADR-0005-git-required-per-vault-init.md) |
| 0006 | [One search score object](./ADR-0006-search-score-object.md) |
| 0007 | [Wiki-native recall](./ADR-0007-wiki-native-recall.md) |
| 0008 | [One graph-traversal primitive](./ADR-0008-graph-traversal-primitive.md) |
| 0009 | [Multi-vault registry and per-vault write confinement](./ADR-0009-multi-vault-confinement.md) |
| 0010 | [Durable-memory carve-out](./ADR-0010-durable-memory-carve-out.md) |
| 0011 | [Local-model quality gate](./ADR-0011-local-model-quality-gate.md) |
| 0012 | [Vault `merge` conflict resolution](./ADR-0012-vault-merge-conflict-resolution.md) |
| 0013 | [Design-drift gate — `validate-docs.sh` Check 5](./ADR-0013-design-drift-gate.md) |
| 0014 | [Single-source required fields; duplicate-claim WARN in review](./ADR-0014-single-source-required-fields-and-duplicate-claim-warning.md) |
| 0015 | [Engine self-description surfaces — `capabilities`/`ontology --json`](./ADR-0015-engine-self-description-surfaces.md) |
| 0016 | [Simultaneous multi-vault management — fail-closed registry, audit roll-up](./ADR-0016-simultaneous-multi-vault-management.md) |

## Conventions

- One file per decision, named `ADR-NNNN-<kebab-slug>.md` with a four-digit zero-padded ID.
- Format: **Status / Date → Context → Decision → Alternatives considered → Consequences → Revisit when**.
- Status field: `Proposed` while the decision is still being implemented, `Accepted` once the implementing change merges, `Superseded by ADR-MMMM` when replaced, or `Deprecated`.
- ADRs are immutable history once accepted, except for trivial typo fixes. A change to a previously-accepted decision lands as a **new** ADR that supersedes the prior one.
- An ADR records a *settled* decision. It is self-contained: it states the design choice and its reasoning directly, without depending on transient planning artifacts.
