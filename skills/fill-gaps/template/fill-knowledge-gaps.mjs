export const meta = {
  name: 'fill-knowledge-gaps',
  description:
    "Drives the claude-wiki-pages agents + engine to complete a vault: stages curated repo sources, ingests them by topic, authors topic hub pages, resolves every dangling wikilink, enriches thin pages, then heals + polishes + verifies — proving a zero-dangling, hub-concentrated knowledge graph. Sequential write phases; read-only measurement gates. Materialized into a project by the /claude-wiki-pages:fill-gaps skill.",
  whenToUse:
    "When a wiki has dangling [[links]] (empty graph nodes) or thin coverage and you want a complete, topic-clustered wiki without authoring pages by hand.",
  phases: [
    { title: 'Resolve+Baseline', detail: 'resolve paths, assert vault, baseline verify + graph-quality' },
    { title: 'Stage', detail: 'cp curated repo sources into raw/repo/<topic>/' },
    { title: 'Ingest', detail: 'one ingest-agent run per topic, pre-approved' },
    { title: 'Hubs', detail: 'author the core topic hub pages' },
    { title: 'Dangling', detail: 'create backed pages → curator fix → prose-ify the rest' },
    { title: 'Enrich', detail: 'update thin/shallow pages from sources' },
    { title: 'HealPolish', detail: 'curator heal → polish → engine verify' },
    { title: 'Measure', detail: 'dangling scan + cluster metric + hub spot-check + gates' },
  ],
}

// ── Inputs ───────────────────────────────────────────────────────────────────
let a = args || {}
if (typeof a === 'string') {
  try { a = JSON.parse(a) } catch { a = {} }
}
const REPO = a.repoDir // absolute path to the repo/worktree checkout
const VAULT = a.vault // absolute path to <repo>/docs/<...>-vault
if (!REPO || !VAULT) {
  throw new Error('fill-knowledge-gaps: args.repoDir and args.vault (absolute paths) are required')
}
// Quality-gate thresholds (override via args).
const CN_MIN = a.cnMin ?? 0.85
const CH_MIN = a.chMin ?? 0.3

// Every agent operates on the worktree copy. This preamble is prepended to every
// prompt so vault resolution can never drift to another checkout (the R1 trap).
const SCOPE = `You are operating on ONE specific vault. Before any command, \`cd ${REPO}\`. ` +
  `The vault is EXACTLY ${VAULT}. Always pass \`--target ${VAULT}\` to engine.sh / snapshot.sh / ` +
  `graph-quality.sh, and export CLAUDE_WIKI_PAGES_VAULT=${VAULT}. If any tool resolves a DIFFERENT ` +
  `vault path, STOP and report — do not write. Never touch any path outside ${REPO}.`

// The 7 core topic clusters → staged subpath → curated repo files (high-signal,
// NOT a full-repo dump). Paths are relative to the repo root.
const TOPICS = [
  { key: 'engine', files: [
    'src/CLAUDE.md', 'src/cli/CLAUDE.md', 'src/commands/CLAUDE.md', 'src/core/CLAUDE.md', 'src/data/CLAUDE.md',
    'src/cli/cli.ts', 'src/commands/search/search.ts', 'src/commands/search/CLAUDE.md',
    'src/commands/verify/verify.ts', 'src/commands/route/route.ts', 'src/commands/route/CLAUDE.md',
    'src/commands/snapshot/snapshot.ts', 'src/commands/snapshot/CLAUDE.md',
    'src/commands/propose/propose.ts', 'src/commands/propose/CLAUDE.md',
    'src/core/graph.ts', 'src/core/moc-build.ts', 'src/core/stem.ts', 'src/core/vocabulary.ts',
    'src/core/schema.ts', 'src/core/provenance.ts', 'src/core/firewall.ts',
    'scripts/CLAUDE.md', 'scripts/engine.sh', 'skills/engine-api/SKILL.md',
  ] },
  { key: 'plugin', files: [
    'CLAUDE.md', 'README.md', '.claude-plugin/plugin.json',
    'agents/claude-wiki-pages-ingest-agent.md', 'agents/claude-wiki-pages-curator-agent.md',
    'agents/claude-wiki-pages-polish-agent.md', 'agents/claude-wiki-pages-analyst-agent.md',
    'agents/claude-wiki-pages-orchestrator-agent.md', 'agents/claude-wiki-pages-maintenance-agent.md',
    'agents/claude-wiki-pages-onboarding-agent.md',
  ] },
  { key: 'wiki-pages', files: [
    'skills/ingest/SKILL.md', 'skills/ingest-pipeline/SKILL.md', 'skills/curator-fixes/SKILL.md',
    'skills/query/SKILL.md', 'skills/search/SKILL.md', 'skills/synthesize/SKILL.md', 'skills/maintain-contract/SKILL.md',
  ] },
  { key: 'llm', files: ['SOFTWARE-3-0.md', 'skills/draft/SKILL.md', 'skills/analyst-modes/SKILL.md'] },
  { key: 'obsidian', files: [
    'skills/obsidian-markdown/SKILL.md', 'skills/obsidian-graph-colors/SKILL.md',
    'skills/obsidian-cli/SKILL.md', 'skills/obsidian-bases/SKILL.md', 'skills/obsidian-vault/SKILL.md',
  ] },
  { key: 'knowledge-graph', files: [
    'schemas/config.schema.json', 'docs/vault-example/CLAUDE.md', 'src/core/wikilinks.ts', 'src/core/frontmatter.ts',
  ] },
  { key: 'how-it-works', files: [
    'skills/onboarding/SKILL.md', 'skills/init/SKILL.md', 'skills/status/SKILL.md', 'skills/sync/SKILL.md',
  ] },
]

