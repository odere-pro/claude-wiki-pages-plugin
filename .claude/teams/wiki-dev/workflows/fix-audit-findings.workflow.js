export const meta = {
  name: 'fix-audit-findings',
  description: 'Fix all audit findings via the wiki-dev team, grounded in the repo-vendored oop-excellence glossary',
  whenToUse: 'After /audit, to apply fixes across the four wiki-dev lanes with architect arbitration, QA gating, and serialized commits.',
  phases: [
    { title: 'Resolve', detail: 'read vendored glossary + findings registry; map to entity records; batch per lane' },
    { title: 'Design-review', detail: 'architect rules intentional-design findings: fix vs document-with-rationale' },
    { title: 'Fix', detail: 'four lane engineers in parallel; edit-only + write tests; no git/format' },
    { title: 'Verify', detail: 'QA functional (full gate) + QA adversarial (security/concurrency) in parallel; bounded repair loop' },
    { title: 'Integrate', detail: 'manager: sequential per-lane commits + final full gate' },
  ],
}

// ---- args ----
// { glossaryPath, registryPath, teamBriefPath, baseBranch, branch }
const A = args || {}
const GLOSSARY = A.glossaryPath || '.claude/teams/wiki-dev/oop-glossary/glossary.json'
const REGISTRY = A.registryPath || '.claude/teams/wiki-dev/audit-findings.json'
const BRIEF = A.teamBriefPath || '.claude/teams/wiki-dev/TEAM-BRIEF.md'
const BASE = A.baseBranch || 'feat/parallel-extract-scheduled-upkeep'
const BRANCH = A.branch || 'fix/audit-findings'

const AGENT_BY_LANE = {
  A: 'wiki-dev-eng-retrieval',
  B: 'wiki-dev-eng-schema',
  C: 'wiki-dev-eng-ingest',
  D: 'wiki-dev-eng-ux',
}
const LANES = ['A', 'B', 'C', 'D']

// ---- schemas ----
const RESOLVE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['batches', 'fileToLane', 'designReviewQueue', 'summary'],
  properties: {
    batches: {
      type: 'object',
      description: 'lane id (A|B|C|D) -> array of enriched findings',
      additionalProperties: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true,
          required: ['id', 'lane', 'file', 'resolvedEntityId', 'severity'],
          properties: {
            id: { type: 'string' },
            lane: { type: 'string' },
            file: { type: 'string' },
            severity: { type: 'string' },
            auditLabel: { type: 'string' },
            resolvedEntityId: { type: 'string', description: 'real glossary id, or "fix-by-principle:<principle>"' },
            signs: { type: 'array', items: { type: 'string' } },
            correctivePatterns: { type: 'array', items: { type: 'string' } },
            principles: { type: 'array', items: { type: 'string' } },
            intentionalDesign: { type: 'boolean' },
            summary: { type: 'string' },
          },
        },
      },
    },
    fileToLane: { type: 'object', additionalProperties: { type: 'string' } },
    designReviewQueue: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: true,
        required: ['id', 'lane', 'file', 'reason'],
        properties: {
          id: { type: 'string' },
          lane: { type: 'string' },
          file: { type: 'string' },
          reason: { type: 'string' },
        },
      },
    },
    summary: { type: 'string' },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdicts', 'summary'],
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'ruling', 'rationale'],
        properties: {
          id: { type: 'string' },
          ruling: { type: 'string', enum: ['fix', 'document'] },
          rationale: { type: 'string' },
          howToDocument: { type: 'string', description: 'for ruling=document: code comment / SECURITY.md note / ADR pointer' },
        },
      },
    },
    summary: { type: 'string' },
  },
}

