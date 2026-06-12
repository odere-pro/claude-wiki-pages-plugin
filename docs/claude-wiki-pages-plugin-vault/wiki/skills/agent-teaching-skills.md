---
title: "Agent Teaching Skills"
type: concept
aliases: ["Agent Teaching Skills", "agent teaching skills", "teaching skills"]
parent: "[[Skill Catalog]]"
path: "skills"
sources: ["[[architecture]]"]
related: ["[[Skill Catalog]]", "[[Action Skills]]", "[[Agent Roles]]"]
tags: [skills, teaching, agents, layer2]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 0.9
---

# Agent Teaching Skills

The 5 **agent-teaching skills** are reference documents written for agents to internalize, not for end-users to invoke. They capture deep shared knowledge that agents need to perform correctly.

## The 5 Agent Teaching Skills

| Skill | What it teaches |
| --- | --- |
| `engine-api` | The Bun CLI's ten verified verbs, flag contract, and output schema. Agents call the engine correctly because they have this reference. |
| `maintain-contract` | The shared invariants that all agents must uphold: NO-RAG, write confinement, raw immutability, `_proposed/` gate for judgment calls. |
| `analyst-modes` | The five query modes (Query, Dashboard, Document Compile, Extract, Challenge), mode-detection from prompt verbs, citation protocol, and answer verification (ADR-0019). |
| `curator-fixes` | The classification of curator repairs: self-heal (unambiguous) vs. judgment (stage to `_proposed/`). Decision tree for each repair type. |
| `ingest-pipeline` | The 13-step ingest contract from "human drops source in raw/" through "SubagentStop gate verifies output". Two-pass alias-aware dedup. Source-quote verbatim rule. |

## Why Teaching Skills Exist

Without teaching skills, agents regenerate their understanding of shared mechanisms from general training. Teaching skills pin the shared mechanisms: agents that read `maintain-contract` before executing will enforce the same invariants regardless of how the underlying model weights change between versions.

## Authoring Convention

Agent teaching skills are written in prescriptive second-person ("The ingest agent must…", "You must verify…") so that an agent reading the skill file understands the content as its own operating contract, not as user documentation.
