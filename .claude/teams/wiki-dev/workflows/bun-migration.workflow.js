export const meta = {
  name: 'bun-migration',
  description: 'Implement the Bash→Bun/TS migration plan one phase at a time via the wiki-dev team, gated and stop-on-red',
  whenToUse: 'Run once per phase (args.phase = 0|1|2|3) to migrate Layer-4 bash into the Bun engine with TDD, dual-run parity, and per-unit commits.',
  phases: [
    { title: 'Author', detail: 'parallel mode: lane specialists author the disjoint core check modules + tests concurrently' },
    { title: 'Implement', detail: 'lane specialist(s) build/integrate the unit: wiring + thin bash wrapper + dual-run proof' },
    { title: 'Verify', detail: 'QA functional (gates/coverage/parity) + QA adversarial (security/fail-closed) with a bounded repair loop' },
    { title: 'Integrate', detail: 'manager: per-unit conventional commit on the worktree branch, then phase-final full gate' },
  ],
}

// ---- args ----
let A = args || {}
if (typeof A === 'string') {
  try {
    A = JSON.parse(A)
  } catch {
    A = {}
  }
}
const PHASE = A.phase === undefined ? 0 : Number(A.phase)
const PLAN = A.planPath || 'tmp/migration-plan.md'
const BRIEF = A.briefPath || '.claude/teams/wiki-dev/TEAM-BRIEF.md'
const BRANCH = A.branch || 'worktree-bun-migration'
const MAX_REPAIR = A.maxRepair === undefined ? 4 : Number(A.maxRepair)

// ---- agent slugs ----
const ENGINE = 'wiki-dev-eng-retrieval' // Lane A: src/cli, src/commands, src/core validators
const SCHEMA = 'wiki-dev-eng-schema' // Lane B: firewall, frontmatter, schema, resolve-vault
const INGEST = 'wiki-dev-eng-ingest' // Lane C: hooks.json, protect-raw, session-start
const UX = 'wiki-dev-eng-ux' // Lane D: docs, GLOSSARY, check-deps, README
const ARCHITECT = 'wiki-dev-architect'
const QA_FUNC = 'wiki-dev-qa-functional'
const QA_ADV = 'wiki-dev-qa-adversarial'
const MANAGER = 'wiki-dev-manager'

// ---- schemas ----
const IMPL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['unit', 'status', 'filesTouched', 'summary'],
  properties: {
    unit: { type: 'string' },
    status: { type: 'string', enum: ['done', 'partial', 'failed', 'skipped'] },
    filesTouched: { type: 'array', items: { type: 'string' } },
    testsAdded: { type: 'array', items: { type: 'string' } },
    dualRun: {
      type: 'object',
      additionalProperties: false,
      properties: {
        ran: { type: 'boolean' },
        bashCount: { type: 'string' },
        engineCount: { type: 'string' },
        match: { type: 'boolean' },
        detail: { type: 'string' },
      },
    },
    bashDeleted: { type: 'boolean', description: 'true only if the migrated bash logic was retired this unit' },
    summary: { type: 'string' },
  },
}

const QA_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['role', 'allGreen', 'gatesRun', 'failures', 'notes'],
  properties: {
    role: { type: 'string' },
    allGreen: { type: 'boolean' },
    gatesRun: { type: 'array', items: { type: 'string' } },
    failures: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['detail'],
        properties: {
          file: { type: 'string' },
          gate: { type: 'string' },
          detail: { type: 'string' },
        },
      },
    },
    notes: { type: 'string' },
  },
}

const COMMIT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['committed', 'commits', 'finalGateGreen', 'remaining', 'summary'],
  properties: {
    committed: { type: 'boolean' },
    commits: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['message'],
        properties: { sha: { type: 'string' }, message: { type: 'string' } },
      },
    },
    finalGateGreen: { type: 'boolean' },
    remaining: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
}

// ---- shared guardrails ----
const GUARDRAILS = [
  `Read ${BRIEF} (your lane contract + §5 non-negotiables) and ${PLAN} (the migration plan) FIRST. Cite paths; do not restate them.`,
  'Honor §5 non-negotiables: NO embeddings, raw immutable, structural provenance, one active vault, glossary-first.',
  'TDD: write the colocated *.test.ts (or tests/scripts/*.bats) FIRST, failing against the gap, then make it pass. Coverage ≥80% on changed code.',
  'No `any` in new TS — narrow untrusted input with `unknown` + type guards (validate hook stdin JSON at the boundary).',
  'Do NOT run `git add` / `git commit` / `git stash` / `snapshot.sh` — the manager commits in the Integrate phase. Do NOT run repo-wide `bun run format` (a past run caused a 326-file churn); format only the files you edit.',
  'Each migrated bash entry becomes a THIN WRAPPER (`exec bash engine.sh <verb> ...`) that preserves every existing caller (CI, skills, fill-gaps). Never break a caller signature.',
  'NEVER delete the bash logic in the same step that changes engine behavior. Dual-run equivalence (counts/verdicts identical on tests/fixtures/reference-vault) must be PROVEN before any bash deletion.',
  'Keep `tsc --noEmit`, `eslint src/**/*.ts`, and `bun build → dist/cli.js` green; rebuild dist when you change engine source.',
]

