# ADR-0013: Design-drift gate — `validate-docs.sh` Check 5 (mermaid/link/hook/count/parity)

- **Status:** Accepted (design accepted; Lane A+D implements P0.3 / P1.4 to this contract)
- **Date:** 2026-06-05
- **SPEC anchor:** Brief §2 goal 2 (up-to-date, grounded, DRY), §5 (DRY single-sourcing, KISS/YAGNI,
  canonical vocabulary), §6 (one mechanism per job); plan `tmp/SOFTWARE-3-0-plan.md` P0.3/P1.4,
  decisions D8, D10, D11, D12, and OQ-11
- **Supersedes proposal:** `tmp/SOFTWARE-3-0-plan.md` (P0.3 / I2.1, P1.4 / I2.2) — this ADR records the
  signed-off gate design before any code is written

## Context

The Software-3.0 work introduces a root dual-entry router (`SOFTWARE-3-0.md`) and a
`docs/design/` mermaid diagram tree (D8). "Equally usable by humans and agents" and "kept accurate"
are only real if **enforced** (D6): a gate must fail the build when a diagram names a path that no
longer exists, a link dies, a depicted hook chain drifts from `hooks/hooks.json`, a stated count
drifts from reality, or a router row offers only one on-ramp.

The plan proposed up to six separate doc/diagram checks plus a standalone router-parity gate. The
team rejected that surface: **D10** consolidates the six into **one new `validate-docs.sh` Check 5**,
and **D11** folds the router-parity check (P1.4) **into that same Check 5** rather than shipping a
separate awk gate file. **D12** keeps multi-vault confinement out of this gate entirely (it extends
`tests/gates/gate-11-firewall-parity.sh` fixtures, a different concern). This is the one-mechanism
discipline (Brief §6): the project already has exactly one term/doc gate — `scripts/validate-docs.sh`,
wrapped by `tests/gates/gate-04-glossary.sh` — and Check 5 extends it rather than forking a second
doc-validation entry point.

`scripts/validate-docs.sh` today has internal checks 0, 0b, 1, 2, 3, 4 (no Check 5 exists). The
strict toolchain constraint is **Tier-0**: **grep/awk/bash only — no Bun, no mermaid parser, no new
runtime dependency**. Check 5 must reuse the established `git ls-files | while read` loop and
`exempt_from` helper that Checks 0–4 already use (`scripts/validate-docs.sh:122`, `:241`).

The dominant design risk, established by reading the actual diagrams, is **false positives**. Mermaid
node labels in this tree are overwhelmingly human prose — emoji, `<br/>` line breaks, `·` separators,
and parenthetical descriptions (e.g. `human["👤 Person<br/>(Obsidian / terminal)"]`,
`lanes["4 lanes A–D<br/>retrieval · schema · ingest · ux"]`). Only a minority of labels embed a real
path token (`hooks/hooks.json`, `engine.sh`, `commands/`, `docs/brainstorm/`). A naive "every node
label must name a real path" rule would flag almost every node and make the gate worse than useless.
The gate must therefore ground **path-shaped tokens it can recognize**, not whole label prose, and
must honor a `[speculative]` escape hatch — which already appears as block-level prose in the tree
(`docs/design/README.md:41`, `docs/design/02-component-design.md:89`).

## Decision

Add **Check 5 — design-drift** to `scripts/validate-docs.sh`, scanning `docs/design/*.md` plus the
root `SOFTWARE-3-0.md` (discovered via `git ls-files`, exactly like Checks 0–4). Check 5 performs six
assertions, of which one emits a non-blocking WARN and the rest FAIL the build (raising `VIOLATIONS`,
exit 1). It is grep/awk/bash only, with no mermaid parser. The behavioral contract — extraction
rules, the "real target" definition, the `[speculative]` exemption, wired-hook coverage, the WARN,
count verification, the Authority check, and router-parity table parsing — is specified normatively in the
companion design contract delivered with this ADR; the load-bearing decisions are recorded below.

