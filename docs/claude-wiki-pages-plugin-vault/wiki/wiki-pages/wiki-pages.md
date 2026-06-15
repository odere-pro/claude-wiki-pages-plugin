---
title: "Wiki Pages"
type: index
aliases: ["Wiki Pages", "wiki-pages", "skills wiki-pages"]
parent: "[[Wiki Index]]"
path: "wiki-pages"
children:
  - "[[Grounded Retrieval]]"
  - "[[Maintain Contract]]"
  - "[[Multi-Vault Operating Rules]]"
  - "[[Synthesis Note]]"
  - "[[Review Gate]]"
  - "[[Entity Distribution Model]]"
  - "[[Folder Note]]"
  - "[[Ingest Pipeline]]"
  - "[[Lint Rules]]"
  - "[[Portable Markdown]]"
  - "[[Query Rules]]"
  - "[[Sources Section]]"
  - "[[Banned Strings]]"
  - "[[Frontmatter Validation]]"
  - "[[Glossary Terms]]"
  - "[[Required Fields]]"
  - "[[Schema Authority]]"
child_indexes: []
tags: ["wiki-pages", "skills", "operating-contract"]
created: 2026-06-13
updated: 2026-06-13
---

# Wiki Pages

> [!summary]
> The `wiki-pages` skill cluster documents the safe operating contract for any agent that drives a claude-wiki-pages vault. The [[Maintain Contract]] defines three hard invariants and three operational phases. [[Grounded Retrieval]] specifies how agents must retrieve facts from the engine before reasoning over them. [[Multi-Vault Operating Rules]] extends the contract to vaults operating in parallel. Together these pages form the single reference any third-party agent needs to integrate correctly with the plugin.

## Overview

The `skills/wiki-pages/` teaching skill is a reference, not an action skill. It does not perform operations — it teaches the protocol that makes operations safe. Any agent, including third-party agents that did not ship with the plugin, can integrate correctly with a claude-wiki-pages vault by following the three documents in this cluster.

The cluster addresses three questions:

1. **In what order must vault operations be performed?** The [[Maintain Contract]] answers this with three invariants and three phases (Ingest, Retrieve, Maintain).
2. **How must the LLM reason over wiki content?** [[Grounded Retrieval]] answers this: engine first, reason second, cite every claim.
3. **What additional rules apply when multiple vaults are active?** [[Multi-Vault Operating Rules]] answers this with five binding rules.

The cluster is grounded in `skills/wiki-pages/SKILL.md` as its single source. All three pages derive from that source.

## Key Pages

[[Maintain Contract]] is the safe-sequencing protocol that governs all vault operations. It rests on three invariants that cannot be violated: (1) ground, then judge, then verify — the engine computes facts, the LLM reasons over them; (2) `raw/` is immutable — the `protect-raw` hook enforces this mechanically; (3) git is the safety net — self-heal is automatic, checkpointed, and `git revert`-able. The contract also defines three operational phases: Ingest (checkpoint → read → write → heal), Retrieve (engine search → reason from pages → cite), and Maintain (verify → heal → judgment fixes → re-verify).

[[Grounded Retrieval]] is the retrieval discipline that implements the first invariant for query operations. Agents use `engine.sh search` or `grep` over `wiki/` to fetch candidate pages, then reason only over those pages — never from training knowledge or memory. Every claim must be cited inline with a wikilink to the source page and appear in a trailing `## Sources` section. If no relevant pages are found, the agent declares a gap rather than hallucinating an answer. The traversal limit is N≤2 hops from seed pages.

[[Multi-Vault Operating Rules]] provides the five extension rules for multi-vault environments: (1) always pass `--target` to engine calls; (2) resolve the active vault before any operation; (3) writes are confined to the active vault by the firewall; (4) never assume the vault from ambient context; (5) surface cross-vault requests rather than silently switching.

## Open Questions

- Should the maintain contract expose a machine-readable checklist (e.g., a YAML manifest of invariant IDs) so automated gates can verify compliance without parsing prose?
- The N≤2 traversal limit in grounded retrieval is a pragmatic bound. As vaults grow to 200+ pages, does this limit need to be configurable per-query or per-vault?