function implPrompt(unit) {
  return [
    `You are ${unit.agentType} on the wiki-dev team, implementing migration unit "${unit.id}".`,
    '',
    `TASK: ${unit.task}`,
    '',
    unit.files ? `Primary files (read current state before editing):\n${unit.files.map((f) => `- ${f}`).join('\n')}` : '',
    '',
    'GUARDRAILS (hard):',
    ...GUARDRAILS.map((g) => `- ${g}`),
    unit.extra ? `\nUNIT-SPECIFIC:\n${unit.extra}` : '',
    '',
    unit.dualRun
      ? `DUAL-RUN PROOF (required before retiring any bash): run the OLD bash and the NEW engine on tests/fixtures/reference-vault and capture matching counts, e.g.\n  ${unit.dualRun}\nReport bashCount, engineCount, and match in dualRun. Only set bashDeleted:true if match:true AND you retired the bash logic this unit.`
      : '',
    '',
    'Return the structured IMPL result honestly — mark partial/failed if you could not finish, and say why.',
  ]
    .filter(Boolean)
    .join('\n')
}

function repairPrompt(unit, failures) {
  return [
    `You are ${unit.agentType}. QA failed on migration unit "${unit.id}". Repair the root cause (do not weaken/delete a correct test to make it pass; if a test is itself wrong, say so).`,
    `Read ${BRIEF} and ${PLAN} for context. Same guardrails as before (no git/commit, no repo-wide format, thin-wrapper preservation, dual-run before any delete).`,
    '',
    'GATE FAILURES:',
    JSON.stringify(failures, null, 2),
    '',
    'Return the structured IMPL result.',
  ].join('\n')
}

function funcQAPrompt(unit, label) {
  return [
    `You are ${QA_FUNC}. Verify migration unit "${unit.id}" on the current working tree (do NOT commit).`,
    `Read ${BRIEF}. Run the relevant gates: \`bun test\` (changed modules + coverage ≥80%), \`bun run typecheck\`, \`bun run lint\`, \`bun run build\`, and the parity gates that apply: ${unit.gates || 'gate-05-verify-parity, gate-11-eslint, gate-12-stale-dist, plus the unit dual-run'}.`,
    unit.dualRunCheck
      ? `DUAL-RUN PARITY: independently confirm old-bash count == engine count on tests/fixtures/reference-vault for this unit — do NOT trust the engineer's self-report. Command hint: ${unit.dualRunCheck}`
      : '',
    'CRITICAL — distinguish REGRESSIONS from PRE-EXISTING failures. A failure counts against allGreen ONLY if our changes caused it. Known macOS case-insensitive-FS /git-vs-/Git path failures (e.g. maintenance-run.bats, session-start.bats) that ALSO fail on a clean checkout go under notes, NOT failures (git stash, re-run on clean, git stash pop to confirm).',
    'Set allGreen=true iff every regression and every defect in a newly-added test file is resolved. Report gatesRun and each real failure with file + gate + detail.',
  ]
    .filter(Boolean)
    .join('\n')
}

function advQAPrompt(unit, label) {
  return [
    `You are ${QA_ADV}. Adversarially verify migration unit "${unit.id}" — focus on the security/fail-closed contract (do NOT commit).`,
    `Read ${BRIEF} + ${PLAN}. Verify empirically: (1) the hook stdin→stdout block-decision JSON contract is preserved verbatim and exit codes match (enforce-dmi keeps hard exit 2); (2) FAIL-CLOSED — with Bun absent the SECURITY gate emits a block decision, not fail-open; advisory checks fail-open (exit 0); (3) firewall write-confinement still blocks out-of-vault writes; raw/ stays immutable; (4) no untrusted vault/LLM value reaches a shell/awk/bun -e/printf-format sink; (5) gate-13 NO-RAG still holds.`,
    'Run tier2 smoke if a `claude` CLI is present, else note it self-skipped. Count a failure against allGreen ONLY if our changes caused it (pre-existing macOS path failures go under notes).',
    'Report allGreen, checks run, and any residual exploit/regression as a failure with file + detail.',
  ].join('\n')
}

