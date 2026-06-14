export const meta = {
  name: 'fix-deferred-followups',
  description:
    "Drives the wiki-dev team to land the two follow-ups deferred in ADR-0027: FU1 promotes the dangling-wikilink scanner into the engine `verify` as a WARN-tier check with a bash twin (gate-05 parity); FU2 clears the lint-structural template-conformance warnings in the dogfood vault by adding the missing ## sections from page content. Manager assigns, PM/architect spec+review, lane engineers implement (TDD), QA verifies, manager integrates. Sequential write phases on one git tree.",
  whenToUse:
    "When the deferred ADR-0027 follow-ups need to be implemented by the wiki-dev team in an isolated worktree, landing one PR.",
  phases: [
    { title: 'Resolve+Baseline', detail: 'assert vault, baseline verify/lint-structural/dangling' },
    { title: 'Spec+Design', detail: 'PM acceptance specs; architect design review + ADR-0028' },
    { title: 'FU1-impl', detail: 'eng-retrieval: verify dangling check + bash twin + tests' },
    { title: 'FU1-QA', detail: 'qa-functional gates; qa-adversarial determinism/ref-vault' },
    { title: 'FU2-impl', detail: 'eng-schema: add missing ## sections from content' },
    { title: 'FU2-QA', detail: 'qa-functional: lint-structural 0, markdownlint, no empty sections' },
    { title: 'Integrate', detail: 'manager: tier0 + tier1 + gates 01/02/05/11/12' },
    { title: 'Measure', detail: 'final verify/lint-structural/dangling, return baseline→final' },
  ],
}

// ── Inputs ───────────────────────────────────────────────────────────────────
let a = args || {}
if (typeof a === 'string') {
  try { a = JSON.parse(a) } catch { a = {} }
}
const REPO = a.repoDir
const VAULT = a.vault
if (!REPO || !VAULT) {
  throw new Error('fix-deferred-followups: args.repoDir and args.vault (absolute paths) are required')
}

// R1: every agent operates ONLY in this worktree. Vault resolution must never drift.
const SCOPE = `You are a wiki-dev team member working in ONE worktree. Before any command, \`cd ${REPO}\`. ` +
  `The repo/worktree is ${REPO}; the dogfood vault is ${VAULT}. Read ` +
  `.claude/teams/wiki-dev/TEAM-BRIEF.md first. Pass \`--target ${VAULT}\` to engine.sh / verify-ingest.sh / ` +
  `lint-structural.sh / graph-quality.sh and export CLAUDE_WIKI_PAGES_VAULT=${VAULT}. node_modules is installed ` +
  `here (bun test / bun run build / tsc work). NEVER touch any path outside ${REPO}, and NEVER edit ` +
  `docs/vault-example/ (it is the shipped, schema-pinned reference).`

const METRIC_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['lintStructuralWarnings', 'verifyErrors', 'verifyWarnings', 'danglingDogfood'],
  properties: {
    lintStructuralWarnings: { type: 'number' },
    verifyErrors: { type: 'number' },
    verifyWarnings: { type: 'number' },
    danglingDogfood: { type: 'number' },
    verifyExampleWarnings: { type: 'number' },
    note: { type: 'string' },
    vaultOk: { type: 'boolean' },
  },
}

const measurePrompt = (extra = '') =>
  `${SCOPE}\nRead-only measurement. Run and capture from JSON output:\n` +
  `  bash ${REPO}/scripts/lint-structural.sh --target ${VAULT}   (count the WARNINGS line) → lintStructuralWarnings\n` +
  `  bash ${REPO}/scripts/engine.sh verify --target ${VAULT} --json → verifyErrors, verifyWarnings\n` +
  `  bash ${REPO}/scripts/graph-quality.sh --target ${VAULT} --json → danglingDogfood (danglingCount)\n` +
  `  bash ${REPO}/scripts/engine.sh verify --target ${REPO}/docs/vault-example --json → verifyExampleWarnings (warnings)\n` +
  `${extra} Create NO files.`

// ── Phase 0 — Resolve + Baseline ─────────────────────────────────────────────
phase('Resolve+Baseline')
const baseline = await agent(
  measurePrompt(
    `Also set vaultOk=true iff the realpath of ${VAULT} is under ${REPO} AND ` +
    `\`git -C ${REPO} rev-parse --show-toplevel\` equals ${REPO}; if not, set vaultOk=false and put the ` +
    `mismatch in note.`),
  { label: 'baseline', phase: 'Resolve+Baseline', model: 'haiku', schema: METRIC_SCHEMA })
