# L0–L1 — System context & layers

> Zoom out. Who uses claude-wiki-pages, what it touches, and the big moving parts.
> Authority: [`docs/architecture.md`](../architecture.md). This page visualizes it; it does not
> restate it.

## L0 — System context

The system has two co-equal first-class users — a **person** (in Obsidian or a terminal) and an
**agent** (Claude, or a local model). Both reach the same surfaces through the
[`SOFTWARE-3-0.md`](../../SOFTWARE-3-0.md) dual entry point.

```mermaid
graph TB
    human["👤 Person<br/>(Obsidian / terminal)"]
    agent["🤖 Agent<br/>(Claude / local LLM)"]
    contributor["🛠️ Contributor<br/>(works on the plugin)"]

    subgraph sys["claude-wiki-pages"]
        entry["SOFTWARE-3-0.md<br/>dual entry point"]
        vault[("Vault<br/>raw/ · wiki/ · _proposed/")]
    end

    obsidian["Obsidian app<br/>(render + graph)"]
    git["git<br/>(history · provenance)"]
    ollama["Ollama / LM Studio<br/>(optional, local generation)"]

    human -->|reads, runs /claude-wiki-pages:wiki| entry
    agent -->|reads on-ramp, calls engine| entry
    contributor -->|builds, reads design| entry
    entry --> vault
    vault --> obsidian
    vault --> git
    sys -.optional, no RAG.-> ollama
```

**Key invariant:** the agent and the person enter the *same* system through the *same* surfaces.
There is no agent-only side door. External systems are thin — Obsidian renders, git records,
Ollama (optional) only *generates* text; none of them does retrieval (no embeddings).

## L1 — The four-layer stack

Zoom in one step: the system is four layers plus a deterministic engine and a passive vault.

```mermaid
graph TB
    subgraph L4["Layer 4 — Orchestration"]
        cmd["commands/<br/>wiki · onboarding · doctor"]
        hooks["hooks/hooks.json<br/>7 events"]
        scripts["scripts/<br/>~30 bash scripts"]
        rules["rules/<br/>path-scoped rules"]
    end
    subgraph L3["Layer 3 — Agents"]
        agents["agents/<br/>7 orchestrated executors"]
    end
    subgraph L2["Layer 2 — Skills"]
        actions["12 action skills<br/>ingest · query · search · …"]
        teaching["5 agent-teaching skills<br/>engine-api · maintain-contract · …"]
    end
    subgraph L1["Layer 1 — Data"]
        data[("Vault<br/>schema in vault CLAUDE.md")]
    end

    engine["scripts/engine.sh →<br/>Bun TS engine<br/>(deterministic)"]

    cmd --> agents
    hooks --> scripts
    agents --> actions
    actions --> teaching
    actions --> engine
    teaching -. documents .-> engine
    engine --> data
    scripts --> data
    rules -. constrain .-> agents
```

**Reading guide.** Orchestration (Layer 4) dispatches; Agents (Layer 3) execute multi-step work;
Skills (Layer 2) are single-responsibility capabilities — action skills *do*, teaching skills
*explain the tool surface to agents*; Data (Layer 1) is passive and schema-governed. The **engine**
owns determinism: ranking and verification are rules, never model guesses, and never embeddings.

See [02-component-design.md](./02-component-design.md) to zoom into each layer.
