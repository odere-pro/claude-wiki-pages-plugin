---
title: "Fail-Closed"
type: concept
aliases: ["Fail-Closed", "fail-closed", "fail closed", "fail-safe", "deny by default"]
parent: "[[Wiki Engine]]"
path: "engine"
sources:
  ["[[ADR-0016: Simultaneous Multi-Vault Management]]", "[[Design: Claude Config and Security]]"]
related:
  ["[[Multi-Vault Registry]]", "[[Active Vault]]", "[[Firewall]]", "[[Local Model Quality Gate]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "architecture", "security", "safety"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Fail-Closed

> [!summary]
> Fail-closed is a safety posture applied throughout the plugin: when an error or ambiguous state is encountered, the system blocks the operation rather than proceeding with a potentially unsafe default. The opposite of fail-open (proceed and hope for the best). Fail-closed is applied to the vault registry, the firewall, the local model allow-list, and the design-drift gate.

## Key Principles

- Unknown state means block, not proceed. A malformed registry, an unapproved model tier, or a cross-vault write all produce a block, never a silent fallback.
- Fail-closed violations are surfaced at detection time (session start for registry issues, write time for firewall issues) — never delayed until the user next notices a problem.
- Every fail-closed error message teaches: a BLOCKED tier message names the missing evaluation; a malformed-registry message identifies the invariant that was violated.
- CI gates (glossary gate, design-drift gate, `verify-ingest.sh`) are fail-closed: they fail the run rather than emitting warnings and continuing.
- The fail-closed posture protects provenance discipline: a silent fallback to an unapproved model or a wrong vault would produce output with no visible trace of the compromise.

## Examples

Registry invariant violated — all writes blocked until repaired:

```
ERROR: settings.json invariant violated: current_vault_path "/path/a" is not in vaults[].
All write operations are blocked. Run `bash scripts/set-vault.sh switch <valid-path>` to restore the registry.
```

Unapproved tier blocked with teaching message:

```
BLOCKED: No approved local model for tier "draft".
To unlock: run the draft-tier golden-set eval against a candidate model and commit the evidence artifact.
See docs/local-models.md for the evaluation procedure.
```

## Definition

A fail-closed system refuses to act when it cannot confirm safety. In the plugin, this means:

- **Unknown state → block.** If the registry is malformed, all writes are blocked until the registry is repaired.
- **Unapproved model → block.** A [[Capability Tier]] with no approved local model is BLOCKED with a teaching message; it is never run with an unapproved model as a silent fallback.
- **Cross-vault write → block.** A write that targets a registered-but-inactive vault is blocked at the firewall layer before `allowPaths` is evaluated.
- **CI gate failure → block.** The design-drift gate and glossary gate fail the CI run rather than emitting a warning and continuing.

## Instances in the Plugin

### Registry (ADR-0016)

The vault registry in `.claude/claude-wiki-pages/settings.json` fails closed on:

1. **Malformed JSON** — `_vaults_read` exits non-zero; all write operations are blocked until the file is repaired.
2. **Invariant violation** — `current_vault_path` not in `vaults[]` → fail-closed. The registry is in an inconsistent state; the system cannot determine which vault is active.
3. **Audit roll-up** — violations are surfaced at session start (read time), not at write time, so the user sees the problem immediately rather than when they next try to write.

### Firewall

The [[Firewall]] enforces fail-closed on two axes:

- **Cross-vault deny** — runs before `allowPaths`; a write to an inactive-but-registered vault is blocked unconditionally.
- **`protect-raw.sh`** — any write to `raw/` (except new files in `raw/agent-sessions/`) is blocked at the hook layer.

### Local Model Allow-List

The `APPROVED_LOCAL_MODELS_BY_TIER` list enforces fail-closed on local model routing. A tier not in the list is BLOCKED, not degraded to a random model. An unapproved model at a BLOCKED tier produces a teaching message naming the missing evaluation, so the user knows exactly what needs to happen to unlock it.

### CI Gates

The Tier-0 and Tier-1 CI gates are fail-closed: a failing gate blocks the commit or merge, never warns and continues. The glossary gate (`validate-docs.sh` Check 1), the design-drift gate (Check 5), and `verify-ingest.sh` all follow this pattern.

## Why Fail-Closed

The plugin's value proposition is provenance discipline: every claim traces to a source. A fail-open system might silently produce plausible-looking output from an unapproved model, or write to the wrong vault, and the user would have no signal that the provenance chain was broken. Fail-closed makes violations visible immediately rather than allowing them to accumulate silently.

## Related Concepts

- [[Multi-Vault Registry]] — the registry component where fail-closed is most visibly applied
- [[Active Vault]] — the vault that is protected by fail-closed cross-vault deny
- [[Firewall]] — the enforcement mechanism that applies fail-closed write confinement
- [[Local Model Quality Gate]] — the gate whose BLOCKED/allow-list enforcement is fail-closed