**5a — Mermaid node grounding (FAIL).** Inside each ```` ```mermaid ```` fence (tracked with an
in-fence awk flag, the Check-4 loop style), extract only **path-shaped tokens** from node-label text:
tokens matching a directory form (`<seg>/…`, ending in `/`) or a repo-file form
(`<name>.{sh,ts,json,md,yml,yaml}`). Each extracted token must resolve to a real file or directory in
the repo (a `-e` test against the token, or its basename matched against the known
hook/script/skill/agent inventory for bare script names like `firewall.sh`). Prose labels with **no
path-shaped token contribute nothing** to grounding — that is the false-positive bound. The
`[speculative]` exemption is **whole-document-scoped**: a design doc carrying a `[speculative]` marker
disables **only** 5a node-grounding for that entire file (a speculative doc PASSES 5a even if a token
is ungroundable), and **disables nothing else** — 5b link-resolution, 5d counts, 5e Authority
presence, and 5f router-parity still fire on a speculative doc. Finer-grained fence-level or node-level
`[speculative]` scoping is **deferred** (not implemented); the marker already appears as block-level
prose in the tree (`docs/design/README.md:41`, `docs/design/02-component-design.md:89`), and
whole-document scope is the simplest faithful match to that convention.

**5b — Link resolution (FAIL).** Every markdown link with a repo-relative target (`](./…)` or
`](../…)`, anchors stripped) in the scanned files must resolve to an existing path, resolved relative
to the linking file's directory. Targets under gitignored trees (e.g. `tmp/`) are treated as
unresolvable-by-policy and exempted (they cannot be CI ground truth); external `http(s):` and
`mailto:` links are out of scope (lychee covers those in a separate gate).

**5c — Wired-hook coverage (FAIL) + PreToolUse-order (WARN), per OQ-11.** Build the set of
hook/script names wired in `hooks/hooks.json` (Set B) and the set of bare `*.sh` tokens depicted in
the design docs' mermaid fences (Set A, extracted in 5a). The rule is **one-directional**: every
**wired hook script must be depicted** in a design-doc mermaid fence — `Set B − Set A` non-empty
FAILS (a wired hook that no diagram shows is drift). The reverse is **deliberately not checked**: a
script depicted in a diagram but not wired in `hooks.json` does **not** fail, because the design docs
legitimately depict scripts that are not hooks — `engine.sh` and `resolve-vault.sh` are real scripts
shown in the diagrams but are never wired as hooks. True bidirectional set-equality would false-positive
on the real repo, so the gate enforces coverage of the wired set only, not equality. Per **OQ-11**, a
`PreToolUse` **ordering** mismatch between a diagram and `hooks.json` is a **non-blocking WARN**, not a
failure — the security boundary is the firewall twins and `tests/gates/gate-11-firewall-parity.sh`,
not diagram order, so a mis-order is a doc bug, not a regression. (Cite the firewall gate by full name:
a separate `gate-11-eslint.sh` also exists.)

**5d — `06-feature-relations` count verification (FAIL).** The counts asserted in
`docs/design/06-feature-relations.md` (agents, skills, commands; hook events) must equal reality
computed from `.claude-plugin/plugin.json` / `ls`-style counts (`agents/*.md`, `skills/*/`,
`commands/*.md`, and the `hooks.json` event-key count). A wrong count FAILS.

**5e — Authority presence (FAIL).** Each scanned design doc must carry **≥1 resolvable Authority
link/page** (a link to an authority surface — `CLAUDE.md`, `docs/architecture.md`,
`docs/vault-example/CLAUDE.md`, `hooks/hooks.json`, `.claude-plugin/plugin.json`, or `docs/adr/`).
A doc with zero resolvable Authority links FAILS — this keeps every diagram tethered to a
single-source-of-truth surface (Brief §6).

**5f — Router parity (FAIL), folding in P1.4 / D11.** In `SOFTWARE-3-0.md`, every row of the "Six
surfaces" table (and any future router rows) must have a **non-empty human cell AND a non-empty agent
cell**, with **every link in each cell resolving** (reusing 5b). A single-ramped row FAILS, and the
message **names the surface** (the row's first cell). Table rows are split with awk on the `|`
delimiter; the header and the `--- | ---` separator row are skipped; a cell is "empty" if it has no
non-whitespace, non-markup content. This is folded into Check 5, **not** a separate gate file (D11).

**Failure-message shape.** Every FAIL uses the existing `err "<one-line reason naming file + token>"`
helper and increments `VIOLATIONS`; the offending file/line is shown with the existing
`sed 's/^/    /'` indent. WARNs print a distinct `WARN:` line (yellow), name the file and the order
delta, and **do not** touch `VIOLATIONS` (the build stays green). The Summary block is unchanged.

**False-positive bounding rules (load-bearing).**

1. **Ground tokens, not prose.** Only path-shaped tokens (dir form or known file extension) are
   grounding candidates; emoji/`<br/>`/`·`/parenthetical prose is ignored. This is what keeps the gate
   precise on a tree whose labels are mostly descriptions.
2. **`[speculative]` always passes 5a (whole-document scope).** A design doc marked `[speculative]` is
   exempt from 5a node-grounding for the whole file — the plan's explicit acceptance case ("a
   `[speculative]` node passes"). It is exempt from **5a only**; 5b/5d/5e/5f still fire.
3. **Gitignored targets are exempt (5b/5f).** A link into `tmp/` (gitignored) cannot be CI ground
   truth and must not FAIL; it is treated as out-of-policy, not broken.
4. **Bare script basenames resolve against the inventory.** `firewall.sh` in a label resolves via the
   `scripts/` inventory, not only a literal repo-root `-e` test, so legitimate short references pass.
5. **Coverage-of-wired, not equality, for hooks (5c/OQ-11).** Only a wired hook missing from the
   diagrams FAILS (`Set B − Set A`); a depicted-but-unwired script (e.g. `engine.sh`,
   `resolve-vault.sh`) does **not** FAIL, since not every depicted script is a hook. Ordering deltas
   WARN; only wired-hook-coverage gaps FAIL.

## Alternatives considered

- **Six separate doc/diagram gate files + a standalone router-parity awk gate.** Rejected (D10/D11) —
  six gates for one concern is the opposite of one-mechanism (Brief §6); Check 5 inside the existing
  `validate-docs.sh` is the minimal surface. Router parity folds into Check 5 rather than shipping a
  seventh file.
- **A real mermaid parser (e.g. a Bun/Node mermaid lib) to extract the graph.** Rejected — it
  violates the Tier-0 grep/awk/no-Bun constraint and adds a runtime dependency to a static gate. A
  bounded grep/awk token-extractor is sufficient because the gate grounds path-shaped tokens, not the
  diagram's full semantics.
- **Grounding every node label as a whole string.** Rejected — the tree's labels are prose
  (`👤 Person`, `4 lanes A–D · retrieval · …`); whole-label grounding would flag nearly every node.
  Token-level grounding bounded to path shapes is the precision fix.
- **Making `PreToolUse` order a FAIL.** Rejected (OQ-11) — the security boundary is the firewall twins
  and `tests/gates/gate-11-firewall-parity.sh`, not diagram order. A mis-ordered diagram is a doc bug;
  failing CI on it would be noise that pressures authors to omit the chain rather than depict it.
- **A new multi-vault drift check in this gate.** Out of scope (D12) — cross-vault confinement extends
  `gate-11-firewall-parity.sh` fixtures, a separate mechanism with a separate threat model.

## Consequences

**Positive.**

- One gate, one concern: doc/diagram drift is caught in the single existing term/doc gate
  (`validate-docs.sh` / `gate-04-glossary.sh`), with no new gate file and no new runtime dependency.
- The gate is precise, not noisy: it grounds path-shaped tokens and honors `[speculative]`, so it
  catches a renamed script or a dead link without flagging descriptive prose.
- "Equally usable" becomes falsifiable (D6): a single-ramped router row fails CI by name.
- Wired-hook coverage (5c) means a wired hook cannot silently drop out of the diagrams; order stays a
  WARN so authors are not punished for documenting a chain, and depicting a non-hook script (e.g.
  `engine.sh`) never false-fails.

**Negative.**

- **Path-shaped-token grounding is heuristic.** A genuinely missing path expressed in pure prose (no
  path token) is not caught by 5a. Accepted: 5b (links), 5c (hooks), 5d (counts), 5e (Authority) cover
  the load-bearing surfaces, and prose-only claims are out of any static gate's reach.
- **The `[speculative]` escape hatch can be abused** to silence a real drift. Accepted and bounded:
  the marker is visible in the rendered doc and in review, and review (not the gate) is the backstop
  for "is this legitimately speculative".
- **awk table parsing is format-sensitive.** A malformed markdown table could mis-split; mitigated by
  markdownlint (gate-10) keeping tables well-formed upstream and by skipping the header/separator rows
  explicitly.

## Revisit when

- A diagram needs to assert a relationship the path-token heuristic cannot ground (e.g. an edge
  semantic). Outcome: extend Check 5's extractor with a new bounded rule and amend this ADR — do not
  reach for a mermaid parser or a second gate.
- The router grows beyond the "Six surfaces" table to multiple router tables. Outcome: generalize 5f's
  table selector; the parity rule (human cell ∧ agent cell, links resolve) is unchanged.
- Phase 3 lands `engine capabilities --json` (a Bun-gated tier). Outcome: verb/capability drift is a
  **separate** Bun-tier contract test (plan P3.4), never folded into this Tier-0 grep/awk gate.

## Glossary note (for P0.2 / Lane D)

This ADR uses `design-drift gate`, `node grounding`, `parity gate`, `dual entry point` /
`dual-entry router`, and `[speculative]` (as a marker). Per glossary-first (Brief §5), these belong in
`docs/GLOSSARY.md` **before the prose/gate name ships** — they are in the plan's glossary-debt list
(`tmp/SOFTWARE-3-0-plan.md`, "Glossary debt"). Lane D owns those rows in P0.2; this ADR does **not**
add them.