// Fan-out AUTHOR prompt: write ONLY the core module(s) + colocated tests, in
// isolation from the shared wiring files. Run in parallel across units (disjoint
// files), so the long-pole logic+tests are written concurrently.
function authorPrompt(unit) {
  return [
    `You are ${unit.agentType} on the wiki-dev team, AUTHORING (not integrating) the core module for migration unit "${unit.id}".`,
    '',
    `From the unit task below, do ONLY the core-module authoring part: write the new module file(s) and their colocated *.test.ts (and for the export verb, its command dir + CLAUDE.md). TDD: write the failing test first, then the implementation.`,
    '',
    `WRITE ONLY THESE FILES (touch nothing else):`,
    ...(unit.authorFiles || []).map((f) => `- ${f}`),
    '',
    `UNIT TASK (for the logic spec — implement the module, NOT the wiring):`,
    unit.task,
    '',
    'HARD GUARDRAILS:',
    `- Read ${BRIEF} (your lane contract + §5 non-negotiables) and ${PLAN} FIRST. Cite paths; do not restate.`,
    '- DO NOT edit src/commands/lint/lint.ts or src/cli/cli.ts — a serial integrator wires your module afterward. Editing them now races the other parallel authors.',
    '- DO NOT modify any bash script, any other unit\'s module, or any shared primitive (frontmatter.ts, vocabulary.ts, stem.ts, etc.) — READ/REUSE them only. If a primitive genuinely needs a change, STOP and report it instead of editing it.',
    '- DO NOT run git, do NOT run repo-wide `bun run format`, do NOT dual-run or retire any bash yet (that is the integrate step).',
    '- Keep `tsc --noEmit` and `eslint` clean on your new files; export a clean function signature returning Finding[] (no `any`; narrow `unknown`).',
    '- Coverage ≥80% on your new module via the colocated test using the makeVault sandbox.',
    '',
    'Return the structured IMPL result (status, filesTouched, testsAdded). dualRun.ran=false for this author step.',
  ].join('\n')
}

// Serial INTEGRATE prompt: the core module is already authored + unit-tested.
// Wire it in, thin-wrap the bash, prove dual-run, retire the bash logic.
function integratePrompt(unit) {
  return [
    `You are ${unit.agentType}, INTEGRATING the already-authored migration unit "${unit.id}".`,
    `The core module (${(unit.authorFiles || []).join(', ')}) is ALREADY written and unit-tested — verify it exists, do not rewrite it from scratch (fix it only if integration reveals a defect).`,
    '',
    `Now do the wiring + retirement part of the unit task:`,
    `- Wire the module into src/commands/lint/lint.ts via \`--check ${unit.id}\` (for the export verb: into src/cli/cli.ts CAPABILITIES + dispatch + usage instead).`,
    `- Convert the bash entry to a thin \`exec bash engine.sh …\` wrapper preserving every caller signature.`,
    `- Rebuild dist/cli.js.`,
    unit.dualRun ? `- DUAL-RUN PROOF before retiring bash: ${unit.dualRun} Report bashCount/engineCount/match. Only set bashDeleted:true if match:true.` : '',
    '',
    `FULL UNIT TASK (context):`,
    unit.task,
    '',
    'GUARDRAILS:',
    `- Read ${BRIEF} + ${PLAN}. NEVER delete bash in the same step that changes engine behavior — prove dual-run equivalence first.`,
    '- DO NOT run git/commit (the manager commits), DO NOT run repo-wide `bun run format` (format only files you edit).',
    '- Edit lint.ts/cli.ts serially — you are the only integrator running right now, but keep the edit minimal and additive.',
    '',
    'Return the structured IMPL result incl dualRun.',
  ]
    .filter(Boolean)
    .join('\n')
}

const allGreen = (qaArr) => qaArr.length > 0 && qaArr.every((q) => q && q.allGreen)

async function runQA(unit, label) {
  const tasks = [() => agent(funcQAPrompt(unit, label), { agentType: QA_FUNC, schema: QA_SCHEMA, phase: 'Verify', label: `qa-func:${label}` })]
  if (unit.adversarial) {
    tasks.push(() => agent(advQAPrompt(unit, label), { agentType: QA_ADV, schema: QA_SCHEMA, phase: 'Verify', label: `qa-adv:${label}` }))
  }
  return (await parallel(tasks)).filter(Boolean)
}

// implement → verify (bounded repair) → returns { impl, qa, green }
// makeImplPrompt lets the fan-out driver pass integratePrompt (module pre-authored).
async function buildUnit(unit, makeImplPrompt = implPrompt) {
  // Per-unit model override (e.g. Phase 3 security units → opus); omit to inherit
  // the agent definition's model (wiki-dev-eng-* default to sonnet).
  const modelOpt = unit.model ? { model: unit.model } : {}
  phase('Implement')
  let impl = await agent(makeImplPrompt(unit), { agentType: unit.agentType, schema: IMPL_SCHEMA, phase: 'Implement', label: `impl:${unit.id}`, ...modelOpt })

  phase('Verify')
  let qa = await runQA(unit, `${unit.id}:r0`)
  let round = 0
  while (!allGreen(qa) && round < MAX_REPAIR) {
    round++
    const failures = qa.flatMap((q) => (q && q.failures) || [])
    log(`Unit ${unit.id} red (round ${round}); repairing ${failures.length} failure(s)`)
    phase('Implement')
    impl = await agent(repairPrompt(unit, failures), { agentType: unit.agentType, schema: IMPL_SCHEMA, phase: 'Implement', label: `repair:${unit.id}:r${round}`, ...modelOpt })
    phase('Verify')
    qa = await runQA(unit, `${unit.id}:r${round}`)
  }
  return { unit: unit.id, impl, qa, green: allGreen(qa), repairRounds: round }
}

