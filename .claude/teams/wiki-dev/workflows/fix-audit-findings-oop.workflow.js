export const meta = {
  name: 'fix-audit-findings-oop',
  description:
    'Fix every audit finding and enforce the recommended design patterns. HYBRID: the claude-oop-excellence entity-fixer + pattern-implementer workers do the primary code edits (file-serialized), wrapped by the wiki-dev team — architect ordering, project-specific QA gates, lane-engineer repair, manager-serialized commits.',
  whenToUse:
    'After /audit, to apply fixes file-by-file with the oop-excellence workers as the fixers and the wiki-dev team as the design-review / gate / repair / commit harness.',
  phases: [
    { title: 'Resolve', detail: 'read vendored oop glossary + run registry; inject full entity/pattern records; group findings by FILE within each lane; mark oop-vs-engineer dispatch + the concurrency cluster' },
    { title: 'Order', detail: 'wiki-dev-architect emits per-file fix order and scopes the wide hub refactors; force-fix mode (everything ruled fix), flags any §5 risk for QA to watch' },
    { title: 'Fix', detail: 'lanes PARALLEL; files SEQUENTIAL within a lane; entity-fixers SEQUENTIAL within a file (issues first), pattern-implementer LAST; concurrency cluster = one Lane-C engineer; oop workers get injected records + repo guardrails' },
    { title: 'Verify', detail: 'wiki-dev-qa-functional (Tier0+Tier1+gates) + wiki-dev-qa-adversarial (security/concurrency/parity/NO-RAG) in parallel; bounded repair routed to the OWNING wiki-dev lane engineer' },
    { title: 'Integrate', detail: 'wiki-dev-manager: sequential per-lane commits + Lane-A dist/ rebuild (gate-12) + final full gate' },
  ],
}

// ---- args (defensively parse: the harness sometimes passes a JSON string) ----
let A = args || {}
if (typeof A === 'string') {
  try {
    A = JSON.parse(A)
  } catch {
    A = {}
  }
}
const GLOSSARY = A.glossaryPath || '.claude/teams/wiki-dev/oop-glossary/glossary.json'
const REGISTRY = A.findingsPath || '.claude/teams/wiki-dev/audit-findings-oop-r3-2026-06-21.json'
const BRIEF = A.teamBriefPath || '.claude/teams/wiki-dev/TEAM-BRIEF.md'
const BASE = A.baseBranch || 'main'
const BRANCH = A.branch || 'fix/audit-findings-oop-2026-06-20'
const PLAN_ONLY = A.planOnly === true
const SEVERITIES = A.severities || ['high', 'medium', 'low']
const ONLY_LANES = A.onlyLanes || ['A', 'B', 'C', 'D']
const MAX_ROUNDS = A.maxRepairRounds ?? 5

const AGENT_BY_LANE = {
  A: 'wiki-dev-eng-retrieval',
  B: 'wiki-dev-eng-schema',
  C: 'wiki-dev-eng-ingest',
  D: 'wiki-dev-eng-ux',
}
const LANES = ['A', 'B', 'C', 'D'].filter((l) => ONLY_LANES.includes(l))
const OOP_ENTITY_FIXER = 'claude-oop-excellence:entity-fixer'
const OOP_PATTERN_IMPLEMENTER = 'claude-oop-excellence:pattern-implementer'

