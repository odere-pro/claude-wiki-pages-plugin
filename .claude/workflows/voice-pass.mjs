export const meta = {
  name: 'voice-pass',
  description:
    'Define the house writing voice with the wiki-brainstorm personas, then apply it across the docs — Karpathy-simple for explanatory prose, precise for engineers, LLM artifacts removed, vocabulary synced. Uses skills/voice as the rubric.',
  whenToUse:
    'To define/refine skills/voice and run a repo-wide tone + vocabulary pass. Run once with stopAfter="converge" to review the vocabulary change-set, then again to apply.',
  phases: [
    { title: 'Define', detail: 'brainstorm personas (read-only) critique the draft voice + propose vocabulary simplifications' },
    { title: 'Converge', detail: 'PM + architect + skeptic finalize the voice guide and a conservative vocabulary change-set; write it to tmp' },
    { title: 'Apply', detail: 'one editor per doc rewrites prose to the voice + applies the change-set; frontmatter/raw/glossary defs untouched' },
    { title: 'Verify', detail: 'QA functional + adversarial run the gates and a meaning-preservation pass; bounded repair loop' },
  ],
}

// ---- args ----
// { docFiles: string[], voiceSkillPath, changesetPath, briefPath, rolesDir, applyVocab, stopAfter }
let A = args || {}
if (typeof A === 'string') {
  try {
    A = JSON.parse(A)
  } catch {
    A = {}
  }
}
const DOC_FILES = Array.isArray(A.docFiles) ? A.docFiles : []
const VOICE = A.voiceSkillPath || 'skills/voice/SKILL.md'
const CHANGESET = A.changesetPath || 'tmp/plan/voice-vocab-changeset.json'
const BRIEF = A.briefPath || '.claude/teams/wiki-brainstorm/TEAM-BRIEF.md'
const ROLES = A.rolesDir || '.claude/teams/wiki-brainstorm/roles'
const GATE = 'scripts/validate-docs.sh'
const APPLY_VOCAB = A.applyVocab !== false
const STOP_AFTER = A.stopAfter || null

// The brainstorm personas are role .md prompt files, not registered agent types.
// Each Define agent reads its role file + the brief, then proposes (read-only).
const DEFINE_PERSONAS = [
  'structure-authoring-architect',
  'new-claude-user',
  'plugin-expert',
  'ontology-engineer',
  'skeptic',
  'product-manager',
]

// ---- schemas ----
const PROPOSAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['persona', 'voiceNotes', 'vocabCandidates', 'summary'],
  properties: {
    persona: { type: 'string' },
    voiceNotes: {
      type: 'array',
      description: 'Concrete additions/corrections for skills/voice (rules, blocklist items, register guidance).',
      items: { type: 'string' },
    },
    vocabCandidates: {
      type: 'array',
      description: 'Proposed canonical-term simplifications.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['from', 'to', 'why'],
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          why: { type: 'string' },
          risk: { type: 'string', description: 'gate/GLOSSARY blast radius' },
        },
      },
    },
    summary: { type: 'string' },
  },
}

const CONVERGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['voiceSkillFinalized', 'changeSetWritten', 'vocabChangeSet', 'summary'],
  properties: {
    voiceSkillFinalized: { type: 'boolean', description: 'true if skills/voice was edited/confirmed' },
    changeSetWritten: { type: 'boolean', description: 'true if tmp changeset file was written' },
    vocabChangeSet: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['from', 'to', 'scope', 'gateImpact'],
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          scope: { type: 'string', description: 'where it applies (prose only / incl GLOSSARY row / etc)' },
          gateImpact: { type: 'string', description: 'validate-docs.sh edits this rename requires' },
        },
      },
    },
    summary: { type: 'string' },
  },
}

