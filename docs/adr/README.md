# Architecture Decision Records

This directory holds the ADRs for `llm-wiki-stack`. Each ADR captures the **rationale** behind a decision recorded declaratively in [`/SPEC.md`](../../SPEC.md). The SPEC remains the source of truth for _what_ the plugin does; the ADRs explain _why_ a particular path was taken and what alternatives were rejected.

## Index

| ID  | Title                                                                                                       | SPEC anchor       |
| --- | ----------------------------------------------------------------------------------------------------------- | ----------------- |
| A1  | [Four-layer orchestrator](./ADR-0001-four-layer-orchestrator.md)                                            | §5, §9, §11       |
| A2  | [Agent naming convention](./ADR-0002-agent-naming-convention.md)                                            | §11               |
| A3  | [Polish-agent and Obsidian-side experience](./ADR-0003-polish-agent-and-obsidian-side.md)                   | §11               |

## Conventions

- One file per decision, named `ADR-NNNN-<kebab-slug>.md` with a four-digit zero-padded ID.
- Format: **Status / Date / SPEC anchor → Context → Decision → Alternatives considered → Consequences → Revisit when**.
- Status field: `Proposed` while the decision is still being implemented, `Accepted` once the implementing PR merges, `Superseded by ADR-MMMM` when replaced, or `Deprecated`.
- ADRs are immutable history once accepted, except for trivial typo fixes. A change to a previously-accepted decision lands as a **new** ADR that supersedes the prior one.
- ADRs ship in their own `docs(adr)` PR; never bundled with feature commits. The implementing PR references the ADR by ID in its body.

## Why ADRs live here and not in `/SPEC.md`

The SPEC is declarative: it tells the implementer the rule. ADRs are argumentative: they tell the next maintainer the reasoning, the alternatives that were weighed, and the conditions under which the decision should be revisited. Mixing the two would inflate the SPEC and erode the line between "the contract" and "the conversation that produced the contract".

In-flight design work that has not yet converged on a decision belongs in [`docs/plan/`](../plan/), not here. ADRs record decisions; plans record proposals.