// ===================== schemas =====================
const RESOLVE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['fileGroups', 'issueById', 'patternById', 'fileToLane', 'summary'],
  properties: {
    // lane -> ordered list of file groups (the serialization unit)
    fileGroups: {
      type: 'object',
      additionalProperties: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['file', 'issueIds', 'patternIds'],
          properties: {
            file: { type: 'string' },
            issueIds: { type: 'array', items: { type: 'string' } },
            patternIds: { type: 'array', items: { type: 'string' } },
            fixOrder: { type: 'array', items: { type: 'string' } },
            clusterId: { type: 'string', description: 'non-empty => handled as ONE cross-file mechanism by a lane engineer, not per-file oop workers' },
          },
        },
      },
    },
    // finding id -> enriched issue WITH injected entity record + dispatch route
    issueById: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        additionalProperties: true,
        required: ['id', 'lane', 'file', 'severity', 'resolvedEntityId', 'dispatch'],
        properties: {
          id: { type: 'string' },
          lane: { type: 'string' },
          file: { type: 'string' },
          severity: { type: 'string' },
          auditLabel: { type: 'string' },
          summary: { type: 'string' },
          resolvedEntityId: { type: 'string', description: 'canonical glossary id, or "fix-by-principle:<principle>"' },
          dispatch: { type: 'string', enum: ['oop', 'engineer'], description: 'oop = entity-fixer with injected record; engineer = wiki-dev lane engineer (fix-by-principle / non-canonical id / cluster)' },
          clusterId: { type: 'string' },
          entityRecord: {
            type: 'object',
            additionalProperties: true,
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              category: { type: 'string' },
              family: { type: 'string' },
              signs: { type: 'array', items: { type: 'string' } },
              principles: { type: 'array', items: { type: 'string' } },
              corrective_patterns: { type: 'array', items: { type: 'string' } },
              default_severity: { type: 'string' },
            },
          },
        },
      },
    },
    // pattern id -> enriched pattern WITH injected record
    patternById: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        additionalProperties: true,
        required: ['id', 'patternId', 'lane', 'file'],
        properties: {
          id: { type: 'string' },
          patternId: { type: 'string', description: 'canonical glossary design-pattern id' },
          lane: { type: 'string' },
          file: { type: 'string' },
          resolves: { type: 'string' },
          summary: { type: 'string' },
          patternRecord: { type: 'object', additionalProperties: true },
        },
      },
    },
    fileToLane: { type: 'object', additionalProperties: { type: 'string' } },
    summary: { type: 'string' },
  },
}

const ORDER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['fileFixOrder', 'scopingNotes', 'watchForQA', 'summary'],
  properties: {
    fileFixOrder: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } }, description: 'file -> ordered entity ids' },
    scopingNotes: { type: 'array', items: { type: 'object', additionalProperties: true, required: ['id', 'note'], properties: { id: { type: 'string' }, note: { type: 'string' } } } },
    watchForQA: { type: 'array', items: { type: 'string' }, description: 'force-fixes that risk a §5 non-negotiable / deliberate contract — QA must watch' },
    summary: { type: 'string' },
  },
}

const FIX_RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['findings', 'summary'],
  properties: {
    lane: { type: 'string' },
    file: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'status'],
        properties: {
          id: { type: 'string' },
          status: { type: 'string', enum: ['fixed', 'documented', 'skipped', 'failed', 'no-op', 'planned'] },
          filesTouched: { type: 'array', items: { type: 'string' } },
          testsAdded: { type: 'array', items: { type: 'string' } },
          correctivePatternApplied: { type: 'string' },
          note: { type: 'string' },
        },
      },
    },
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
        properties: { file: { type: 'string' }, gate: { type: 'string' }, detail: { type: 'string' } },
      },
    },
    notes: { type: 'string' },
  },
}

const INTEGRATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['committed', 'commits', 'distRebuilt', 'finalGateGreen', 'remaining', 'summary'],
  properties: {
    committed: { type: 'boolean' },
    commits: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['lane', 'message'], properties: { lane: { type: 'string' }, sha: { type: 'string' }, message: { type: 'string' } } },
    },
    distRebuilt: { type: 'boolean' },
    finalGateGreen: { type: 'boolean' },
    remaining: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
}

// ===================== guardrails (injected into every worker) =====================
const REPO_GUARDRAILS = [
  'Edit ONLY the one file in your scope. Another agent owns other files concurrently — touching them is a race.',
  'Do NOT git add / commit / stash or run snapshot.sh — the wiki-dev-manager makes all commits sequentially after QA.',
  'NEVER run repo-wide `bun run format`. Format only the file you edit (a past run churned 326 files).',
  'Do NOT run the full test / gate suite during Fix — other lanes are mutating the tree. Reason about correctness and add colocated tests; the Verify phase runs the gates once on the merged tree.',
  'TDD: for untested-code-path / missing-negative-test findings, write the colocated *.test.ts (or tests/scripts/*.bats) FIRST against the gap, then keep the code correct.',
  'Preserve bash↔TS parity: any change to a twin (verify-ingest.sh↔verify, firewall.sh↔firewall.ts) must keep gate-05 / gate-11 aligned.',
  'Honor the §5 non-negotiables in TEAM-BRIEF: no embeddings on retrieval, structural provenance, raw immutability, fail-closed per-vault write confinement, one active vault.',
  'For injection: never interpolate untrusted/LLM/vault values into shell, awk -v, bun -e, or printf format strings — pass via argv/env and use printf \'%s\'. For path-traversal, realpath-confine like protect-raw.sh / firewall.sh.',
]