async function commitUnit(unit, built) {
  phase('Integrate')
  return await agent(
    [
      `You are ${MANAGER}. Read ${BRIEF}. Migration unit "${unit.id}" was implemented on branch ${BRANCH}; QA green=${built.green}.`,
      `IMPL: ${JSON.stringify(built.impl)}`,
      `QA: ${JSON.stringify(built.qa)}`,
      '',
      built.green
        ? `QA is green. Make ONE conventional commit for this unit (e.g. "${unit.commit}"), staging ONLY this unit's paths (${(unit.files || []).join(', ')} plus its tests and any thin wrapper). Do not run repo-wide format. Then report the commit and whether the targeted gates stayed green.`
        : `QA is NOT green after ${built.repairRounds} repair round(s). Do NOT commit. List exactly what remains red so a human can finish.`,
      'Return the structured COMMIT result.',
    ].join('\n'),
    { agentType: MANAGER, schema: COMMIT_SCHEMA, phase: 'Integrate', label: `commit:${unit.id}` },
  )
}

// run a list of units sequentially; stop-on-red (do not proceed to a dependent unit on a red foundation)
async function runSequential(units) {
  const results = []
  for (const unit of units) {
    const built = await buildUnit(unit)
    if (!built.green) {
      log(`STOP: unit ${unit.id} could not go green after ${built.repairRounds} repair round(s). Halting phase ${PHASE} so later units do not build on a red foundation.`)
      results.push({ ...built, committed: false, stopped: true })
      return results
    }
    const commit = await commitUnit(unit, built)
    results.push({ ...built, commit })
    if (!commit.committed) {
      log(`STOP: manager declined to commit unit ${unit.id}. Halting.`)
      return results
    }
  }
  return results
}

// FAN-OUT driver (~2x): author all core modules in PARALLEL (disjoint files),
// then INTEGRATE + verify + commit each serially in order (lint.ts/cli.ts are
// shared, so wiring stays serialized). The long-pole logic+tests run concurrently.
async function runFanOut(units) {
  phase('Author')
  log(`Authoring ${units.length} core modules in parallel: ${units.map((u) => u.id).join(', ')}`)
  const authored = await parallel(
    units.map((u) => () => agent(authorPrompt(u), { agentType: u.agentType, schema: IMPL_SCHEMA, phase: 'Author', label: `author:${u.id}`, ...(u.model ? { model: u.model } : {}) })),
  )
  const okCount = authored.filter((a) => a && (a.status === 'done' || a.status === 'partial')).length
  log(`Authored ${okCount}/${units.length} modules; integrating serially (stop-on-red)`)

  const results = []
  for (let i = 0; i < units.length; i++) {
    const unit = units[i]
    // Integrate the pre-authored module (buildUnit drives integrate→verify→repair).
    const built = await buildUnit(unit, integratePrompt)
    if (!built.green) {
      log(`STOP: unit ${unit.id} could not go green after ${built.repairRounds} repair round(s). Halting so later units do not build on a red foundation.`)
      results.push({ ...built, author: authored[i], committed: false, stopped: true })
      return results
    }
    const commit = await commitUnit(unit, built)
    results.push({ ...built, author: authored[i], commit })
    if (!commit.committed) {
      log(`STOP: manager declined to commit unit ${unit.id}. Halting.`)
      return results
    }
  }
  return results
}

// ===================================================================
// UNIT DEFINITIONS
// ===================================================================

// ---- Phase 0 — Foundations (parallel-safe: docs / scripts / src/cli are disjoint) ----
const PHASE0_IMPL = [
  {
    id: 'p0-adr-glossary',
    agentType: ARCHITECT,
    task: 'Record the ratified decisions as an ADR and add the new terms to the glossary FIRST (glossary-first gate-04). Write docs/adr/ADR-00NN-bun-required-and-lint-verb.md recording (a) Bun becomes a REQUIRED, fail-closed dependency — hooks call the engine and security gates BLOCK if Bun is missing (safer than today\'s fail-open), and (b) the new `lint` verb = WARN-tier advisory audit, complementary to `verify` = error-tier integrity. Add `lint` (and any other new coinages this plan introduces) to docs/GLOSSARY.md with a one-line rationale row. Pick the next free ADR number.',
    files: ['docs/adr/', 'docs/GLOSSARY.md'],
    gates: 'gate-04-glossary, gate-10-markdownlint',
  },
  {
    id: 'p0-bun-required',
    agentType: UX,
    task: 'Upgrade the Bun check from a warning to a fail-closed-ready hard check (prereq for Phase 3). In scripts/check-deps.sh and scripts/session-start.sh, make a missing Bun a prominent, actionable "Bun is required — install via …" message. Confirm and document the install path that provisions Bun (so writes are never blocked on a bare box once hooks go fail-closed). No hook is converted to fail-closed in this phase — only the messaging/groundwork.',
    files: ['scripts/check-deps.sh', 'scripts/session-start.sh'],
    gates: 'gate-03-shellcheck, gate-10-markdownlint',
  },
  {
    id: 'p0-lint-scaffold',
    agentType: ENGINE,
    task: 'Scaffold the `lint` verb skeleton with NO behavior change. Create src/commands/lint/lint.ts (returns an empty Report via buildReport), src/commands/lint/CLAUDE.md, and src/commands/lint/lint.test.ts (asserts empty Report + dispatch). Wire `lint` into the CAPABILITIES table + dispatch branch in src/cli/cli.ts and the usage text. Add a `--concurrency <n>` flag (parsed, validated, currently unused). Mirror the composition style of src/commands/verify/verify.ts. Rebuild dist/cli.js.',
    files: ['src/commands/lint/lint.ts', 'src/commands/lint/CLAUDE.md', 'src/cli/cli.ts'],
    gates: 'gate-01-engine-tests, gate-02-typecheck, gate-11-eslint, gate-12-stale-dist',
  },
]

