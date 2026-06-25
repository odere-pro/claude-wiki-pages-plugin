---
title: "Schemas"
type: index
aliases: ["schemas", "Schemas", "config schema", "json schema"]
parent: "[[index|Wiki Index]]"
path: "schemas"
children:
  - "[[plugin-config-schema|Plugin Config Schema]]"
  - "[[config-sections|Config Sections]]"
child_indexes: []
tags: ["schemas", "config", "validation"]
created: 2026-06-25
updated: 2026-06-25
---

# Schemas

The `schemas/` directory ships `config.schema.json` — a closed draft-07 JSON Schema that validates every key the plugin reads from user and project configuration.

## Pages

### Concepts

- [[plugin-config-schema|Plugin Config Schema]] — the draft-07 JSON Schema covering all eight config sections; closed at every level; ships in the npm package
- [[config-sections|Config Sections]] — detailed breakdown of `autoHeal`, `gitCheckpoint`, `firewall`, `maintenance`, `localModel`, and other config blocks with their defaults and enum values

## Subtopics