if (!baseline || baseline.vaultOk === false) {
  throw new Error(`Phase 0 abort — vault/worktree assertion failed: ${baseline ? baseline.note : 'no result'}`)
}
log(`baseline: lint-structural=${baseline.lintStructuralWarnings} verify=${baseline.verifyErrors}/${baseline.verifyWarnings} ` +
  `dangling=${baseline.danglingDogfood} vault-example-verify-warnings=${baseline.verifyExampleWarnings}`)

// ── Phase 1 — Spec + Design ──────────────────────────────────────────────────
phase('Spec+Design')
await agent(
  `${SCOPE}\nYou are the Product Manager (wiki-dev-pm). Write crisp acceptance specs (Given/When/Then + ` +
  `definition of done) for the two deferred ADR-0027 follow-ups, into docs/ (e.g. a short acceptance note ` +
  `under docs/ or the team folder):\n` +
  `FU1 — a WARN-tier "wikilink-dangling" check is added to engine \`verify\` AND its bash twin ` +
  `\`verify-ingest.sh\`, detecting [[links]] that resolve to no page; gate-05 verify-parity stays green; ` +
  `\`verify\` stays "clean" (clean = 0 errors); a vault with a known dangling link yields a wikilink-dangling ` +
  `WARNING.\n` +
  `FU2 — \`lint-structural.sh --target ${VAULT}\` reports 0 warnings (down from ${baseline.lintStructuralWarnings}); ` +
  `every added \`## section\` carries real content from the page (NO empty stubs); docs/vault-example untouched; ` +
  `engine verify stays 0 errors and graph-quality stays 0 dangling.\n` +
  `Report the specs succinctly.`,
  { label: 'pm-specs', phase: 'Spec+Design', agentType: 'wiki-dev-pm' })
await agent(
  `${SCOPE}\nYou are the Architect (wiki-dev-architect). Design-review FU1 and author ` +
  `docs/adr/ADR-0028-dangling-wikilink-verify-check.md (next free number: 0026=parallel-extract, ` +
  `0027=fill-gaps). Decisions to record and hand to Lane A:\n` +
  `- The check is WARN-tier (severity 'warn', check id 'wikilink-dangling'); it extends the existing ` +
  `Finding/Report model (src/core/report.ts) — NO new output surface.\n` +
  `- ONE shared resolution model, identical in TS and bash: a [[Target]] (strip a trailing |alias and ` +
  `#heading/^block anchor) resolves iff, case-insensitively, it equals some page's filename stem, its ` +
  `title:, or one of its aliases:. Skip BOOKKEEPING pages (index/log/dashboard/manifest/_index) and ` +
  `frontmatter is scanned too. This MIRRORS scripts/graph-quality.sh exactly — read it.\n` +
  `- Counting unit for gate-05 parity: emit ONE finding per (page, distinct-normalized-dangling-target). ` +
  `Bash twin must produce the IDENTICAL warning count as the TS check on docs/vault-example (currently ` +
  `${baseline.verifyExampleWarnings === undefined ? 'N' : baseline.verifyExampleWarnings} verify warnings; the ` +
  `reference vault has ~4 distinct dangling targets like 'wikilink'/'Page Title') and on the fixtures.\n` +
  `- Note the consequence: docs/vault-example verify will gain ~4 WARN findings; that is acceptable (clean ` +
  `unaffected). State whether vault-example should be cleaned (recommend: out of scope; leave as WARN).\n` +
  `Keep the ADR tight. For FU2, add a one-line sign-off that it is a content conformance fix (no schema ` +
  `change), owned by Lane B with Lane D content help. Report the ADR path + the resolution contract.`,
  { label: 'architect-adr', phase: 'Spec+Design', agentType: 'wiki-dev-architect' })