const HUBS = [
  { title: 'claude-wiki-pages Plugin', type: 'topic', folder: 'plugin' },
  { title: 'Wiki Pages', type: 'topic', folder: 'wiki-pages' },
  { title: 'LLM', type: 'topic', folder: 'llm' },
  { title: 'Obsidian', type: 'topic', folder: 'obsidian' },
  { title: 'Wiki Engine', type: 'topic', folder: 'engine' },
  { title: 'Knowledge Graph', type: 'concept', folder: 'knowledge-graph' },
  { title: 'How It Works', type: 'topic', folder: 'how-it-works' },
]

const METRIC_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['danglingCount', 'verifyErrors', 'verifyWarnings', 'Cn', 'Ch', 'nodes', 'edgesTotal'],
  properties: {
    danglingCount: { type: 'number' }, verifyErrors: { type: 'number' }, verifyWarnings: { type: 'number' },
    Cn: { type: 'number' }, Ch: { type: 'number' }, nodes: { type: 'number' }, edgesTotal: { type: 'number' },
    hubsSubstantive: { type: 'boolean' }, note: { type: 'string' },
  },
}

const measurePrompt = (extra = '') =>
  `${SCOPE}\nRead-only measurement. Run, capturing JSON:\n` +
  `  bash ${REPO}/scripts/graph-quality.sh --target ${VAULT} --json\n` +
  `  bash ${REPO}/scripts/engine.sh verify --target ${VAULT} --json\n` +
  `Return danglingCount, Cn, Ch, nodes, edgesTotal from graph-quality, and verifyErrors/verifyWarnings ` +
  `from verify. ${extra} Create NO files.`

// ── Phase 0 — Resolve + Baseline ─────────────────────────────────────────────
phase('Resolve+Baseline')
const baseline = await agent(
  measurePrompt(
    `Also assert: the realpath of ${VAULT} is under ${REPO} AND \`git -C ${REPO} rev-parse --show-toplevel\` ` +
    `equals ${REPO}. If either fails, set note to the mismatch and danglingCount to -1 (the workflow will abort).`),
  { label: 'baseline', phase: 'Resolve+Baseline', model: 'haiku', schema: METRIC_SCHEMA })
if (!baseline || baseline.danglingCount < 0) {
  throw new Error(`Phase 0 abort — vault/worktree assertion failed: ${baseline ? baseline.note : 'no result'}`)
}
log(`baseline: dangling=${baseline.danglingCount} verify=${baseline.verifyErrors}/${baseline.verifyWarnings} ` +
  `Cn=${baseline.Cn} Ch=${baseline.Ch} nodes=${baseline.nodes}`)

// ── Phase A — Stage curated sources (NEW files only) ─────────────────────────
phase('Stage')
const stageList = TOPICS.map(t => `# raw/repo/${t.key}/\n${t.files.join('\n')}`).join('\n')
await agent(
  `${SCOPE}\nStage curated repo sources for ingest. Steps:\n` +
  `1. bash ${REPO}/scripts/snapshot.sh pre --target ${VAULT}\n` +
  `2. For each topic below, \`mkdir -p ${VAULT}/raw/repo/<topic>/\` and **cp** each listed file (preserve ` +
  `basename) from ${REPO}/<path> into it. Use ONLY bash \`cp\` + \`mkdir\` — NEVER the Write/Edit tools, ` +
  `NEVER overwrite a file that already exists under raw/. Skip any source path that is missing (log it).\n` +
  `3. bash ${REPO}/scripts/snapshot.sh post --target ${VAULT} --label "fill-gaps: stage curated repo sources"\n` +
  `Report the count copied per topic.\n\nTOPICS:\n${stageList}`,
  { label: 'stage', phase: 'Stage', model: 'haiku' })

