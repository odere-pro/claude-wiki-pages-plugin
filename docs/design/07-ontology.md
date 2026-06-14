# L2 — Ontology classes and predicates

> Zoom: L2 Components
> Perspective: feature-relations
> Authority: [`skills/init/template/CLAUDE.md` — ontology-profile-v1](../../skills/init/template/CLAUDE.md#ontology-profile-ontology-profile-v1).
> This diagram visualizes the closed predicate domain→range table; it does not restate any row.

## Purpose

What page classes exist, and which typed predicates may connect them? Use this diagram to
understand the closed structural graph of the vault's formal ontology before writing wikilinks
or running the graph-traversal primitive (Brief §6).

## Diagram

```mermaid
graph LR
    source["source"]
    entity["entity"]
    concept["concept"]
    topic["topic"]
    project["project"]
    synthesis["synthesis"]
    index["index"]

    entity -->|sources| source
    concept -->|sources| source
    topic -->|sources| source
    project -->|sources| source
    synthesis -->|sources| source

    entity -->|related| entity
    entity -->|related| concept
    entity -->|related| topic
    entity -->|related| project
    concept -->|related| concept
    concept -->|related| topic
    concept -->|related| project
    topic -->|related| topic
    topic -->|related| project
    project -->|related| project

    concept -->|contradicts| concept

    concept -->|supersedes| concept
    topic -->|supersedes| topic
    project -->|supersedes| project
    synthesis -->|supersedes| synthesis

    concept -->|depends_on| concept
    concept -->|depends_on| entity
    topic -->|depends_on| concept
    topic -->|depends_on| entity
    project -->|depends_on| concept
    project -->|depends_on| entity

    topic -->|key_pages| entity
    topic -->|key_pages| concept

    project -->|members| entity
    project -->|members| concept

    synthesis -->|scope| entity
    synthesis -->|scope| concept
    synthesis -->|scope| topic
    synthesis -->|scope| project

    entity -->|parent| index
    concept -->|parent| index
    topic -->|parent| index
    project -->|parent| index
    synthesis -->|parent| index

    index -->|children| entity
    index -->|children| concept
    index -->|children| topic
    index -->|children| project
    index -->|children| synthesis
    index -->|child_indexes| index
```

## Reading guide

- Every node names a real page class from the closed `type` enum in the authority above; `manifest` and `log` are administrative classes with no predicate roles in this profile and are omitted to keep the diagram legible.
- Every edge label names a real predicate from the predicate domain→range table in the authority above; the diagram links rather than restates that table.
- The graph-traversal primitive (Brief §6) walks the provenance/association core — `sources`, `related`, `depends_on` — to N≤2; MOC/descent walks `key_pages`, `members`, `scope`, `children`, `child_indexes`, `parent`; `contradicts` and `supersedes` are available to synthesis.

## See also

- [Predicate domain→range table](../../skills/init/template/CLAUDE.md#ontology-profile-ontology-profile-v1) — the single-sourced authority; read it, do not copy its rows.
- [01-system-context.md](./01-system-context.md) — one level up: the vault as a layer in the four-layer stack.
- [06-feature-relations.md](./06-feature-relations.md) — how the engine, skills, and agents consume this ontology.
- [`docs/architecture.md`](../architecture.md) — the four-layer contract that governs every consumer of this profile.