// ── Phase 2 — FU1 implement (Lane A) ─────────────────────────────────────────
phase('FU1-impl')
await agent(
  `${SCOPE}\nYou are Lane A engineer (wiki-dev-eng-retrieval). Implement FU1 per ADR-0028 ` +
  `(docs/adr/ADR-0028-dangling-wikilink-verify-check.md) TEST-DRIVEN:\n` +
  `1. Write a FAILING test first: src/core/wikilink-check.test.ts (colocated) using the test helpers ` +
  `(makeVault/CLEAN_VAULT/DIRTY_VAULT) — a vault with a dangling [[Target]] must yield a ` +
  `{severity:'warn', check:'wikilink-dangling'} finding; an all-resolved vault yields none.\n` +
  `2. Implement src/core/wikilink-check.ts → \`checkDanglingWikilinks(wiki: string): Finding[]\` — pure, ` +
  `immutable, no \`any\`. REUSE: extractWikilinks (src/core/wikilinks.ts), the title/alias/stem resolution + ` +
  `resolveWikilink pattern (src/core/graph.ts), splitFrontmatter (src/core/frontmatter.ts), ` +
  `listMarkdownRecursive + BOOKKEEPING (src/core/fs.ts). Resolution must match scripts/graph-quality.sh ` +
  `exactly (lowercase exact match vs {stem,title,aliases}; scan body+frontmatter; one finding per ` +
  `(file, distinct target)).\n` +
  `3. Compose into src/commands/verify/verify.ts findings array; add a dangling case to verify.test.ts.\n` +
  `4. Bash twin: add the SAME check to scripts/verify-ingest.sh (you may use an inline python3 block like ` +
  `graph-quality.sh does, but it must live in verify-ingest.sh and emit WARN findings that increment the ` +
  `warning count identically). Add a case to tests/scripts/verify-ingest.bats.\n` +
  `5. Add the term "dangling wikilink" to docs/GLOSSARY.md (technical register; do not introduce banned ` +
  `SEO terms like "knowledge base").\n` +
  `6. Run \`bun test src/core/wikilink-check.test.ts src/commands/verify/\`, \`bun run build\`, and ` +
  `\`bash tests/gates/gate-05-verify-parity.sh\` — gate-05 MUST stay green (bash==TS counts on ` +
  `docs/vault-example + fixtures). Iterate until green.\n` +
  `Self-checkpoint via snapshot.sh pre/post (label "FU1: verify dangling-wikilink check"). Report files ` +
  `changed, the gate-05 result, and the new verify warning count on docs/vault-example.`,
  { label: 'fu1-impl', phase: 'FU1-impl', agentType: 'wiki-dev-eng-retrieval' })

// ── Phase 3 — FU1 QA ─────────────────────────────────────────────────────────
phase('FU1-QA')
await agent(
  `${SCOPE}\nYou are QA Functional (wiki-dev-qa-functional). Verify FU1. Run and report each: ` +
  `\`bun test\` (gate-01), \`bunx tsc --noEmit\` (gate-02), \`bash tests/gates/gate-05-verify-parity.sh\`, ` +
  `\`bash tests/gates/gate-12-stale-dist.sh\`, \`bash tests/run-tests.sh tier1\` (bats incl. verify-ingest), ` +
  `and \`bash scripts/validate-docs.sh\` (glossary). Confirm the new check is TDD'd (test existed first / ` +
  `fails when reverted) and coverage on the new module. Confirm a known-dangling vault yields a ` +
  `wikilink-dangling WARNING and verify stays clean (0 errors). PASS or SEND BACK with cited failures.`,
  { label: 'fu1-qa-func', phase: 'FU1-QA', agentType: 'wiki-dev-qa-functional' })
await agent(
  `${SCOPE}\nYou are QA Adversarial (wiki-dev-qa-adversarial). Red-team FU1: (a) DETERMINISM — same vault ` +
  `→ identical findings across two runs; (b) NO RAG/embeddings creep on the retrieval path (the check is ` +
  `pure string resolution, no vectors/fetch); (c) REFERENCE-VAULT impact — confirm docs/vault-example verify ` +
  `is still clean (0 errors) though it now has WARN findings, and that no test asserts it is warning-free in ` +
  `a way that now fails; (d) UNTRUSTED INPUT — a malicious [[target]] (path traversal, huge string) does not ` +
  `escape or crash the check. Report PASS or BLOCK with a reproduction.`,
  { label: 'fu1-qa-adv', phase: 'FU1-QA', agentType: 'wiki-dev-qa-adversarial' })