// ── Phase B — Ingest, sequential, one run per topic, pre-approved ─────────────
phase('Ingest')
for (const t of TOPICS) {
  await agent(
    `${SCOPE}\nThe vault has new sources under raw/repo/${t.key}/. Ingest ONLY those into wiki/${t.key}/.\n` +
    `PRE-APPROVAL OVERRIDE: the user has PRE-APPROVED the topic-tree plan. Write the plan file to ` +
    `output/ for the record, then proceed autonomously through Step 1.4 — DO NOT stop at the confirmation ` +
    `gate; treat it as 'approve'. Continue to page creation.\n` +
    `Place every entity/concept page under wiki/${t.key}/. If raw/repo/${t.key}/ has >25 sources, process ` +
    `the first 25 and report the rest. You may skip your own synthesis step — the workflow owns that. ` +
    `Honor the HARD RULE: never create a [[wikilink]] to a page that does not (yet) exist.`,
    { label: `ingest:${t.key}`, phase: 'Ingest', agentType: 'claude-wiki-pages:claude-wiki-pages-ingest-agent' })
}

// ── Phase C — Author the topic hub pages ─────────────────────────────────────
phase('Hubs')
const hubList = HUBS.map(h => `- "${h.title}" (type: ${h.type}) at wiki/${h.folder}/${h.folder}.md → cluster wiki/${h.folder}/`).join('\n')
await agent(
  `${SCOPE}\nAuthor the core topic HUB pages so the graph concentrates on them. For each hub below: write/update ` +
  `wiki/<folder>/<folder>.md from the matching _templates/<type>.md skeleton, ALL sections filled (no empty ` +
  `sections), with quoted "[[wikilink]]" frontmatter linking EVERY page currently in that cluster folder ` +
  `(use key_pages and/or related, and children/child_indexes where it is the folder note), and body ` +
  `[[wikilinks]] to each. \`title\` MUST be the first entry in \`aliases\`. HARD RULE: only link pages that ` +
  `actually exist on disk now. Update wiki/index.md to list each hub. Self-checkpoint via snapshot pre/post, ` +
  `label "fill-gaps: author hub pages".\n\nHUBS:\n${hubList}`,
  { label: 'hubs', phase: 'Hubs', agentType: 'claude-wiki-pages:claude-wiki-pages-ingest-agent' })

// ── Phase D — Resolve dangling links (create → fix → prose-ify) ───────────────
phase('Dangling')
// D1 — resolve-by-creation for recurring concepts that have a backing source.
await agent(
  `${SCOPE}\nResolve dangling wikilinks by CREATION. First run ` +
  `\`bash ${REPO}/scripts/graph-quality.sh --target ${VAULT} --json\` to get the current dangling list. ` +
  `For every dangling target that is a RECURRING CONCEPT (>=2 refs) AND is backed by an existing ` +
  `wiki/_sources/ summary or a clearly relevant raw/ source, AUTHOR a substantive typed page (concept or ` +
  `entity) in the correct topic cluster folder, grounded in that source, ALL template sections filled, ` +
  `sources: set with a real [[_sources/...]] citation. NEVER an empty stub. Do NOT create pages for ` +
  `Obsidian/markdown primitives (wikilink, links, etc.) or generic nouns — those are handled later. ` +
  `Self-checkpoint, label "fill-gaps: create pages for dangling concepts".`,
  { label: 'dangling-create', phase: 'Dangling', agentType: 'claude-wiki-pages:claude-wiki-pages-ingest-agent' })
// D2 — curator heal: alias/unique-fuzzy link fixes + connect orphans (git-checkpointed, no prompt).
await agent(
  `${SCOPE}\nRun the standard git-checkpointed auto-heal: engine.sh heal first, then the curator auto-fixes ` +
  `including resolve-broken-wikilinks (alias / unique-fuzzy) and connect-orphans, applied automatically ` +
  `(safety is git revert). Then report any broken wikilinks that still had NO match — that residual list is ` +
  `the prose-ify backlog for the next step.`,
  { label: 'dangling-heal', phase: 'Dangling', agentType: 'claude-wiki-pages:claude-wiki-pages-curator-agent' })
