---
title: "Software 3.0"
type: concept
aliases: ["Software 3.0", "software 3.0", "Software3.0", "agent-first design", "human-agent symmetry"]
parent: "[[Decisions]]"
path: "decisions"
sources: ["[[ADR-0013: Design-Drift Gate]]", "[[Design README]]"]
related: ["[[Parity Gate]]", "[[Node Grounding]]", "[[Design-Drift Gate]]", "[[Four-Layer Stack]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "architecture", "design-posture"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Software 3.0

> [!summary]
> Software 3.0 is the design posture of the claude-wiki-pages project: every project surface — every command, every script, every API endpoint — must be equally usable by humans and autonomous agents. The posture is embodied in the dual-entry router table and enforced by the [[Parity Gate]] in CI. It motivates the four-layer stack's separation of concerns and the preference for deterministic, auditable mechanisms over implicit or model-dependent ones.

## Definition

The term "Software 3.0" references the evolution of software design from imperative code (1.0) through declarative/functional approaches (2.0) to LLM-augmented systems (3.0) where AI agents are first-class actors alongside humans. In this framing, a well-designed Software 3.0 system is one where agents can operate as effectively as humans, with the same visibility and the same control surface.

For claude-wiki-pages, this manifests as a concrete design rule articulated in ADR-0013:

> **Every project surface must be equally usable by humans and agents.**

"Equally usable" means:
- If a human can perform an operation via a slash command, an agent can perform the same operation via a scriptable equivalent.
- If an agent can query a data structure programmatically, a human can inspect it via a documented command or readable file.
- No operation is agent-only (opaque to humans) or human-only (inaccessible to agents).

## Manifestations in the Plugin

**Dual-entry router table.** Design documents contain a table mapping each surface to its human form and its agent form. The [[Parity Gate]] enforces that neither column is empty. Example pairs: `/claude-wiki-pages:wiki` (human) ↔ `claude-wiki-pages-ingest-agent` (agent), `engine.sh verify` (both).

**Bash-first Layer 4.** The scripts layer is shell-first so hooks are available without Bun. A human debugging a broken install can read and run the same bash scripts the hooks run. [[Shell-TS Parity]] ensures the TypeScript twin agrees with the bash twin.

**`--json` endpoints.** Every engine verb that produces output supports `--json` mode. Agents consume the JSON. Humans can read it directly or pipe to `jq`. Neither form is inferior to the other.

**Readable schema authority.** `vault/CLAUDE.md` is written in English prose that humans read, structured with machine-parseable tables that `validate-frontmatter.sh` parses with grep/awk. A human and an agent can both extract required fields from the same file.

**Gitignored config as cache.** `.obsidian/graph.json` is cache, not state. A human who deletes it loses nothing. An agent that regenerates it produces the identical result deterministically. Neither path requires privileged access.

## Relationship to Four-Layer Stack

The Software 3.0 posture is the "why" behind the [[Four-Layer Stack]]'s separation of concerns. Layer 1 (Data) is human-readable markdown. Layer 2 (Skills) is agent-readable teaching material. Layer 4 (Orchestration) is bash-first so both humans and hook-executing agents can invoke it. The stack is not just an architectural convenience — it is the implementation of Software 3.0.

## Related Concepts

- [[Parity Gate]] — the CI gate that enforces human-agent parity in the dual-entry router table
- [[Node Grounding]] — another Design-Drift Gate check that enforces diagram accuracy for both human readers and agents
- [[Design-Drift Gate]] — the overall gate that enforces Software 3.0 design discipline
- [[Four-Layer Stack]] — the architecture whose structure embodies the Software 3.0 posture