const OOP_VERIFY_OVERRIDE =
  'VERIFICATION OVERRIDE: your tool allow-list cannot run this repo\'s gates (no `bash` / `bun` access) — do NOT attempt `npm test` / `npx`. Instead make the smallest behaviour-preserving corrective edit guided by corrective_patterns, then verify by RE-READING the changed code and confirming the entity\'s signs no longer match. Keep TypeScript type-consistent by inspection. The wiki-dev QA phase runs the authoritative gates afterward.'

const planFlag = PLAN_ONLY ? '\n--plan-only (make NO writes; return the diff plan and status "planned")' : ''

// ===================== prompt builders =====================
function entityFixerPrompt(file, finding) {
  return [
    `You are claude-oop-excellence:entity-fixer, dispatched on ONE finding in ONE file of the claude-wiki-pages repo.`,
    ``,
    `INJECTED ENTITY RECORD (use verbatim — do NOT read skills/glossary/glossary.json; it does not exist at this repo root):`,
    JSON.stringify(finding.entityRecord || { id: finding.resolvedEntityId }, null, 2),
    ``,
    `SCOPE: component ${file}   (edit ONLY this file)${planFlag}`,
    `FINDING: [${finding.id} · ${finding.severity}] ${finding.auditLabel || finding.resolvedEntityId} @ ${finding.file} — ${finding.summary}`,
    ``,
    `REPO GUARDRAILS (the oop worker does NOT know these — obey them):`,
    ...REPO_GUARDRAILS.map((g) => `- ${g}`),
    ``,
    OOP_VERIFY_OVERRIDE,
    ``,
    `Return FIX_RESULT for this single finding: id "${finding.id}", status (fixed|no-op|failed|planned), filesTouched (ONLY ${file}), testsAdded, correctivePatternApplied, note.`,
  ].join('\n')
}

function patternImplementerPrompt(file, pattern) {
  return [
    `You are claude-oop-excellence:pattern-implementer, dispatched to implement ONE design pattern in ONE file of the claude-wiki-pages repo.`,
    ``,
    `INJECTED PATTERN RECORD (use verbatim — do NOT read skills/glossary/glossary.json):`,
    JSON.stringify(pattern.patternRecord || { id: pattern.patternId, resolves: (pattern.resolves || '').split(',') }, null, 2),
    ``,
    `SCOPE: component ${file}   (edit ONLY this file)${planFlag}`,
    `OPPORTUNITY: [${pattern.id}] enforce "${pattern.patternId}" — ${pattern.summary}`,
    `It resolves: ${pattern.resolves}. The issue may have ALREADY been fixed by the earlier entity-fixers on this file; if the resolved issue is no longer present, return status "skipped" with note "pattern N/A — issue already fixed". That is a HEALTHY outcome, never a failure.`,
    ``,
    `REPO GUARDRAILS:`,
    ...REPO_GUARDRAILS.map((g) => `- ${g}`),
    ``,
    OOP_VERIFY_OVERRIDE,
    `Use the parallel-change (expand-then-contract) sequence so the file stays correct at each step.`,
    ``,
    `Return FIX_RESULT: id "${pattern.id}", status (fixed|skipped|failed|planned), filesTouched (ONLY ${file}), correctivePatternApplied "${pattern.patternId}", note.`,
  ].join('\n')
}

function engineerFixPrompt(lane, file, findings) {
  return [
    `You are the Lane ${lane} engineer (${AGENT_BY_LANE[lane]}) on the wiki-dev team. Read ${BRIEF} first for your lane contract and the §5 non-negotiables.`,
    `Fix the following finding(s) in ${file}. These are routed to you (not an oop worker) because they are fix-by-principle / no canonical glossary entity, OR part of a cross-file mechanism. Force-fix mode: apply a real change to each.${planFlag}`,
    ``,
    `FINDINGS (JSON):`,
    JSON.stringify(findings, null, 2),
    ``,
    `GUARDRAILS (hard):`,
    ...REPO_GUARDRAILS.map((g) => `- ${g}`),
    ``,
    `Return FIX_RESULT: per-finding status (fixed|failed|planned), filesTouched, testsAdded, note. Edit ONLY ${file} unless a finding explicitly spans a named set of files you own.`,
  ].join('\n')
}