// D2b — prose-ify the true one-offs and Obsidian primitives.
await agent(
  `${SCOPE}\nFinal dangling mop-up. Run \`bash ${REPO}/scripts/graph-quality.sh --target ${VAULT} --json\`. ` +
  `For EVERY remaining dangling target, rewrite the offending \`[[Target]]\` in each citing page to ` +
  `backticked \`Target\` or plain prose (whichever reads naturally). This covers Obsidian/markdown ` +
  `primitives (wikilink, wikilinks, links, Source Title, Required Fields, …) and any true one-off not ` +
  `worth a page. NEVER create a stub to satisfy a link. Edit only wiki/ page bodies under ${VAULT}. ` +
  `Goal: graph-quality danglingCount → 0. Run snapshot pre/post around your edits, label ` +
  `"fill-gaps: prose-ify residual dangling links". Re-run graph-quality at the end and report the count.`,
  { label: 'prose-ify', phase: 'Dangling', model: 'sonnet' })

// ── Phase E — Enrich thin pages ──────────────────────────────────────────────
phase('Enrich')
await agent(
  `${SCOPE}\nEnrich thin pages. Identify wiki/ content pages whose body is < 25 lines, OR that have empty ` +
  `template sections, OR confidence < 0.6 with a single source. For each, UPDATE it (prefer-update: ` +
  `increment update_count, append any new [[_sources/...]]) using its existing sources: and the newly ` +
  `staged raw/repo/* material — especially the engine / llm / obsidian topics that were thinly covered. ` +
  `Do NOT create duplicates and do NOT introduce new dangling links. Self-checkpoint, label ` +
  `"fill-gaps: enrich thin pages".`,
  { label: 'enrich', phase: 'Enrich', agentType: 'claude-wiki-pages:claude-wiki-pages-ingest-agent' })

// ── Phase F — Heal + Polish + Verify ─────────────────────────────────────────
phase('HealPolish')
await agent(
  `${SCOPE}\nFinal auto-heal: engine.sh heal then the curator auto-fixes and judgment fixes, all ` +
  `git-checkpointed. Report the heal commit and any surfaced residual items.`,
  { label: 'final-heal', phase: 'HealPolish', agentType: 'claude-wiki-pages:claude-wiki-pages-curator-agent' })
await agent(
  `${SCOPE}\nPolish: apply graph colors for the 7 top-level topic folders (plugin, wiki-pages, llm, obsidian, ` +
  `engine, knowledge-graph, how-it-works), regenerate wiki/index.md from folder notes, and reconcile every ` +
  `folder note's children/child_indexes. Self-checkpoint.`,
  { label: 'polish', phase: 'HealPolish', agentType: 'claude-wiki-pages:claude-wiki-pages-polish-agent' })

// ── Phase G — Measure + gates ────────────────────────────────────────────────
phase('Measure')
const final = await agent(
  measurePrompt(
    `Also read the 7 hub pages (wiki/<folder>/<folder>.md for plugin, wiki-pages, llm, obsidian, engine, ` +
    `knowledge-graph, how-it-works) and set hubsSubstantive=true iff each exists with filled sections, ` +
    `>=5 outbound [[links]], and >=1 sources entry.`),
  { label: 'measure', phase: 'Measure', model: 'haiku', schema: METRIC_SCHEMA })

const gates = {
  noDangling: final && final.danglingCount === 0,
  verifyClean: final && final.verifyErrors === 0 && final.verifyWarnings === 0,
  nodeConcentration: final && final.Cn >= CN_MIN,
  hubConcentration: final && final.Ch >= CH_MIN,
  hubsSubstantive: !!(final && final.hubsSubstantive),
}
const pass = Object.values(gates).every(Boolean)
if (!pass) {
  log(`QUALITY GATES FAILED ${JSON.stringify(gates)} — final ${JSON.stringify(final)}. ` +
    `Inspect the last write phase and \`git revert\` its checkpoint if needed.`)
} else {
  log(`ALL GATES PASS — dangling 0, verify clean, Cn=${final.Cn} (>=${CN_MIN}), Ch=${final.Ch} (>=${CH_MIN})`)
}

return { repo: REPO, vault: VAULT, thresholds: { CN_MIN, CH_MIN }, baseline, final, gates, pass }