// ── Phase 4 — FU2 implement (Lane B + D content) ─────────────────────────────
phase('FU2-impl')
await agent(
  `${SCOPE}\nYou are Lane B engineer (wiki-dev-eng-schema), owner of scripts/lint-structural.sh and the ` +
  `S2-structural conformance item. Clear ALL lint-structural warnings in the dogfood vault ` +
  `(${baseline.lintStructuralWarnings} at baseline) WITHOUT changing the script:\n` +
  `1. Run \`bash ${REPO}/scripts/lint-structural.sh --target ${VAULT}\` to list every missing-section / ` +
  `raw-html warning (page + missing section). The required sections per type come from ` +
  `${VAULT}/_templates/<type>.md (read them).\n` +
  `2. For each flagged page, ADD the missing \`## Section\` heading(s) and FILL each from the page's own ` +
  `existing content (reorganize/restate what is already there). HARD RULE: never leave a section empty, ` +
  `never invent facts, never add a [[wikilink]] to a non-existent page. Fix any raw-HTML findings by ` +
  `converting to markdown.\n` +
  `3. Re-run lint-structural until it reports 0 warnings. Keep \`engine verify\` at 0 errors, ` +
  `\`graph-quality\` at 0 dangling, and markdownlint clean ` +
  `(\`npx --no-install markdownlint-cli2 --config .markdownlint-cli2.jsonc "<edited files>"\`).\n` +
  `Do NOT edit docs/vault-example/. Self-checkpoint via snapshot.sh pre/post (label ` +
  `"FU2: template-conformance sections"). Work in batches by folder; report warnings cleared per folder ` +
  `and the final lint-structural count.`,
  { label: 'fu2-impl', phase: 'FU2-impl', agentType: 'wiki-dev-eng-schema' })

// ── Phase 5 — FU2 QA ─────────────────────────────────────────────────────────
phase('FU2-QA')
await agent(
  `${SCOPE}\nYou are QA Functional (wiki-dev-qa-functional). Verify FU2: ` +
  `\`bash ${REPO}/scripts/lint-structural.sh --target ${VAULT}\` reports 0 warnings; ` +
  `markdownlint clean on the vault; \`engine verify --target ${VAULT}\` still 0 errors; ` +
  `\`graph-quality --target ${VAULT}\` still 0 dangling. SPOT-CHECK ~8 edited pages across folders to ` +
  `confirm every added \`## section\` has real, page-relevant content (NO empty stubs, no fabrication). ` +
  `PASS or SEND BACK with the offending pages.`,
  { label: 'fu2-qa', phase: 'FU2-QA', agentType: 'wiki-dev-qa-functional' })

// ── Phase 6 — Integrate + final gate ─────────────────────────────────────────
phase('Integrate')
await agent(
  `${SCOPE}\nYou are the Delivery Lead (wiki-dev-manager). Integrate FU1 + FU2. Run the full gate set and ` +
  `report each result: \`bash tests/run-tests.sh tier0\`, \`bash tests/run-tests.sh tier1\`, and the engine ` +
  `gates \`bash tests/gates/gate-01-engine-tests.sh\`, \`gate-02-typecheck.sh\`, \`gate-05-verify-parity.sh\`, ` +
  `\`gate-11-firewall-parity.sh\`, \`gate-12-stale-dist.sh\`. If anything is dirty/uncommitted, commit it ` +
  `(label "wiki-dev: integrate deferred follow-ups"). Report the final green/red status per gate and any ` +
  `residual items.`,
  { label: 'integrate', phase: 'Integrate', agentType: 'wiki-dev-manager' })

// ── Phase 7 — Measure ────────────────────────────────────────────────────────
phase('Measure')
const final = await agent(
  measurePrompt(
    `Also confirm a vault with a known dangling [[link]] produces a wikilink-dangling WARNING via ` +
    `\`engine.sh verify\` (set note to 'dangling-check-live' if so).`),
  { label: 'measure', phase: 'Measure', model: 'haiku', schema: METRIC_SCHEMA })

const gates = {
  fu2_lintZero: final && final.lintStructuralWarnings === 0,
  verifyClean: final && final.verifyErrors === 0,
  danglingStillZero: final && final.danglingDogfood === 0,
}
const pass = Object.values(gates).every(Boolean)
log(pass
  ? `DONE — lint-structural ${baseline.lintStructuralWarnings}→0, verify clean, dangling 0, dangling check live`
  : `GATES INCOMPLETE ${JSON.stringify(gates)} — final ${JSON.stringify(final)}; inspect the last phase's checkpoint`)

return { repo: REPO, vault: VAULT, baseline, final, gates, pass }