function clusterPrompt(lane, findings) {
  return [
    `You are the Lane ${lane} engineer (${AGENT_BY_LANE[lane]}). Read ${BRIEF}.`,
    `Implement ONE coherent fix for the entire CONCURRENCY CLUSTER below: a single advisory vault lock around all snapshot / commit / log-append paths + a timeout on every git execFileSync, spanning src/core/git.ts, src/commands/snapshot/snapshot.ts, scripts/snapshot.sh, scripts/maintenance-run.sh, src/core/vault-lock.ts, and the write-barrier contract in agents/claude-wiki-pages-ingest-agent.md. Keep it DRY — ONE mechanism, not per-file forks of a lock.${planFlag}`,
    ``,
    `CLUSTER FINDINGS (JSON):`,
    JSON.stringify(findings, null, 2),
    ``,
    `GUARDRAILS (hard):`,
    ...REPO_GUARDRAILS.map((g) => `- ${g}`),
    ``,
    `Return FIX_RESULT covering every cluster finding id with its status, filesTouched, testsAdded, note.`,
  ].join('\n')
}

function repairPrompt(lane, failures) {
  return [
    `You are the Lane ${lane} engineer (${AGENT_BY_LANE[lane]}). The QA gate failed on changes in your area. Repair the ROOT CAUSE.`,
    `Read ${BRIEF}. Same guardrails: no git/commit, no repo-wide format, edit only your lane's files, do not run the full suite.`,
    ``,
    `GATE FAILURES to fix:`,
    JSON.stringify(failures, null, 2),
    ``,
    `Do not weaken or delete tests to make them pass unless a test is itself wrong (say so). Preserve bash↔TS parity (gate-05/gate-11). Return FIX_RESULT.`,
  ].join('\n')
}

function laneOf(file, fileToLane) {
  if (fileToLane && fileToLane[file]) return fileToLane[file]
  for (const k of Object.keys(fileToLane || {})) {
    if (file && (file.includes(k) || k.includes(file))) return fileToLane[k]
  }
  return null
}

async function runVerify(label) {
  return await parallel([
    () =>
      agent(
        [
          `You are wiki-dev-qa-functional. Run the full wiki-dev merge gate on the current working tree (do NOT commit).`,
          `Read ${BRIEF}. Run: \`bash tests/run-tests.sh tier0\` then \`bash tests/run-tests.sh tier1\`, then \`bun run build && bash tests/gates/run-all.sh\` (verify-parity gate-05, firewall-parity gate-11, config-schema gate-07, glossary gate-04, prettier gate-08, stale-dist gate-12).`,
          `CRITICAL — distinguish REGRESSIONS from PRE-EXISTING failures. A failure counts against allGreen ONLY if our changes caused it. Known pre-existing environment-only failures that ALSO fail on a clean checkout of ${BASE} (the macOS case-insensitive /git-vs-/Git path mismatches in maintenance-run.bats / session-start.bats) go under notes, NOT failures. To be sure, \`git stash\`, re-run the suspect test on clean ${BASE}, \`git stash pop\`. Set allGreen=true iff every regression and every defect in a newly-added test file is resolved. Coverage must stay >=80% on changed code.`,
          `Report allGreen, gatesRun, and every failure with file + gate + detail.`,
        ].join('\n'),
        { agentType: 'wiki-dev-qa-functional', schema: QA_SCHEMA, phase: 'Verify', label: `qa-functional:${label}` },
      ),
    () =>
      agent(
        [
          `You are wiki-dev-qa-adversarial. Verify the security + concurrency fixes empirically and re-check the non-negotiables (no embeddings on retrieval = gate-13, raw immutability, fail-closed write confinement). Do NOT commit.`,
          `Read ${BRIEF}. Focus: (1) the hooks.json MultiEdit write-confinement gap is closed — a MultiEdit write now passes through firewall/frontmatter/protect-raw/wikilink/attachment gates; (2) no untrusted value reaches a shell/awk/bun -e/printf-format sink; (3) snapshot/commit/log-append go through ONE advisory lock and every git execFileSync has a timeout; (4) path-traversal is realpath-confined. Run tier2 smoke if a \`claude\` CLI is present, else note it self-skipped.`,
          `CRITICAL — count a failure against allGreen ONLY if our changes caused it. Pre-existing macOS /git-vs-/Git case mismatches go under notes, NOT failures. A defect in a newly-added test file IS our regression and DOES count.`,
          `Report allGreen, gates/checks run, and any residual exploit path as a failure with file + detail.`,
        ].join('\n'),
        { agentType: 'wiki-dev-qa-adversarial', schema: QA_SCHEMA, phase: 'Verify', label: `qa-adversarial:${label}` },
      ),
  ])
}

