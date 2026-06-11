# L3 — Sequences

> Step-by-step flows. These show *when* the hooks fire and *where* the gates sit. Authority:
> [`hooks/hooks.json`](../../hooks/hooks.json), [`skills/ingest`](../../skills/ingest/SKILL.md),
> [`skills/draft`](../../skills/draft/SKILL.md), [`skills/review`](../../skills/review/SKILL.md).

## Session start — resolve the vault, orient both readers

```mermaid
sequenceDiagram
    autonumber
    participant CC as Claude Code
    participant H as SessionStart hook
    participant R as resolve-vault.sh
    participant V as Vault CLAUDE.md
    CC->>H: session begins → session-start.sh
    H->>R: resolve vault (4-tier)
    R-->>H: vault path
    H-->>CC: emit vault path + on-ramp pointer
    Note over CC,V: OQ-1: runtime on-ramp is the vault CLAUDE.md<br/>(SOFTWARE-3-0.md is the dev-time entry, referenced by text)
    CC->>V: read schema + MOC pointer
```

## Ingest write-path — the hook cluster in action

A person or an agent ingests a source. Every Write/Edit passes the fail-closed `PreToolUse`
cluster *before* it lands, and `PostToolUse` summarizes after.

```mermaid
sequenceDiagram
    autonumber
    participant U as Person / Agent
    participant ING as ingest skill
    participant ENG as engine.sh
    participant FW as PreToolUse cluster
    participant VAULT as Vault
    participant POST as PostToolUse

    U->>ING: ingest a source
    ING->>ENG: classify + draft page (deterministic)
    ING->>FW: Write page
    activate FW
    Note over FW: order per hooks.json
    FW->>FW: 1 firewall.sh (confine to vault)
    FW->>FW: 2 validate-frontmatter.sh
    FW->>FW: 3 check-wikilinks.sh
    FW->>FW: 4 protect-raw.sh (raw/ immutable)
    FW->>FW: 5 validate-attachments.sh
    alt any check fails
        FW-->>U: BLOCK write (fail-closed)
    else all pass
        FW->>VAULT: write lands
    end
    deactivate FW
    VAULT->>POST: post-wiki-write.sh + post-ingest-summary.sh
    POST-->>U: summary + log entry
```

## Agent write-back — symmetry with a human approval gate (OQ-6)

An agent authors like a human: draft to `_proposed/`, then a **human approves** promotion. The
firewall blocks any attempt to write `wiki/` directly.

```mermaid
sequenceDiagram
    autonumber
    participant AG as Agent
    participant DR as draft skill
    participant PROP as _proposed/
    participant FW as firewall.sh
    participant WIKI as wiki/
    participant HU as Human reviewer
    participant RV as review skill

    AG->>DR: author new page
    DR->>PROP: write draft (allowed)
    AG--xFW: direct write to wiki/
    FW-->>AG: BLOCKED (must go through gate)
    HU->>RV: review _proposed/ entry
    alt approved
        RV->>WIKI: promote (git-checkpointed)
    else rejected
        RV->>PROP: leave/annotate; no promotion
    end
    Note over AG,WIKI: OQ-6 decision: human-in-the-loop is required.<br/>No agent self-approval on the default path.
```

## Durable memory — Stop / SessionEnd

```mermaid
sequenceDiagram
    autonumber
    participant CC as Claude Code
    participant SM as session-memory.sh
    participant RAW as raw/agent-sessions/
    CC->>SM: Stop / SessionEnd
    alt CLAUDE_WIKI_PAGES_SESSION_SCRATCH set
        SM->>RAW: write source_type: agent-session (idempotent on session id)
        Note over SM,RAW: ADR-0010 carve-out. Does NOT promote to wiki/<br/>— next /claude-wiki-pages:wiki or maintenance ingests it.
    else scratch absent
        SM-->>CC: no-op (lazy)
    end
```
