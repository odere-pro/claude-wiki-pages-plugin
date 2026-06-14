# L2 — Component design & patterns

> Zoom into the layers. Components are real files; patterns are the recurring shapes that keep
> the system coherent. Authority: [`docs/architecture.md`](../architecture.md),
> [`hooks/hooks.json`](../../hooks/hooks.json), the schema in
> [`skills/init/template/CLAUDE.md`](../../skills/init/template/CLAUDE.md).

## Orchestration components (Layer 4) — hooks → scripts

Every hook event fans out to deterministic bash scripts. This is the enforcement spine: nothing
reaches the vault un-checked.

```mermaid
graph LR
    subgraph events["hooks/hooks.json events"]
        ss["SessionStart"]
        ups["UserPromptSubmit"]
        pre["PreToolUse<br/>(Write/Edit)"]
        post["PostToolUse<br/>(Write/Edit)"]
        sub["SubagentStop"]
        stop["Stop"]
        send["SessionEnd"]
    end

    ss --> p_ss["session-start.sh<br/>resolve vault, MOC pointer"]
    ups --> p_pg["prompt-guard.sh<br/>untrusted-input guard"]
    pre --> p_fw["firewall.sh<br/>write confinement"]
    pre --> p_vf["validate-frontmatter.sh"]
    pre --> p_wl["check-wikilinks.sh"]
    pre --> p_pr["protect-raw.sh<br/>raw/ immutability"]
    pre --> p_va["validate-attachments.sh"]
    pre --> p_dmi["enforce-dmi.sh"]
    pre --> p_mr["enforce-must-rule.sh"]
    post --> p_pw["post-wiki-write.sh"]
    post --> p_pi["post-ingest-summary.sh"]
    sub --> p_lg["subagent-lint-gate.sh"]
    sub --> p_ig["subagent-ingest-gate.sh"]
    sub --> p_cg["subagent-commit-gate.sh<br/>commit backstop"]
    stop --> p_sm["session-memory.sh"]
    send --> p_sm
```

**Note the fail-closed cluster on `PreToolUse`:** `firewall.sh` (confine writes to the resolved
vault) and `protect-raw.sh` (block edits to `raw/`) run *before* any Write/Edit lands. That is the
security boundary — see [05-claude-config-security.md](./05-claude-config-security.md).

## Skill components (Layer 2) — action vs teaching

```mermaid
graph TB
    subgraph action["Action skills (do work)"]
        direction LR
        a1["init · ingest · query"]
        a2["search · index · synthesize"]
        a3["draft · review · fix · lint · status · markdown"]
    end
    subgraph teach["Agent-teaching skills (explain the surface)"]
        direction LR
        t1["engine-api<br/>tool contract"]
        t2["maintain-contract<br/>safe read/write order"]
        t3["analyst-modes · curator-fixes · ingest-pipeline"]
    end
    engine["engine.sh (Bun)"]

    action -->|call| engine
    teach -.->|document, disable-model-invocation| engine
    a3 -->|draft → _proposed/ → review| gate["_proposed/ review gate"]
```

Action skills change state through the engine and the `_proposed/` gate; **teaching skills carry
`disable-model-invocation: true`** — they are reference material an agent reads, not actions it
fires. This is how an agent learns the tool surface without inlining it.

## Engine commands (the agent's tool surface)

```mermaid
graph LR
    cli["scripts/engine.sh<br/>(thin bridge)"] --> bun["Bun TS engine"]
    bun --> verify["verify"]
    bun --> heal["heal (git-checkpointed)"]
    bun --> search["search (deterministic keyword)"]
    bun --> doctor["doctor"]
    bun --> propose["propose / review"]
    bun --> migrate["migrate (schema)"]
    note["Documented in skills/engine-api;<br/>--json + exit codes = the agent contract"]:::n
    bun -.-> note
    classDef n fill:#f6f6f6,stroke:#bbb,color:#333;
```

> `[speculative]` on exact verb inventory: `engine.sh` is a thin bridge to a Bun TS CLI; some
> verbs are documented in [`skills/engine-api`](../../skills/engine-api/SKILL.md) ahead of the
> shipped shell. The plan's Phase 3 closes this engine-shell-vs-TS gap.

## Patterns this codebase uses

```mermaid
mindmap
  root((Patterns))
    Determinism
      Engine owns ranking & verify
      Same input → same output
      No embeddings / no RAG
    Fail-closed security
      firewall.sh confines writes
      protect-raw.sh keeps raw/ immutable
      Hooks run before the write lands
    Human-in-the-loop gate
      draft → _proposed/ → review
      Promotion needs human approval
    Structural provenance
      sources / source_quotes / derived / confidence
      Every claim traces to raw/
    Single source of truth
      Schema wins conflicts
      ontology-profile-v1 not forked
      Router links, never restates
    Progressive disclosure
      One entry verb: wiki
      doctor / onboarding are secondaries
    Dev-time vs runtime
      Plugin source vs installed context
      Teaching skills vs action skills
```

Each pattern maps to enforcement: determinism → the engine; fail-closed → the `PreToolUse`
cluster; human-in-the-loop → the `_proposed/` gate; provenance → the schema + `validate-frontmatter.sh`;
single-source → `validate-docs.sh`. Patterns here are *checked*, not just aspired to.