// ---- Phase 1 — read-only validators → one `lint` verb (+ export). SEQUENTIAL (shared lint.ts/cli.ts), ascending blast radius. ----
const REF = 'tests/fixtures/reference-vault'
const PHASE1 = [
  {
    id: 'manifests', agentType: ENGINE, adversarial: false,
    task: `Migrate validate-manifests.sh → \`lint --check manifests\`. New src/core/manifest-check.ts (+ .test.ts) using native JSON.parse (drop jq). Add the check to src/commands/lint/lint.ts selectable via --check manifests. Convert scripts/validate-manifests.sh to a thin wrapper (exec bash engine.sh lint --check manifests --target "$VAULT" "$@"). Prove dual-run, then retire the bash logic.`,
    files: ['src/core/manifest-check.ts', 'src/commands/lint/lint.ts', 'scripts/validate-manifests.sh'],
    dualRun: `bash scripts/validate-manifests.sh on ${REF} vs bun src/cli/cli.ts lint --check manifests --target ${REF} --json — compare error/warn counts.`,
    dualRunCheck: `compare counts from bash scripts/validate-manifests.sh and \`lint --check manifests\` on ${REF}`,
    commit: 'refactor(engine): migrate validate-manifests.sh to lint --check manifests',
  },
  {
    id: 'md-links', agentType: ENGINE,
    task: `Migrate the CLI half of check-wikilinks.sh → \`lint --check md-links\`. New src/core/markdown-link-check.ts (+ .test.ts) reusing link-resolver.ts/wikilinks.ts (detect [text](x.md) markdown links, fenced-code exclusion, bookkeeping/folder-note exemptions). Wire into lint.ts. Convert the CLI invocation path of check-wikilinks.sh to a thin wrapper (the HOOK half stays bash until Phase 3). Prove dual-run, retire the migrated CLI logic only.`,
    files: ['src/core/markdown-link-check.ts', 'src/commands/lint/lint.ts', 'scripts/check-wikilinks.sh'],
    dualRun: `bash scripts/check-wikilinks.sh (CLI mode) on ${REF} vs \`lint --check md-links\` --json — compare counts.`,
    dualRunCheck: `compare md-link counts on ${REF}`,
    commit: 'refactor(engine): migrate check-wikilinks CLI half to lint --check md-links',
  },
  {
    id: 'structural', agentType: ENGINE,
    task: `Migrate lint-structural.sh → \`lint --check structural\`. New src/core/structural-check.ts (+ .test.ts) composing existing primitives (frontmatter.ts, fs.ts listMarkdownRecursive/isBookkeepingFile/isFolderNote) — do NOT duplicate logic already in verify. Wire into lint.ts. Thin-wrap scripts/lint-structural.sh. Prove dual-run, retire bash logic.`,
    files: ['src/core/structural-check.ts', 'src/commands/lint/lint.ts', 'scripts/lint-structural.sh'],
    dualRun: `bash scripts/lint-structural.sh --target ${REF} | grep -cE '^WARN' vs \`lint --check structural\` --json count.`,
    dualRunCheck: `compare WARN counts on ${REF}`,
    commit: 'refactor(engine): migrate lint-structural.sh to lint --check structural',
  },
  {
    id: 'ontology', agentType: ENGINE,
    task: `Migrate lint-ontology.sh → \`lint --check ontology\`. New src/core/ontology-lint.ts (+ .test.ts) reusing src/core/ontology-profile.ts. Wire into lint.ts. Thin-wrap scripts/lint-ontology.sh. Prove dual-run, retire bash logic.`,
    files: ['src/core/ontology-lint.ts', 'src/commands/lint/lint.ts', 'scripts/lint-ontology.sh'],
    dualRun: `bash scripts/lint-ontology.sh on ${REF} vs \`lint --check ontology\` --json count.`,
    dualRunCheck: `compare ontology counts on ${REF}`,
    commit: 'refactor(engine): migrate lint-ontology.sh to lint --check ontology',
  },
  {
    id: 'vocabulary', agentType: ENGINE,
    task: `Migrate lint-vocabulary.sh → \`lint --check vocabulary\`. New src/core/vocabulary-lint.ts (+ .test.ts) reusing vocabulary.ts + stem.ts. Wire into lint.ts. Thin-wrap scripts/lint-vocabulary.sh. Prove dual-run, retire bash logic.`,
    files: ['src/core/vocabulary-lint.ts', 'src/commands/lint/lint.ts', 'scripts/lint-vocabulary.sh'],
    authorFiles: ['src/core/vocabulary-lint.ts', 'src/core/vocabulary-lint.test.ts'],
    dualRun: `bash scripts/lint-vocabulary.sh on ${REF} vs \`lint --check vocabulary\` --json count.`,
    dualRunCheck: `compare vocabulary counts on ${REF}`,
    commit: 'refactor(engine): migrate lint-vocabulary.sh to lint --check vocabulary',
  },
  {
    id: 'dup-claims', agentType: ENGINE,
    task: `Migrate check-duplicate-claims.sh → \`lint --check dup-claims\`. New src/core/duplicate-claims.ts (+ .test.ts) reusing frontmatter.ts + stem.ts. Wire into lint.ts. Thin-wrap scripts/check-duplicate-claims.sh. Prove dual-run, retire bash logic.`,
    files: ['src/core/duplicate-claims.ts', 'src/commands/lint/lint.ts', 'scripts/check-duplicate-claims.sh'],
    authorFiles: ['src/core/duplicate-claims.ts', 'src/core/duplicate-claims.test.ts'],
    dualRun: `bash scripts/check-duplicate-claims.sh on ${REF} vs \`lint --check dup-claims\` --json count.`,
    dualRunCheck: `compare dup-claims counts on ${REF}`,
    commit: 'refactor(engine): migrate check-duplicate-claims.sh to lint --check dup-claims',
  },
  {
    id: 'output', agentType: ENGINE,
    task: `Migrate verify-output.sh → \`lint --check output\`. New src/core/output-check.ts (+ .test.ts). Wire into lint.ts. Thin-wrap scripts/verify-output.sh. Prove dual-run, retire bash logic.`,
    files: ['src/core/output-check.ts', 'src/commands/lint/lint.ts', 'scripts/verify-output.sh'],
    authorFiles: ['src/core/output-check.ts', 'src/core/output-check.test.ts'],
    dualRun: `bash scripts/verify-output.sh on ${REF} vs \`lint --check output\` --json count.`,
    dualRunCheck: `compare output-check counts on ${REF}`,
    commit: 'refactor(engine): migrate verify-output.sh to lint --check output',
  },
  {
    id: 'export', agentType: ENGINE,
    task: `Migrate distribute-wiki.sh → a new \`export\` verb. New src/commands/export/{export.ts, export.test.ts, CLAUDE.md}; wire into CAPABILITIES + dispatch + usage in src/cli/cli.ts. Thin-wrap scripts/distribute-wiki.sh. Prove dual-run (output equivalence), retire bash logic. Rebuild dist.`,
    files: ['src/commands/export/export.ts', 'src/commands/export/CLAUDE.md', 'src/cli/cli.ts', 'scripts/distribute-wiki.sh'],
    authorFiles: ['src/commands/export/export.ts', 'src/commands/export/export.test.ts', 'src/commands/export/CLAUDE.md'],
    dualRun: `bash scripts/distribute-wiki.sh vs \`export\` on ${REF} — compare produced file set/contents.`,
    dualRunCheck: `compare export output on ${REF}`,
    commit: 'feat(engine): add export verb migrating distribute-wiki.sh',
  },
  {
    id: 'docs', agentType: ENGINE, adversarial: true,
    task: `LAST. Migrate validate-docs.sh (the ~772-line glossary/CI Tier-0 gate) → \`lint --check docs\`. New src/core/docs-check.ts (+ .test.ts) with its OWN fixture corpus covering banned/SEO terms, layer-capitalization, glossary resolution, and /claude-wiki-pages: namespace resolution. Wire into lint.ts. Convert scripts/validate-docs.sh to a thin wrapper. This gates CI Tier 0 — keep the longest dual-run; prove identical pass/fail + counts on the repo before retiring bash. Update tests/gates/gate-04-glossary.sh only if it shells the wrapper (must stay green).`,
    files: ['src/core/docs-check.ts', 'src/commands/lint/lint.ts', 'scripts/validate-docs.sh', 'tests/gates/gate-04-glossary.sh'],
    authorFiles: ['src/core/docs-check.ts', 'src/core/docs-check.test.ts', 'tests/fixtures/docs-check-corpus/ (its own fixture corpus)'],
    dualRun: `bash scripts/validate-docs.sh (whole repo) vs \`lint --check docs\` — compare pass/fail and every violation count.`,
    dualRunCheck: `run BOTH bash scripts/validate-docs.sh and lint --check docs on the repo; assert identical verdict + violation list`,
    commit: 'refactor(engine): migrate validate-docs.sh to lint --check docs',
  },
]