// ===================== PHASE 1: Resolve =====================
phase('Resolve')
const resolve = await agent(
  [
    `You are the Resolve step for the hybrid fix workflow. Read two files:`,
    `1. The vendored oop-excellence entity glossary: ${GLOSSARY}`,
    `2. The run findings registry: ${REGISTRY} (has a "findings" issue array and a "patterns" array).`,
    ``,
    `Restrict to severities ${JSON.stringify(SEVERITIES)} and lanes ${JSON.stringify(LANES)}.`,
    ``,
    `For EACH issue finding:`,
    `- Confirm/correct suggestedEntityId to a CANONICAL glossary id. Remaps: every command/format/path/prompt-injection + ReDoS -> "injection"; "untested-module"/"untested-branch" -> "untested-code-path"; "tautological-test" -> "tautological-assertion"; broken-authn/broken-authz -> "broken-authn-authz"; pick "god-class" (oop) vs "god-object" (code) by flavor. Set resolvedEntityId.`,
    `- If a real glossary entity matches: set dispatch="oop" and ATTACH the full glossary record as entityRecord (id, name, category, family, signs, principles, corrective_patterns, default_severity).`,
    `- If NO entity fits (e.g. layering-violation, hub-like-dependency, unbounded-blocking, unsafe-git-ops, conditional-test-logic) set resolvedEntityId="fix-by-principle:<principle>" and dispatch="engineer" (the oop worker cannot self-resolve these).`,
    `- The CONCURRENCY CLUSTER (race-condition / deadlock on src/core/git.ts, src/commands/snapshot/snapshot.ts, scripts/snapshot.sh, scripts/maintenance-run.sh, src/core/vault-lock.ts, and the write-barrier in agents/claude-wiki-pages-ingest-agent.md) must be ONE mechanism: tag every such finding with clusterId="concurrency-1" and dispatch="engineer".`,
    `- Findings whose "file" names a SET of files (e.g. the N18 strict-mode sweep, or "a.sh:1 vs b.sh:2") must be SPLIT per concrete file, each kept on its single owning lane; dispatch="engineer" for cross-file/sweep items.`,
    ``,
    `For EACH pattern in "patterns": set patternId to the canonical glossary design-pattern id and ATTACH its glossary record (with "resolves") as patternRecord into patternById.`,
    ``,
    `Then build fileGroups: lane -> ordered array of { file, issueIds (entity-fixer order; decompose god/big-ball first, then spaghetti, then duplicated/dead, then primitive/magic, then security), patternIds (the patterns whose file == this file), fixOrder, clusterId }. One file appears once per lane. Build fileToLane mapping every distinct file to its single owning lane.`,
    ``,
    `Return the structured RESOLVE output. READ-ONLY — edit nothing.`,
  ].join('\n'),
  { schema: RESOLVE_SCHEMA, phase: 'Resolve', label: 'resolve' },
)

const issueCount = Object.keys(resolve.issueById || {}).length
const patternCount = Object.keys(resolve.patternById || {}).length
log(
  `Resolved ${issueCount} issues + ${patternCount} patterns into lanes ` +
    LANES.map((l) => `${l}:${(resolve.fileGroups?.[l] || []).reduce((n, g) => n + g.issueIds.length, 0)}`).join(' '),
)

// ===================== PHASE 2: Order =====================
phase('Order')
const designReviewIds = Object.values(resolve.issueById || {})
  .filter((f) => f && (f.intentionalDesign === true || (resolve.fileGroups?.[f.lane] || []).some((g) => g.file === f.file && g.issueIds.length > 1)))
  .map((f) => f.id)