const APPLY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['file', 'status', 'register', 'artifactsRemoved', 'summary'],
  properties: {
    file: { type: 'string' },
    status: { type: 'string', enum: ['rewritten', 'light-touch', 'unchanged', 'skipped', 'failed'] },
    register: { type: 'string', enum: ['explanatory', 'engineer', 'mixed', 'n/a'] },
    artifactsRemoved: { type: 'array', items: { type: 'string' } },
    vocabApplied: { type: 'array', items: { type: 'string' } },
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

const VOICE_GUARDRAILS = [
  `Read ${VOICE} and follow it exactly — it is the rubric. Pick the register by audience: explanatory (Karpathy-simple) for what/why prose, engineer (precise) for contracts, design, ADRs, SECURITY.`,
  'NEVER edit YAML frontmatter (anything between the opening --- and closing --- at the top of a file). Prose body only.',
  'NEVER touch docs/claude-wiki-pages-plugin-vault/** (raw/ is immutable, wiki/ is LLM-maintained), and never rewrite a GLOSSARY term definition (only its prose intro is eligible).',
  'Preserve meaning, code blocks, commands, links, counts, and anchors exactly. This is a tone pass, not a content rewrite.',
  'Keep the doc gate green: glossary terms canonical; discoverability/SEO words only in README tagline + plugin.json/marketplace.json (Check 1); no retired terms (Check 0); slash commands namespaced as /claude-wiki-pages:<name> (Checks 3/4); "Layer N — Name" Title Case (Check 2); any stated count must stay true (Check 5d).',
  'ADRs and CHANGELOG are records: remove LLM artifacts and fix obvious stiffness, but do NOT rewrite decisions or history.',
  'Remove LLM artifacts per the blocklist in the voice skill (em-dash drama, filler openers, hype adjectives, "not just X it\'s Y", hedge stacks, over-bolding, echo summaries, robotic triads).',
]

function personaPrompt(persona) {
  return [
    `You are the wiki-brainstorm persona "${persona}". Read your role file ${ROLES}/${persona}.md and ${BRIEF} in full first; adopt that lens. This is Round 1 (divergence): produce independently, read-only, cite paths.`,
    `Read the draft voice skill ${VOICE} and a representative sample of the docs in scope (read 4-6 of: ${DOC_FILES.slice(0, 12).join(', ')}).`,
    ``,
    `Through your lens, propose: (1) concrete additions or corrections to ${VOICE} — missing register guidance, blocklist items, or notes-authoring rules; (2) canonical-term simplifications that would help a newcomer WITHOUT breaking the doc gate or forking docs/GLOSSARY.md. For each vocab candidate give from/to/why and the gate or GLOSSARY blast radius.`,
    `Honor the non-negotiables (no embeddings, structural provenance, DRY single-sourcing, glossary-first, register separation). The Skeptic persona should default to "change nothing unless it clearly helps" on vocabulary.`,
    `Return the structured proposal. Do not edit any file.`,
  ].join('\n')
}

// ===================== PHASE 1: Define =====================
phase('Define')
const proposals = (
  await parallel(
    DEFINE_PERSONAS.map((p) => () =>
      agent(personaPrompt(p), { schema: PROPOSAL_SCHEMA, phase: 'Define', label: `define:${p}` }),
    ),
  )
).filter(Boolean)
log(
  `Define: ${proposals.length} personas reported · ` +
    `${proposals.reduce((n, p) => n + (p.vocabCandidates || []).length, 0)} vocab candidates raised`,
)

// ===================== PHASE 2: Converge =====================
phase('Converge')
const converge = await agent(
  [
    `You are the convergence step, acting as the wiki-brainstorm Product Manager (facilitator) with the Architect's coherence sign-off and the Skeptic's veto. Read ${BRIEF}, ${ROLES}/product-manager.md, ${ROLES}/architect.md, and ${ROLES}/skeptic.md first.`,
    ``,
    `PERSONA PROPOSALS (JSON):`,
    JSON.stringify(proposals, null, 2),
    ``,
    `Do two things:`,
    `1. Finalize ${VOICE}: fold in the surviving voiceNotes by EDITING that file in place (keep its frontmatter; it must keep disable-model-invocation: true). Keep it tight and DRY — it is the single source for the voice.`,
    `2. Build a CONSERVATIVE vocabulary change-set: only renames that clearly help a newcomer and survive the Skeptic (KISS/DRY/register-separation). For each: from, to, scope, and the exact validate-docs.sh / docs/GLOSSARY.md edits it implies (gateImpact). Reject anything that forks the schema or churns a load-bearing term. WRITE the change-set as JSON to ${CHANGESET} (create tmp/plan/ if needed).`,
    ``,
    `Conflict order: non-negotiables win; a Skeptic veto stands unless explicitly overridden with a logged alternative; ties go to you (the facilitator), with the discarded option recorded in the summary.`,
    `Return the structured converge result. If the change-set is empty (nothing clears the bar), that is a valid, often correct outcome — say so.`,
  ].join('\n'),
  { schema: CONVERGE_SCHEMA, phase: 'Converge', label: 'converge:pm+architect+skeptic' },
)
log(
  `Converge: voice finalized=${converge.voiceSkillFinalized}, ` +
    `${(converge.vocabChangeSet || []).length} vocab renames approved, written=${converge.changeSetWritten}`,
)

if (STOP_AFTER === 'converge') {
  return {
    stoppedAfter: 'converge',
    proposals: proposals.length,
    converge,
    next: `Review ${CHANGESET}, then re-run voice-pass with the same docFiles and no stopAfter to Apply + Verify.`,
  }
}

// ===================== PHASE 3: Apply (pipeline per doc) =====================
phase('Apply')
function editorPrompt(file) {
  return [
    `You are wiki-dev-eng-ux (you own docs/ and the UX/DX surface). Do a tone + vocabulary pass on ONE file: ${file}.`,
    ``,
    `GUARDRAILS (hard):`,
    ...VOICE_GUARDRAILS.map((g) => `- ${g}`),
    ``,
    APPLY_VOCAB
      ? `Apply the approved vocabulary change-set from ${CHANGESET} (read it) wherever the old term appears in this file's prose.`
      : `Do NOT change vocabulary this round; tone + artifact removal only.`,
    ``,
    `Edit ${file} in place. Choose the register by the file's audience. Leave it unchanged if it already reads well — say so. Return the structured result (status, register, artifactsRemoved, vocabApplied, summary).`,
  ].join('\n')
}
const applied = (
  await pipeline(DOC_FILES, (file) =>
    agent(editorPrompt(file), { agentType: 'wiki-dev-eng-ux', schema: APPLY_SCHEMA, phase: 'Apply', label: `apply:${file}` }),
  )
).filter(Boolean)
const changed = applied.filter((r) => r.status === 'rewritten' || r.status === 'light-touch')
log(`Apply: ${changed.length}/${applied.length} files edited`)

// ===================== PHASE 4: Verify (+ bounded repair) =====================
phase('Verify')
async function runVerify(label) {
  return (
    await parallel([
      () =>
        agent(
          [
            `You are wiki-dev-qa-functional. The voice pass edited docs on the current working tree (do NOT commit).`,
            `Run \`bash ${GATE}\` and \`bash tests/run-tests.sh tier0\` (markdownlint gate-10 included). Report allGreen, gatesRun, and every failure with file + gate + detail.`,
            `Count a failure against allGreen ONLY if the voice pass caused it; known pre-existing environment-only failures go under notes, not failures.`,
          ].join('\n'),
          { agentType: 'wiki-dev-qa-functional', schema: QA_SCHEMA, phase: 'Verify', label: `qa-functional:${label}` },
        ),
      () =>
        agent(
          [
            `You are wiki-dev-qa-adversarial. Verify the tone pass preserved meaning and did not break contracts. Do NOT commit.`,
            `Check: (1) no YAML frontmatter changed; (2) no edits under docs/claude-wiki-pages-plugin-vault/**; (3) no SEO/discoverability term leaked onto a technical surface (Check 1) and no retired term reintroduced (Check 0); (4) every slash command still namespaced and resolvable; (5) no stated count drifted; (6) code blocks, commands, and links intact. Spot-read 6-10 edited files.`,
            `Report allGreen, checks run, and any regression as a failure with file + detail.`,
          ].join('\n'),
          { agentType: 'wiki-dev-qa-adversarial', schema: QA_SCHEMA, phase: 'Verify', label: `qa-adversarial:${label}` },
        ),
    ])
  ).filter(Boolean)
}
function allGreen(qaArr) {
  return qaArr.length > 0 && qaArr.every((q) => q && q.allGreen)
}
let qa = await runVerify('r0')
let round = 0
const MAX_ROUNDS = 3
const repairLog = []
while (!allGreen(qa) && round < MAX_ROUNDS) {
  round++
  const failures = qa.flatMap((q) => (q && q.failures) || [])
  const files = [...new Set(failures.map((f) => f.file).filter(Boolean))]
  const target = files.length > 0 ? files : DOC_FILES.slice(0, 8)
  log(`Verify red (round ${round}); repairing ${target.length} file(s)`)
  const repairs = (
    await parallel(
      target.map((file) => () =>
        agent(
          [
            `You are wiki-dev-eng-ux. The doc gate failed on ${file} after the voice pass. Fix the gate failure(s) below without losing the voice improvements.`,
            ...VOICE_GUARDRAILS.map((g) => `- ${g}`),
            ``,
            `FAILURES:`,
            JSON.stringify(failures.filter((f) => f.file === file || !f.file), null, 2),
            `Edit ${file} in place. Return the structured result.`,
          ].join('\n'),
          { agentType: 'wiki-dev-eng-ux', schema: APPLY_SCHEMA, phase: 'Apply', label: `repair:${file}:r${round}` },
        ),
      ),
    )
  ).filter(Boolean)
  repairLog.push({ round, target, repairs })
  qa = await runVerify(`r${round}`)
}

return {
  proposals: proposals.length,
  converge,
  applied,
  filesChanged: changed.length,
  repairRounds: round,
  gatesGreen: allGreen(qa),
  qa,
}