// ---- Phase 2 — engine-internal deterministic concurrency ----
const PHASE2 = [
  {
    id: 'concurrency', agentType: ENGINE, adversarial: true,
    task: `Make verify.ts and lint.ts run their composed checks concurrently WITHOUT changing output. Convert the composed checks to async, run with await Promise.all([...]), then sort the merged findings[] deterministically by (file, check, severity, message) before buildReport — pure checks + final sort ⇒ byte-identical output regardless of completion order. Parallelize per-file reads inside the heaviest checks (listMarkdownRecursive is already sorted). Honor --concurrency <n> with a serial fallback (n=1) for debuggability. Rebuild dist.`,
    files: ['src/commands/verify/verify.ts', 'src/commands/lint/lint.ts'],
    extra: 'Frame as scalability/robustness, not latency. The acceptance bar is gate-05 counts AND byte-identical verify text/JSON output unchanged vs before this commit; run with --concurrency 1 and default and prove identical.',
    gates: 'gate-01-engine-tests, gate-05-verify-parity, gate-02-typecheck, gate-11-eslint, gate-12-stale-dist',
    dualRun: `verify --json on ${REF} before vs after — assert byte-identical; and gate-05 counts unchanged.`,
    dualRunCheck: `assert verify output byte-identical before/after and gate-05 green; run lint with --concurrency 1 vs default for identical output`,
    commit: 'perf(engine): deterministic Promise.all concurrency in verify + lint (parity-safe)',
  },
]

