# Teams & agents

> How the **dev teams** (build the plugin) and the **runtime agents** (run inside the installed
> plugin) work. Authority: [`docs/teams.md`](../teams.md), [`agents/`](../../agents/),
> [`docs/brainstorm/`](../brainstorm/README.md), [`.claude/teams/wiki-dev/`].

## Two dev teams — ideate, then build

```mermaid
graph LR
    subgraph BS["Brainstorm team (docs/brainstorm/)"]
        pm["product-manager<br/>(facilitator)"]
        arc["architect"]
        roles["+ 9 personas<br/>ontology · authoring · skeptic<br/>grill-me · users · config"]
    end
    roadmap["Roadmap proposal<br/>(docs/plan/ or tmp/)"]
    subgraph DEV["Engineering team (.claude/teams/wiki-dev/)"]
        mgr["wiki-dev-manager<br/>(entry)"]
        lanes["4 lanes A–D<br/>retrieval · schema · ingest · ux"]
        qa["QA functional + adversarial"]
    end

    pm --> roadmap
    arc --> roadmap
    roles --> roadmap
    roadmap ==>|handover| mgr
    mgr --> lanes
    lanes --> qa
    qa -->|gate-green| ship["Shipped change + ADR"]
```

The brainstorm team is **read-only / proposal-only**; the engineering team **implements** behind
the test gates. The handoff artifact is a roadmap — see this very effort:
[`tmp/SOFTWARE-3-0-plan.md`](../../tmp/SOFTWARE-3-0-plan.md).

## Brainstorm protocol — three rounds

```mermaid
graph LR
    d["Round 1<br/>Divergence<br/>(isolated IDEAs)"] --> c["Round 2<br/>Cross-critique<br/>(Skeptic + Grill-Me)"]
    c --> v["Round 3<br/>Convergence<br/>(PM + Architect)"]
    v --> out["Phased roadmap<br/>+ decisions log + open questions"]
```

## Engineering handoff chain — every item

```mermaid
graph LR
    pm2["PM<br/>acceptance spec"] --> ar2["Architect<br/>design verdict"]
    ar2 --> eng["Lane engineer<br/>TDD"]
    eng --> qf["QA-functional<br/>Tier 0–1, coverage"]
    qf --> qa2["QA-adversarial<br/>Tier 2–4"]
    qa2 --> acc["PM acceptance"]
    acc --> intg["Manager integrates<br/>+ final gate"]
```

## Runtime agents — 7 orchestrated executors

These ship in the plugin and run inside a user's session. The **orchestrator** is the entry that
probes vault state and dispatches.

```mermaid
graph TB
    orch["orchestrator-agent<br/>(entry — probes & dispatches)"]
    orch --> onb["onboarding-agent"]
    orch --> ing["ingest-agent"]
    orch --> cur["curator-agent"]
    orch --> ana["analyst-agent"]
    orch --> pol["polish-agent"]
    orch --> mnt["maintenance-agent"]

    onb -.->|init / scaffold| eng["engine.sh"]
    ing -.->|collect & organize| eng
    cur -.->|lint & fix| eng
    ana -.->|query & synthesize| eng
    pol -.->|markdown export| eng
    mnt -.->|heartbeat & heal| eng
```

| Agent | Drives skills | Job |
| --- | --- | --- |
| orchestrator | (dispatch) | Probe vault, route to the right agent |
| onboarding | init, onboarding | First-run scaffold + orient |
| ingest | ingest, draft, review | Sources → typed wiki pages |
| curator | lint, fix | Keep the vault well-formed |
| analyst | query, search, synthesize | Answer + cross-topic synthesis |
| polish | markdown, index | Export + MOC upkeep |
| maintenance | status, heartbeat | Staleness, self-heal, backlog |

**Dev teams vs runtime agents are different populations:** `wiki-dev-*` and the brainstorm
personas live in `.claude/` and `docs/` and never ship; the 7 `claude-wiki-pages-*-agent` files in
`agents/` are runtime context loaded on install (per [`CLAUDE.md`](../../CLAUDE.md)).