const FIX_RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['lane', 'findings', 'summary'],
  properties: {
    lane: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'status'],
        properties: {
          id: { type: 'string' },
          status: { type: 'string', enum: ['fixed', 'documented', 'skipped', 'failed'] },
          filesTouched: { type: 'array', items: { type: 'string' } },
          testsAdded: { type: 'array', items: { type: 'string' } },
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

const INTEGRATION_SCHEMA = {
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
        required: ['lane', 'message'],
        properties: {
          lane: { type: 'string' },
          sha: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
    finalGateGreen: { type: 'boolean' },
    remaining: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
}

const GUARDRAILS = [
  'Edit ONLY files owned by your lane (see your batch). Never touch another lane\'s file — a different agent owns it concurrently.',
  'Do NOT run git add / git commit / git stash / snapshot.sh — the manager commits sequentially after QA. Concurrent git ops are exactly the race we are fixing.',
  'Do NOT run repo-wide formatters (`bun run format`). Format only the specific files you edit. (A past run caused a 326-file format churn — do not repeat it.)',
  'Do NOT run the full `bun test` / `bats` / gate suite during Fix — other lanes are mutating the tree in parallel and a concurrent run would be flaky. Reason about correctness; write/extend tests; the Verify phase runs the gates once on the merged tree.',
  'TDD: for untested-module/untested-branch findings, add the colocated *.test.ts (or tests/scripts/*.bats) FIRST, written to fail against current gaps, then keep the code correct.',
  'Preserve cross-language parity: any change to a bash twin (verify-ingest.sh, firewall.sh) must keep gate-05 / gate-11 parity with its TS counterpart.',
  'Honor the §5 non-negotiables in TEAM-BRIEF (no embeddings, raw immutable, structural provenance, one active vault, glossary-first).',
]

function fixPrompt(lane, batch, verdictsForLane) {
  return [
    `You are the Lane ${lane} engineer (${AGENT_BY_LANE[lane]}) on the wiki-dev team. Read ${BRIEF} first for your lane contract.`,
    `Fix the audit findings in your batch below. Each carries the oop-excellence entity record (resolvedEntityId, signs, principles, correctivePatterns) read from the repo glossary ${GLOSSARY} — use the corrective patterns as your fix guidance and the principles as the bar.`,
    ``,
    `YOUR BATCH (JSON):`,
    JSON.stringify(batch, null, 2),
    ``,
    `ARCHITECT VERDICTS for the intentional-design findings in your batch (ruling=fix → apply the change; ruling=document → do NOT change behavior, instead add the documented rationale exactly as howToDocument says):`,
    JSON.stringify(verdictsForLane, null, 2),
    ``,
    `GUARDRAILS (hard):`,
    ...GUARDRAILS.map((g) => `- ${g}`),
    ``,
    `For the concurrency cluster (race-condition/deadlock on git.ts, snapshot.ts, snapshot.sh, maintenance-run.sh), implement ONE coherent fix: a single advisory vault lock around all snapshot/commit/log-append paths + a timeout on every execFileSync git call. Keep it DRY (one mechanism).`,
    `For injection findings, never interpolate untrusted/LLM/vault values into shell, awk -v, bun -e, or printf format strings — pass via argv/env and use printf '%s'. For path-traversal, confine with realpath like protect-raw.sh/firewall.sh.`,
    ``,
    `Return the structured result: per-finding status (fixed | documented | skipped | failed), filesTouched, testsAdded, and a short note. Be honest — mark failed/skipped if you could not complete one.`,
  ].join('\n')
}

function repairPrompt(lane, failures) {
  return [
    `You are the Lane ${lane} engineer (${AGENT_BY_LANE[lane]}). The QA gate failed on changes in your area. Repair them.`,
    `Read ${BRIEF} for context. Same guardrails as before (no git/commit, no repo-wide format, edit only your lane's files, do not run the full suite).`,
    ``,
    `GATE FAILURES to fix:`,
    JSON.stringify(failures, null, 2),
    ``,
    `Fix the root cause (do not weaken or delete tests to make them pass unless a test is itself wrong, and say so). Return the structured result.`,
  ].join('\n')
}

function laneOf(file, fileToLane) {
  if (fileToLane && fileToLane[file]) return fileToLane[file]
  // best-effort prefix match
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
          `Read ${BRIEF}. Run: \`bash tests/run-tests.sh tier0\` then \`bash tests/run-tests.sh tier1\`, plus \`bash scripts/validate-docs.sh\`.`,
          `Report allGreen, the gates you ran, and every failure with its file + gate + detail. Coverage must stay >=80% on changed code.`,
        ].join('\n'),
        { agentType: 'wiki-dev-qa-functional', schema: QA_SCHEMA, phase: 'Verify', label: `qa-functional:${label}` },
      ),
    () =>
      agent(
        [
          `You are wiki-dev-qa-adversarial. Verify the security + concurrency fixes empirically and re-check the non-negotiables (no embeddings on the retrieval path = gate-13, raw immutability, fail-closed write confinement). Do NOT commit.`,
          `Read ${BRIEF}. Focus: (1) no untrusted value reaches a shell/awk/bun -e/printf-format sink; (2) snapshot/commit/log-append go through one advisory lock and every git execFileSync has a timeout; (3) path-traversal is realpath-confined. Run tier2 smoke if a \`claude\` CLI is present (\`bash tests/run-tests.sh tier2\`), else note it self-skipped.`,
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
    `You are the Resolve step for the wiki-dev fix workflow. Read two files:`,
    `1. The vendored oop-excellence entity glossary: ${GLOSSARY}`,
    `2. The audit findings registry: ${REGISTRY}`,
    ``,
    `For EACH finding in the registry: confirm or correct its suggestedEntityId against the glossary's real entity ids (e.g. command/format/path/prompt-injection and ReDoS all map to the "injection" entity; "untested-module"/"untested-branch" -> "untested-code-path"). When no glossary entity fits (e.g. layering-violation, hub-like-dependency, unbounded-blocking), set resolvedEntityId to "fix-by-principle:<principle>" naming the violated principle. Attach the entity's signs, principles, and corrective_patterns from the glossary onto the finding.`,
    ``,
    `Then group the enriched findings into per-lane batches keyed by the finding's lane (A|B|C|D). Build fileToLane mapping every distinct file path in the registry to its single owning lane. Build designReviewQueue = every finding with intentionalDesign:true (these need an architect ruling before any change).`,
    ``,
    `Return the structured RESOLVE output. Read-only — do not edit anything.`,
  ].join('\n'),
  { schema: RESOLVE_SCHEMA, phase: 'Resolve', label: 'resolve' },
)

log(
  `Resolved ${Object.values(resolve.batches || {}).reduce((n, b) => n + b.length, 0)} findings into lanes ` +
    LANES.map((l) => `${l}:${(resolve.batches?.[l] || []).length}`).join(' ') +
    ` · ${resolve.designReviewQueue?.length || 0} need architect review`,
)

// ===================== PHASE 2: Design-review =====================
phase('Design-review')
let verdicts = { verdicts: [], summary: 'no design-review items' }
if ((resolve.designReviewQueue || []).length > 0) {
  verdicts = await agent(
    [
      `You are wiki-dev-architect. Read ${BRIEF} (especially the §5 non-negotiables and the four-layer contract).`,
      `The user asked to fix ALL findings, but the following were flagged intentional-by-design. For EACH, rule "fix" (the change is safe and improves the code without violating a non-negotiable or the established functional/parity style) or "document" (changing it would fight an intentional decision — instead record the rationale via a code comment, a SECURITY.md note, or a short docs/adr/ pointer). Give a one-line rationale; for "document" give the exact howToDocument.`,
      ``,
      `Known intentional context: report.ts/config.ts use a deliberate functional (data + free-function) style; firewall.ts↔firewall.sh and verify text/JSON are deliberate PARITY twins (do not break gate-05/gate-11); some prompt-injection gaps are acknowledged in SECURITY.md (raw body content is untrusted by design); cli.ts "planned" capability stubs are a deliberate registry pattern.`,
      ``,
      `DESIGN-REVIEW QUEUE (JSON):`,
      JSON.stringify(resolve.designReviewQueue, null, 2),
      ``,
      `Return the structured verdicts.`,
    ].join('\n'),
    { agentType: 'wiki-dev-architect', schema: VERDICT_SCHEMA, phase: 'Design-review', label: 'architect' },
  )
  log(
    `Architect ruled: ${verdicts.verdicts.filter((v) => v.ruling === 'fix').length} fix, ` +
      `${verdicts.verdicts.filter((v) => v.ruling === 'document').length} document`,
  )
}
const verdictById = {}
for (const v of verdicts.verdicts || []) verdictById[v.id] = v

// ===================== PHASE 3: Fix (parallel lanes) =====================
phase('Fix')
const fixResults = (
  await parallel(
    LANES.map((lane) => () => {
      const batch = resolve.batches?.[lane] || []
      if (batch.length === 0) return Promise.resolve({ lane, findings: [], summary: 'no findings for this lane' })
      const verdictsForLane = batch.map((f) => verdictById[f.id]).filter(Boolean)
      return agent(fixPrompt(lane, batch, verdictsForLane), {
        agentType: AGENT_BY_LANE[lane],
        schema: FIX_RESULT_SCHEMA,
        phase: 'Fix',
        label: `fix:lane-${lane}`,
      })
    }),
  )
).filter(Boolean)

const totalFixed = fixResults.reduce((n, r) => n + (r.findings || []).filter((f) => f.status === 'fixed').length, 0)
const totalDoc = fixResults.reduce((n, r) => n + (r.findings || []).filter((f) => f.status === 'documented').length, 0)
const totalFail = fixResults.reduce((n, r) => n + (r.findings || []).filter((f) => f.status === 'failed' || f.status === 'skipped').length, 0)
log(`Fix complete: ${totalFixed} fixed, ${totalDoc} documented, ${totalFail} failed/skipped`)

// ===================== PHASE 4: Verify (+ bounded repair loop) =====================
phase('Verify')
let qa = (await runVerify('r0')).filter(Boolean)
let round = 0
const MAX_ROUNDS = 2
function allGreen(qaArr) {
  return qaArr.length > 0 && qaArr.every((q) => q && q.allGreen)
}
const repairLog = []
while (!allGreen(qa) && round < MAX_ROUNDS) {
  round++
  const failures = qa.flatMap((q) => (q && q.failures) || [])
  const lanesToRepair = [...new Set(failures.map((f) => laneOf(f.file, resolve.fileToLane)).filter(Boolean))]
  const target = lanesToRepair.length > 0 ? lanesToRepair : LANES // if unmapped, let all lanes look
  log(`Verify red (round ${round}); repairing lanes ${target.join(',')} for ${failures.length} failure(s)`)
  const repairs = (
    await parallel(
      target.map((lane) => () =>
        agent(repairPrompt(lane, failures), {
          agentType: AGENT_BY_LANE[lane],
          schema: FIX_RESULT_SCHEMA,
          phase: 'Fix',
          label: `repair:lane-${lane}:r${round}`,
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
    `You are wiki-dev-manager. Read ${BRIEF}. The lane engineers have applied fixes on branch ${BRANCH} (off ${BASE}); QA has run.`,
    `QA RESULT (allGreen across both QA roles = ${allGreen(qa)}):`,
    JSON.stringify(qa, null, 2),
    ``,
    `FIX RESULTS by lane:`,
    JSON.stringify(fixResults, null, 2),
    ``,
    allGreen(qa)
      ? `QA is green. Commit the work in SEQUENTIAL per-lane commits (one conventional commit per lane that has changes, e.g. \`fix(lane-c): resolve concurrency cluster + untested core modules\`). Run commits one at a time — never concurrently. Stage only the relevant paths per commit. After committing, run the final full gate once: \`bash tests/run-tests.sh && bash scripts/validate-docs.sh\` and report finalGateGreen.`
      : `QA is NOT green after the repair rounds. Do NOT commit. Summarize exactly what remains red so a human can finish. Set committed:false, finalGateGreen:false, and list the remaining issues.`,
    ``,
    `Return the structured integration result.`,
  ].join('\n'),
  { agentType: 'wiki-dev-manager', schema: INTEGRATION_SCHEMA, phase: 'Integrate', label: 'manager' },
)

return {
  branch: BRANCH,
  base: BASE,
  resolved: Object.fromEntries(LANES.map((l) => [l, (resolve.batches?.[l] || []).length])),
  designVerdicts: verdicts.verdicts,
  fixResults,
  repairRounds: round,
  qa,
  integration,
}