// ---- Phase 3 — hot-path security gates, fail-closed. SEQUENTIAL, careful twin retirement. ----
const PHASE3 = [
  {
    id: 'frontmatter-validate', agentType: SCHEMA, adversarial: true, model: 'opus',
    task: `Biggest correctness/security win: replace the 447-line awk-YAML parser in validate-frontmatter.sh with a real parser. New src/core/frontmatter-validate.ts using the existing frontmatter.ts (real \`yaml\`). Add a firewall-adjacent engine entry that consumes the hook's stdin JSON and emits the {"decision":"block","reason":...} contract. Convert scripts/validate-frontmatter.sh to a thin stdin→engine wrapper. FAIL-CLOSED: if Bun is absent at hook time, emit a block decision with an "install Bun" reason (NOT fail-open). Keep/extend tests/scripts/*.bats including the Bun-absent fail-closed path. Prove dual-run on reference-vault + minimal-vault before retiring awk logic.`,
    files: ['src/core/frontmatter-validate.ts', 'scripts/validate-frontmatter.sh', 'hooks/hooks.json'],
    dualRun: `pipe representative tool-call JSON payloads (clean + dirty frontmatter) through old scripts/validate-frontmatter.sh and the new engine entry; assert identical block/allow decisions on ${REF} + tests/fixtures/minimal-vault.`,
    dualRunCheck: `independently replay clean+dirty frontmatter payloads through both implementations; assert identical decisions, AND verify the Bun-absent path blocks`,
    commit: 'refactor(engine): replace awk-YAML validate-frontmatter with frontmatter-validate.ts (fail-closed)',
  },
  {
    id: 'firewall-twin-retire', agentType: SCHEMA, adversarial: true, model: 'opus',
    task: `firewall.ts already exists and is the source of truth — retire only the bash twin. Convert scripts/firewall.sh to a thin stdin→engine wrapper (fail-closed: Bun absent ⇒ block). Then FLIP gate-11-firewall-parity from "bash-twin == engine" to "engine == checked-in golden verdict table on the fixtures" — keeping anti-drift without two implementations. Never retire the twin in a commit that changes engine behavior. Prove engine==bash on reference-vault + minimal-vault (gates green) BEFORE the flip, then delete dead bash logic.`,
    files: ['scripts/firewall.sh', 'tests/gates/gate-11-firewall-parity.sh', 'hooks/hooks.json'],
    dualRun: `run old firewall.sh vs engine firewall on the fixture write-attempts; assert identical ALLOW|BLOCK [rule] verdicts before flipping the gate to golden-snapshot.`,
    dualRunCheck: `replay firewall write-attempts through both; confirm identical verdicts and that gate-11 stays green post-flip`,
    commit: 'refactor(security): retire firewall bash twin, flip gate-11 to golden-snapshot (fail-closed)',
  },
  {
    id: 'hook-gates', agentType: INGEST, adversarial: true, model: 'opus',
    task: `Migrate the remaining PreToolUse Write|Edit hook gates into the engine as core/ modules consumed by a firewall-adjacent engine entry, converting each hook to a thin stdin→engine wrapper that preserves the contract exactly: read tool-call JSON from stdin, emit the block-decision JSON on stdout, exit 0 for advisory/allow. Cover: check-wikilinks.sh (HOOK half), protect-raw.sh, validate-attachments.sh, enforce-dmi.sh (PRESERVE the hard exit 2), enforce-must-rule.sh. Advisory checks fail-OPEN on internal error; security checks (protect-raw, attachments, dmi) fail-CLOSED when the engine can't run. Keep each hook's tests/scripts/*.bats (add the Bun-absent fail-closed assertion). Prove dual-run per hook before retiring bash logic.`,
    files: ['scripts/check-wikilinks.sh', 'scripts/protect-raw.sh', 'scripts/validate-attachments.sh', 'scripts/enforce-dmi.sh', 'scripts/enforce-must-rule.sh', 'hooks/hooks.json'],
    extra: 'enforce-dmi.sh MUST keep its hard exit 2 semantics. raw/ immutability (protect-raw) must stay enforced fail-closed. Do this hook-by-hook; never retire a bash twin in the same step that changes engine behavior.',
    dualRun: `per hook: pipe allow + block JSON payloads through old bash and new wrapper; assert identical decision + exit code (incl. enforce-dmi exit 2) on the fixtures.`,
    dualRunCheck: `replay allow/block payloads per hook through both implementations; assert identical decision + exit code, and Bun-absent ⇒ block for the security hooks`,
    commit: 'refactor(security): migrate PreToolUse hook gates into the engine (fail-closed wrappers)',
  },
]