let order = { fileFixOrder: {}, scopingNotes: [], watchForQA: [], summary: 'no ordering needed' }
if (designReviewIds.length > 0) {
  order = await agent(
    [
      `You are wiki-dev-architect. Read ${BRIEF} (§5 non-negotiables, the four-layer contract).`,
      `Force-fix mode: the user wants EVERY finding code-changed (no document-only disposition). Your job is ORDERING + SCOPING, not fix-vs-document.`,
      `1. For every file with multiple findings, emit fileFixOrder[file] = the entity-id order the fixers should run (decompose god/big-ball -> spaghetti -> duplicated/dead -> primitive/magic -> security).`,
      `2. Scope the wide hub-dependency refactors (H15 src/core/vault.ts, H16 src/core/fs.ts) into a NARROW, parity-safe extraction — give a scopingNote per such id so the fixer does not ripple the engine.`,
      `3. Flag in watchForQA any force-fix that risks a §5 non-negotiable or a deliberate contract (functional anemic-model M01/M02; firewall/verify PARITY twins; SECURITY.md-acknowledged prompt-injection H04/H05; the cli.ts planned-capability registry; thin-wrapper migration shims) so QA watches it. We still fix them — but QA must confirm the fix did not break the contract.`,
      ``,
      `CANDIDATE IDS (intentional-design + multi-finding files):`,
      JSON.stringify(designReviewIds, null, 2),
      `ISSUE DETAILS (JSON):`,
      JSON.stringify(Object.fromEntries(designReviewIds.map((id) => [id, resolve.issueById[id]]).filter(([, v]) => v)), null, 2),
      ``,
      `Return the structured ORDER output.`,
    ].join('\n'),
    { agentType: 'wiki-dev-architect', schema: ORDER_SCHEMA, phase: 'Order', label: 'architect' },
  )
  log(`Architect ordered ${Object.keys(order.fileFixOrder || {}).length} files · ${order.watchForQA?.length || 0} flagged for QA`)
}

// ===================== PHASE 3: Fix (parallel lanes / sequential files / sequential fixers) =====================
phase('Fix')

async function runFileGroup(lane, group) {
  const results = []
  // concurrency cluster (or any cluster) -> ONE engineer for one coherent mechanism
  if (group.clusterId) {
    const clusterFindings = group.issueIds.map((id) => resolve.issueById[id]).filter(Boolean)
    const r = await agent(clusterPrompt(lane, clusterFindings), {
      agentType: AGENT_BY_LANE[lane],
      schema: FIX_RESULT_SCHEMA,
      phase: 'Fix',
      label: `cluster:${lane}:${group.clusterId}`,
    })
    return { file: group.file, lane, clusterId: group.clusterId, result: r }
  }
  const order = (group.fixOrder && group.fixOrder.length ? group.fixOrder : group.issueIds)
  const orderedIds = [...new Set([...order, ...group.issueIds])].filter((id) => group.issueIds.includes(id))
  // entity-fixers SEQUENTIAL within the file (issues first)
  for (const id of orderedIds) {
    const f = resolve.issueById[id]
    if (!f) continue
    const a =
      f.dispatch === 'oop'
        ? await agent(entityFixerPrompt(group.file, f), { agentType: OOP_ENTITY_FIXER, schema: FIX_RESULT_SCHEMA, phase: 'Fix', label: `fix:${lane}:${id}` })
        : await agent(engineerFixPrompt(lane, group.file, [f]), { agentType: AGENT_BY_LANE[lane], schema: FIX_RESULT_SCHEMA, phase: 'Fix', label: `fix-eng:${lane}:${id}` })
    results.push({ id, dispatch: f.dispatch, result: a })
  }
  // pattern-implementers LAST, on the now-cleaned file
  for (const pid of group.patternIds || []) {
    const p = resolve.patternById[pid]
    if (!p) continue
    const a = await agent(patternImplementerPrompt(group.file, p), { agentType: OOP_PATTERN_IMPLEMENTER, schema: FIX_RESULT_SCHEMA, phase: 'Fix', label: `pattern:${lane}:${pid}` })
    results.push({ id: pid, dispatch: 'pattern', result: a })
  }
  return { file: group.file, lane, results }
}

async function runLane(lane) {
  const groups = resolve.fileGroups?.[lane] || []
  const files = []
  for (const group of groups) {
    files.push(await runFileGroup(lane, group)) // SEQUENTIAL files within a lane
  }
  return { lane, fileCount: groups.length, files }
}

const fixResults = (await parallel(LANES.map((lane) => () => runLane(lane)))).filter(Boolean)

