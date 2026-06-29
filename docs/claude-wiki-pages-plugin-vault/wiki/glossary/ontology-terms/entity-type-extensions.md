---
title: "entity_type_extensions"
type: concept
aliases: []
parent: "[[ontology-terms|Ontology terms]]"
path: "glossary/ontology-terms"
sources: ["[[docs-glossary|Canonical Glossary]]"]
related: []
tags: ["glossary", "ontology-terms", "terminology"]
created: 2026-06-26
updated: 2026-06-26
update_count: 1
status: active
confidence: 0.9
---

# entity_type_extensions

## Definition

The vault-owner-controlled extension list that may add values to the `entity_type` enum beyond the closed core. Only `entity_type` is vault-extensible (Decision D15 of `tmp/SOFTWARE-3-0-plan.md`); predicates and the page-type enum stay closed-core and cannot be extended per vault. Defined in `ontology-profile-v1`.

## Key Principles

- The vault-owner-controlled extension list that may add values to the `entity_type` enum beyond the closed core.
- Canonical term in the claude-wiki-pages **Ontology terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `entity_type`
- `tmp/SOFTWARE-3-0-plan.md`
- `ontology-profile-v1`

## Related Concepts

Part of the **Ontology terms** group: ontology, ontology-profile-v1, class, property, predicate, domain, range (ontology), controlled vocabulary, structured authoring, single-sourcing, modular content, presentation-independence.
