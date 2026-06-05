# Configuration · security · isolation

> How the plugin's configuration is set up, how writes are secured, and how vaults are isolated.
> Authority: [`scripts/resolve-vault.sh`](../../scripts/resolve-vault.sh),
> [`scripts/firewall.sh`](../../scripts/firewall.sh), [`hooks/hooks.json`](../../hooks/hooks.json),
> [`docs/security.md`](../security.md), [`docs/operations.md`](../operations.md).

## Setup — vault resolution (4-tier, first match wins)

```mermaid
graph TB
    start(["A script needs the vault"]) --> t1{"env<br/>CLAUDE_WIKI_PAGES_VAULT?"}
    t1 -- yes --> use[("Use that vault")]
    t1 -- no --> t2{".claude/claude-wiki-pages/<br/>settings.json<br/>current_vault_path?"}
    t2 -- yes --> use
    t2 -- no --> t3{"Auto-detect:<br/>CLAUDE.md w/ schema_version<br/>+ wiki/ sibling (≤4 levels)?"}
    t3 -- yes --> use
    t3 -- no --> t4["Default: docs/vault"]
    t4 --> use
```

Switching vaults is `bash scripts/set-vault.sh <path>` (writes only `current_vault_path`). This is
the **single config source** for which vault is active — the router links it, never copies it.

## Security — the fail-closed write boundary

Every Write/Edit runs the full `PreToolUse` chain *before* it lands, **in the exact order wired in
[`hooks/hooks.json`](../../hooks/hooks.json)**: firewall (confinement) first, then the validators,
with `raw/` immutability enforced inside the same pre-write chain.

```mermaid
graph TB
    write(["Agent or person: Write/Edit"]) --> fw{"1 · firewall.sh<br/>inside resolved vault?"}
    fw -- no --> block1["BLOCK — write escapes the vault"]
    fw -- yes --> vf{"2 · validate-frontmatter.sh"}
    vf -- fail --> block2["BLOCK — bad frontmatter"]
    vf -- pass --> wl{"3 · check-wikilinks.sh"}
    wl -- fail --> block3["BLOCK — broken wikilink"]
    wl -- pass --> pr{"4 · protect-raw.sh<br/>under raw/?"}
    pr -- yes --> block4["BLOCK — raw/ is immutable"]
    pr -- no --> va{"5 · validate-attachments.sh"}
    va -- fail --> block5["BLOCK — bad attachment"]
    va -- pass --> land[("Write lands in vault")]

    classDef blk fill:#fdecea,stroke:#d33,color:#900;
    class block1,block2,block3,block4,block5 blk;
```

Fail-closed means **a check that errors blocks the write** — the safe default is "no write", not
"write anyway". The `UserPromptSubmit` hook (`prompt-guard.sh`) applies the same posture to
untrusted input *before* it becomes instructions.

## Isolation — dev-time vs runtime, and per-vault confinement

```mermaid
graph LR
    subgraph devtime["Dev-time (plugin source — never user context)"]
        d1["docs/ · tmp/ · tests/"]
        d2[".claude/teams/* · docs/brainstorm/*"]
        d3["root CLAUDE.md · SOFTWARE-3-0.md"]
    end
    subgraph runtime["Runtime (loaded on install)"]
        r1["skills/ · agents/"]
        r2["hooks/hooks.json + scripts/"]
        r3["rules/"]
    end
    subgraph vaults["Vault isolation"]
        vA[("Vault A")]
        vB[("Vault B")]
    end

    runtime -->|writes confined by firewall.sh| vA
    runtime -->|writes confined by firewall.sh| vB
    vA -. cannot write .-x vB
    devtime -. not loaded as session context .-> runtime
```

**Two isolation axes.** (1) *Dev-time vs runtime* — the plugin source (`docs/`, `tmp/`, the dev
teams) is never loaded as a user's session context; only `skills/`, `agents/`, hooks+scripts, and
`rules/` are. (2) *Per-vault* — `firewall.sh` confines every write to the resolved vault, so a
session targeting Vault A cannot write Vault B.

## Multi-vault management & audit roll-up (OQ-8 — in scope)

Per the decision to bring simultaneous multi-vault management in scope, the design **reuses existing
provenance surfaces** for audit — it does *not* add a parallel ledger (Skeptic veto V3). Each vault
keeps its own `wiki/log.md` and ADR-0010 `agent-session` sources; a read-only roll-up aggregates
across the registry under the same firewall confinement.

```mermaid
graph TB
    reg["Vault registry<br/>(resolve-vault.sh)"]
    reg --> vA[("Vault A<br/>wiki/log.md")]
    reg --> vB[("Vault B<br/>wiki/log.md")]
    reg --> vC[("Vault C<br/>wiki/log.md")]
    vA --> roll["Read-only audit roll-up<br/>(aggregates per-vault logs)"]
    vB --> roll
    vC --> roll
    roll --> who["Who / when / which vault / from what source"]
    note["Writes stay confined per vault;<br/>roll-up only READS. No new ledger file."]:::n
    roll -.-> note
    classDef n fill:#f6f6f6,stroke:#bbb,color:#333;
```

> Engineering note: **cross-vault write confinement already exists** —
> [ADR-0009](../adr/ADR-0009-multi-vault-confinement.md) specifies the deny rule and precedence, and
> [`tests/gates/gate-11-firewall-parity.sh`](../../tests/gates/gate-11-firewall-parity.sh) pins it.
> What is *new* (Phase M) is simultaneous **management** of N vaults. Reuse the existing confinement;
> the firewall keeps deriving "other vaults" from the registry (it never re-stores them), and a
> malformed registry must resolve **fail-closed** (zero writable roots), not to all. Tracked in
> [`tmp/SOFTWARE-3-0-plan.md`](../../tmp/SOFTWARE-3-0-plan.md).