// ===================================================================
// DRIVER
// ===================================================================
async function phase0() {
  phase('Implement')
  const impls = (await parallel(PHASE0_IMPL.map((u) => () => agent(implPrompt(u), { agentType: u.agentType, schema: IMPL_SCHEMA, phase: 'Implement', label: `impl:${u.id}` })))).filter(Boolean)

  const fakeUnit = { id: 'phase0', adversarial: false, gates: 'gate-04-glossary, gate-03-shellcheck, gate-01-engine-tests, gate-02-typecheck, gate-11-eslint, gate-12-stale-dist, gate-10-markdownlint' }
  phase('Verify')
  let qa = await runQA(fakeUnit, 'phase0:r0')
  let round = 0
  while (!allGreen(qa) && round < MAX_REPAIR) {
    round++
    const failures = qa.flatMap((q) => (q && q.failures) || [])
    log(`Phase 0 red (round ${round}); repairing ${failures.length} failure(s) across implementers`)
    phase('Implement')
    // route each failure's repair to the most-likely owner; simplest: re-run all three implementers with the failure list
    await parallel(
      PHASE0_IMPL.map((u) => () => agent(repairPrompt(u, failures), { agentType: u.agentType, schema: IMPL_SCHEMA, phase: 'Implement', label: `repair:${u.id}:r${round}` })),
    )
    phase('Verify')
    qa = await runQA(fakeUnit, `phase0:r${round}`)
  }
  const green = allGreen(qa)

  phase('Integrate')
  const commit = await agent(
    [
      `You are ${MANAGER}. Read ${BRIEF}. Phase 0 (foundations) was implemented on branch ${BRANCH}; QA green=${green}.`,
      `IMPLS: ${JSON.stringify(impls)}`,
      `QA: ${JSON.stringify(qa)}`,
      green
        ? 'QA is green. Make up to THREE logical conventional commits (ADR+glossary; bun-required groundwork; lint-verb scaffold), each staging only its own paths, run sequentially. Then run the phase-final full gate: `bash tests/run-tests.sh tier0 && bash tests/run-tests.sh tier1`, report finalGateGreen.'
        : 'QA is NOT green after repair rounds. Do NOT commit. List what remains red.',
      'Return the structured COMMIT result.',
    ].join('\n'),
    { agentType: MANAGER, schema: COMMIT_SCHEMA, phase: 'Integrate', label: 'commit:phase0' },
  )
  return { phase: 0, impls, qa, green, commit }
}

// Optional resume filter: args.only = ["vocabulary","dup-claims",...] runs just
// those unit ids (in their declared order), skipping already-committed units.
const ONLY = Array.isArray(A.only) ? A.only : null
const pick = (units) => (ONLY ? units.filter((u) => ONLY.includes(u.id)) : units)

// args.parallel=true → fan-out authoring + serial integration (~2x). Default serial.
const PARALLEL = A.parallel === true

let result
if (PHASE === 0) {
  result = await phase0()
} else if (PHASE === 1) {
  const units = PARALLEL ? await runFanOut(pick(PHASE1)) : await runSequential(pick(PHASE1))
  result = { phase: 1, units, parallel: PARALLEL }
} else if (PHASE === 2) {
  const units = await runSequential(pick(PHASE2))
  result = { phase: 2, units }
} else if (PHASE === 3) {
  const units = await runSequential(pick(PHASE3))
  result = { phase: 3, units }
} else {
  throw new Error(`Unknown phase ${PHASE} (expected 0|1|2|3)`)
}

log(`Phase ${PHASE} complete. Review before launching the next phase.`)
return result