function tallyStatuses(fr) {
  const acc = { fixed: 0, skipped: 0, 'no-op': 0, failed: 0, planned: 0, documented: 0 }
  for (const lane of fr) {
    for (const fg of lane.files || []) {
      const lists = fg.result ? [fg.result] : (fg.results || []).map((r) => r.result)
      for (const res of lists) {
        for (const f of (res && res.findings) || []) if (acc[f.status] !== undefined) acc[f.status]++
      }
    }
  }
  return acc
}
const tally = tallyStatuses(fixResults)
log(`Fix complete: ${tally.fixed} fixed · ${tally.skipped} skipped(pattern N/A) · ${tally['no-op']} no-op · ${tally.failed} failed · ${tally.planned} planned`)

// ===================== PHASE 4: Verify (+ bounded repair) =====================
phase('Verify')
function allGreen(qaArr) {
  return qaArr.length > 0 && qaArr.every((q) => q && q.allGreen)
}
let qa = (await runVerify('r0')).filter(Boolean)
let round = 0
const repairLog = []
while (!PLAN_ONLY && !allGreen(qa) && round < MAX_ROUNDS) {
  round++
  const failures = qa.flatMap((q) => (q && q.failures) || [])
  const lanesToRepair = [...new Set(failures.map((f) => laneOf(f.file, resolve.fileToLane)).filter(Boolean))].filter((l) => LANES.includes(l))
  const target = lanesToRepair.length > 0 ? lanesToRepair : LANES
  log(`Verify red (round ${round}); repairing lanes ${target.join(',')} for ${failures.length} failure(s)`)
  const repairs = (
    await parallel(
      target.map((lane) => () =>
        agent(repairPrompt(lane, failures.filter((f) => laneOf(f.file, resolve.fileToLane) === lane || lanesToRepair.length === 0)), {
          agentType: AGENT_BY_LANE[lane],
          schema: FIX_RESULT_SCHEMA,
          phase: 'Fix',
          label: `repair:${lane}:r${round}`,
        }),
      ),
    )
  ).filter(Boolean)
  repairLog.push({ round, lanes: target, repairs })
  qa = (await runVerify(`r${round}`)).filter(Boolean)
}

// ===================== PHASE 5: Integrate =====================
phase('Integrate')
const integration = await agent(
  [
    `You are wiki-dev-manager. Read ${BRIEF}. The oop-excellence workers + lane engineers applied fixes on branch ${BRANCH} (off ${BASE}); QA has run.${PLAN_ONLY ? ' PLAN-ONLY run: nothing was written — do NOT commit, just summarize the plan.' : ''}`,
    `QA RESULT (allGreen across both QA roles = ${allGreen(qa)}):`,
    JSON.stringify(qa, null, 2),
    ``,
    `FIX RESULTS by lane:`,
    JSON.stringify(fixResults, null, 2).slice(0, 12000),
    ``,
    PLAN_ONLY
      ? `Set committed:false, distRebuilt:false, finalGateGreen:false and summarize what WOULD be committed per lane.`
      : allGreen(qa)
        ? `QA is green. Commit in SEQUENTIAL per-lane commits (one conventional commit per lane that has changes, e.g. \`fix(lane-c): close MultiEdit write-confinement gap + unify concurrency lock\`), one at a time, staging only that lane's paths. Lane A: after staging, run \`bun run build\` and stage dist/cli.js in the Lane-A commit (gate-12 stale-dist) — set distRebuilt accordingly. After all commits, run the final gate once: \`bash tests/run-tests.sh && bun run build && bash tests/gates/run-all.sh\` and report finalGateGreen.`
        : `QA is NOT green after ${round} repair round(s). Do NOT commit. List exactly what remains red. Set committed:false, finalGateGreen:false.`,
    ``,
    `Return the structured integration result.`,
  ].join('\n'),
  { agentType: 'wiki-dev-manager', schema: INTEGRATION_SCHEMA, phase: 'Integrate', label: 'manager' },
)

return {
  branch: BRANCH,
  base: BASE,
  planOnly: PLAN_ONLY,
  lanesRun: LANES,
  severities: SEVERITIES,
  resolved: Object.fromEntries(LANES.map((l) => [l, (resolve.fileGroups?.[l] || []).reduce((n, g) => n + g.issueIds.length, 0)])),
  order,
  tally,
  fixResults,
  repairRounds: round,
  qa,
  integration,
}
