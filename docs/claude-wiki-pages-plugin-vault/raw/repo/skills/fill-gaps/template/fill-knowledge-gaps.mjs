export const meta = {
  name: 'fill-knowledge-gaps',
  description:
    "Drives the claude-wiki-pages agents + engine to complete ANY vault: discovers the project's own topics, ingests unprocessed sources by topic, authors a hub page per derived topic, expands any structured catalog (glossary) into one page per family, resolves every dangling wikilink, enriches thin pages, then heals + polishes + verifies — proving a zero-dangling, hub-concentrated knowledge graph. Sequential write phases; read-only measurement gates. Vault-agnostic: nothing about the topic taxonomy is hardcoded. Materialized into a project by the /claude-wiki-pages:fill-gaps skill.",
  whenToUse:
    "When a wiki has dangling [[links]] (empty graph nodes), missing subtopics, or thin coverage and you want a complete, topic-clustered wiki without authoring pages by hand.",
  phases: [
    { title: 'Discover', detail: 'resolve paths, assert vault, derive topics/hubs/catalogs, baseline metrics' },
    { title: 'Stage', detail: 'optional: cp caller-provided sources into raw/repo/<topic>/' },
    { title: 'Ingest', detail: 'one ingest-agent run per derived topic over unprocessed raw sources' },
    { title: 'Hubs', detail: 'author/update the hub page for each derived topic' },
    { title: 'Catalog', detail: 'expand any structured catalog into one page per family (into _proposed/)' },
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
// OPTIONAL caller-curated source staging: a map of topic → [repo-relative files]
// to copy into raw/repo/<topic>/ before ingest. Omit it and the workflow works
// purely from the sources already in the vault's raw/ (the universal default).
// The plugin's own self-test passes its curated map here; no project taxonomy is
// baked into this template.
const SOURCES = Array.isArray(a.sources) ? a.sources : []
// Quality-gate thresholds (override via args). Cn = fraction of topic nodes in
// the vault's DERIVED top-level clusters; Ce = fraction of edges whose both
// endpoints are in those clusters. Ch (edges touching a hub) is reported, not gated.
const CN_MIN = a.cnMin ?? 0.85
const CE_MIN = a.ceMin ?? 0.85

// Every agent operates on the worktree copy. This preamble is prepended to every
// prompt so vault resolution can never drift to another checkout (the R1 trap).
const SCOPE = `You are operating on ONE specific vault. Before any command, \`cd ${REPO}\`. ` +
  `The vault is EXACTLY ${VAULT}. Always pass \`--target ${VAULT}\` to engine.sh / snapshot.sh / ` +
  `graph-quality.sh, and export CLAUDE_WIKI_PAGES_VAULT=${VAULT}. If any tool resolves a DIFFERENT ` +
  `vault path, STOP and report — do not write. Never touch any path outside ${REPO}.`

const METRIC_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['danglingCount', 'verifyErrors', 'verifyWarnings', 'Cn', 'Ce', 'Ch', 'nodes', 'edgesTotal'],
  properties: {
    danglingCount: { type: 'number' }, verifyErrors: { type: 'number' }, verifyWarnings: { type: 'number' },
    Cn: { type: 'number' }, Ce: { type: 'number' }, Ch: { type: 'number' },
    nodes: { type: 'number' }, edgesTotal: { type: 'number' },
    hubsSubstantive: { type: 'boolean' }, note: { type: 'string' },
  },
}

// Phase-0 discovery: the workflow sandbox has NO filesystem access, so the
// project's topics/hubs/catalogs are derived by an agent that reads the vault and
// returns them as data. THIS is what makes the workflow universal — the taxonomy
// comes from the vault, never a hardcoded list.
const DISCOVERY_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['topics', 'hubs', 'catalogs', 'danglingCount', 'verifyErrors', 'verifyWarnings', 'Cn', 'Ce', 'Ch', 'nodes', 'edgesTotal'],
  properties: {
    topics: { type: 'array', items: { type: 'string' } },
    hubs: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['folder', 'title', 'type'],
        properties: { folder: { type: 'string' }, title: { type: 'string' }, type: { type: 'string' } },
      },
    },
    catalogs: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['path', 'families'],
        properties: { path: { type: 'string' }, families: { type: 'array', items: { type: 'string' } } },
      },
    },
    danglingCount: { type: 'number' }, verifyErrors: { type: 'number' }, verifyWarnings: { type: 'number' },
    Cn: { type: 'number' }, Ce: { type: 'number' }, Ch: { type: 'number' },
    nodes: { type: 'number' }, edgesTotal: { type: 'number' }, note: { type: 'string' },
  },
}

const measurePrompt = (extra = '') =>
  `${SCOPE}\nRead-only measurement. Run, capturing JSON:\n` +
  `  bash ${REPO}/scripts/graph-quality.sh --target ${VAULT} --json\n` +
  `  bash ${REPO}/scripts/engine.sh verify --target ${VAULT} --json\n` +
  `Return danglingCount, Cn, Ce, Ch, nodes, edgesTotal from graph-quality, and verifyErrors/verifyWarnings ` +
  `from verify. ${extra} Create NO files.`

// ── Phase 0 — Discover topics/hubs/catalogs + baseline ───────────────────────
phase('Discover')
const disc = await agent(
  `${SCOPE}\nRead-only DISCOVERY of this vault's own structure. Steps:\n` +
  `1. Assert the realpath of ${VAULT} is under ${REPO} AND \`git -C ${REPO} rev-parse --show-toplevel\` equals ` +
  `${REPO}. If either fails, set note to the mismatch and danglingCount to -1 (the workflow aborts).\n` +
  `2. Run \`bash ${REPO}/scripts/graph-quality.sh --target ${VAULT} --json\` and \`bash ${REPO}/scripts/engine.sh verify --target ${VAULT} --json\`. ` +
  `Take topics = the keys of graph-quality's \`clusters\` object EXCEPT "other" (these are the vault's real ` +
  `top-level wiki/ folders). Take danglingCount, Cn, Ce, Ch, nodes, edgesTotal, verifyErrors, verifyWarnings.\n` +
  `3. For each topic, the hub is its folder note wiki/<topic>/<topic>.md. Read it if present; set hub.title to ` +
  `its existing \`title:\` (else Title-Case the folder name) and hub.type to its \`type:\` (else "topic").\n` +
  `4. Catalogs: look under ${VAULT}/raw/ for a STRUCTURED catalog file (e.g. a glossary .json with an ` +
  `\`entities\` array, or a vocabulary with \`families\`/\`categories\`). For each, set path (vault-relative) ` +
  `and families = the distinct family/category names it defines. Empty array if none.\n` +
  `Create NO files.`,
  { label: 'discover', phase: 'Discover', model: 'sonnet', schema: DISCOVERY_SCHEMA })
if (!disc || disc.danglingCount < 0) {
  throw new Error(`Phase 0 abort — vault/worktree assertion failed: ${disc ? disc.note : 'no result'}`)
}
const TOPICS = disc.topics
const HUBS = disc.hubs
const CATALOGS = disc.catalogs
log(`discovered: topics=[${TOPICS.join(', ')}] hubs=${HUBS.length} catalogs=${CATALOGS.length} | ` +
  `baseline dangling=${disc.danglingCount} verify=${disc.verifyErrors}/${disc.verifyWarnings} ` +
  `Cn=${disc.Cn} Ch=${disc.Ch} nodes=${disc.nodes}`)

// ── Phase A — Stage caller-curated sources (optional, NEW files only) ─────────
phase('Stage')
if (SOURCES.length === 0) {
  log('stage: no args.sources provided — working from the vault\'s existing raw/ sources (universal default)')
} else {
  const stageList = SOURCES.map(t => `# raw/repo/${t.key}/\n${(t.files || []).join('\n')}`).join('\n')
  await agent(
    `${SCOPE}\nStage caller-curated repo sources for ingest. Steps:\n` +
    `1. bash ${REPO}/scripts/snapshot.sh pre --target ${VAULT}\n` +
    `2. For each topic below, \`mkdir -p ${VAULT}/raw/repo/<topic>/\` and **cp** each listed file (preserve ` +
    `basename) from ${REPO}/<path> into it. Use ONLY bash \`cp\` + \`mkdir\` — NEVER the Write/Edit tools, ` +
    `NEVER overwrite a file that already exists under raw/. Skip any source path that is missing (log it).\n` +
    `3. bash ${REPO}/scripts/snapshot.sh post --target ${VAULT} --label "fill-gaps: stage curated sources"\n` +
    `Report the count copied per topic.\n\nTOPICS:\n${stageList}`,
    { label: 'stage', phase: 'Stage', model: 'haiku' })
}

// ── Phase B — Ingest unprocessed sources, one run per derived topic ──────────
phase('Ingest')
for (const t of TOPICS) {
  await agent(
    `${SCOPE}\nIngest any UNPROCESSED sources for the "${t}" topic into wiki/${t}/. Look under raw/ for sources ` +
    `relevant to this topic (e.g. raw/repo/${t}/ if it exists, else raw/ material about ${t}) that do not yet ` +
    `have a wiki page. If there are none, report "nothing to ingest" and stop.\n` +
    `PRE-APPROVAL OVERRIDE: the user has PRE-APPROVED the topic-tree plan. Write the plan file to output/ for ` +
    `the record, then proceed autonomously through Step 1.4 — DO NOT stop at the confirmation gate; treat it ` +
    `as 'approve'. Continue to page creation.\n` +
    `Place every entity/concept page under wiki/${t}/. If there are >25 unprocessed sources, process the first ` +
    `25 and report the rest. You may skip your own synthesis step — the workflow owns that. Honor the HARD ` +
    `RULE: never create a [[wikilink]] to a page that does not (yet) exist.`,
    { label: `ingest:${t}`, phase: 'Ingest', agentType: 'claude-wiki-pages:claude-wiki-pages-ingest-agent' })
}

// ── Phase C — Author/update a hub page per derived topic ─────────────────────
phase('Hubs')
if (HUBS.length > 0) {
  const hubList = HUBS.map(h => `- "${h.title}" (type: ${h.type}) at wiki/${h.folder}/${h.folder}.md → cluster wiki/${h.folder}/`).join('\n')
  await agent(
    `${SCOPE}\nAuthor/update the topic HUB pages so the graph concentrates on them. For each hub below: ` +
    `write/update wiki/<folder>/<folder>.md from the matching _templates/<type>.md skeleton, ALL sections ` +
    `filled (no empty sections), with quoted "[[wikilink]]" frontmatter linking EVERY page currently in that ` +
    `cluster folder (use key_pages and/or related, and children/child_indexes where it is the folder note), ` +
    `and body [[wikilinks]] to each. \`title\` MUST be the first entry in \`aliases\`. HARD RULE: only link ` +
    `pages that actually exist on disk now. Update wiki/index.md to list each hub. Self-checkpoint via ` +
    `snapshot pre/post, label "fill-gaps: author hub pages".\n\nHUBS:\n${hubList}`,
    { label: 'hubs', phase: 'Hubs', agentType: 'claude-wiki-pages:claude-wiki-pages-ingest-agent' })
} else {
  log('hubs: no topics derived yet — skipping (nothing to hub)')
}

// ── Phase C2 — Expand structured catalogs into one page per family ───────────
// Makes the project's described taxonomy (patterns, anti-patterns, code-smells,
// risks, principles, …) VISIBLE as nodes. Drafts land in _proposed/ for a single
// human review/promote — never written straight into wiki/.
phase('Catalog')
if (CATALOGS.length === 0) {
  log('catalog: no structured catalog found in raw/ — skipping family expansion')
} else {
  for (const c of CATALOGS) {
    const missing = (c.families || []).join(', ')
    await agent(
      `${SCOPE}\nThe structured catalog ${c.path} defines these families/categories: ${missing}. For EACH ` +
      `family that does NOT already have a wiki page, DRAFT one grounded family page into ` +
      `${VAULT}/_proposed/wiki/<topic>/<family>.md (NOT directly into wiki/). The page lists that family's ` +
      `entities as sections (name, signs, the principle(s) it relates to, and any corrective/resolves ` +
      `relation), grounded in ${c.path} with a real [[_sources/...]] citation, ALL template sections filled, ` +
      `\`proposed_by\` set. Pick the topic folder that best matches the family (derive from existing topics: ` +
      `[${TOPICS.join(', ')}]). Do NOT create per-entity pages — one page per family. Do NOT write into wiki/. ` +
      `Report the families drafted and how many entities each covers.`,
      { label: `catalog:${c.path}`, phase: 'Catalog', agentType: 'claude-wiki-pages:claude-wiki-pages-ingest-agent' })
  }
  log(`catalog: drafted missing family pages into _proposed/ — run /claude-wiki-pages:review to promote them`)
}

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
  `increment update_count, append any new [[_sources/...]]) using its existing sources: and any newly ` +
  `staged raw/ material — especially the topics that were thinly covered. Do NOT create duplicates and do ` +
  `NOT introduce new dangling links. Self-checkpoint, label "fill-gaps: enrich thin pages".`,
  { label: 'enrich', phase: 'Enrich', agentType: 'claude-wiki-pages:claude-wiki-pages-ingest-agent' })

// ── Phase F — Heal + Polish + Verify ─────────────────────────────────────────
phase('HealPolish')
await agent(
  `${SCOPE}\nFinal auto-heal: engine.sh heal then the curator auto-fixes and judgment fixes, all ` +
  `git-checkpointed. Report the heal commit and any surfaced residual items.`,
  { label: 'final-heal', phase: 'HealPolish', agentType: 'claude-wiki-pages:claude-wiki-pages-curator-agent' })
await agent(
  `${SCOPE}\nPolish: apply graph colors for whatever top-level wiki/<topic>/ folders now exist (the polish ` +
  `agent derives them by running apply-obsidian-config.sh — do NOT name folders), regenerate wiki/index.md ` +
  `from the folder notes, and reconcile every folder note's children/child_indexes. Self-checkpoint.`,
  { label: 'polish', phase: 'HealPolish', agentType: 'claude-wiki-pages:claude-wiki-pages-polish-agent' })

// ── Phase G — Measure + gates ────────────────────────────────────────────────
phase('Measure')
const hubFolders = HUBS.map(h => `wiki/${h.folder}/${h.folder}.md`).join(', ')
const final = await agent(
  measurePrompt(
    `Also read each derived hub page (${hubFolders || 'none'}) and set hubsSubstantive=true iff EVERY one ` +
    `exists with filled body sections (no empty headings) AND >=5 outbound [[links]]. Hubs are topic/index ` +
    `pages — do NOT require a sources field (the schema does not require sources on index/topic pages). If ` +
    `there are no hubs, set hubsSubstantive=true.`),
  { label: 'measure', phase: 'Measure', model: 'haiku', schema: METRIC_SCHEMA })

const gates = {
  noDangling: final && final.danglingCount === 0,
  verifyClean: final && final.verifyErrors === 0 && final.verifyWarnings === 0,
  nodeConcentration: final && final.Cn >= CN_MIN,
  edgeConcentration: final && final.Ce >= CE_MIN,
  hubsSubstantive: !!(final && final.hubsSubstantive),
}
const pass = Object.values(gates).every(Boolean)
if (!pass) {
  log(`QUALITY GATES FAILED ${JSON.stringify(gates)} — final ${JSON.stringify(final)}. ` +
    `Inspect the last write phase and \`git revert\` its checkpoint if needed.`)
} else {
  log(`ALL GATES PASS — dangling 0, verify clean, Cn=${final.Cn} (>=${CN_MIN}), ` +
    `Ce=${final.Ce} (>=${CE_MIN}); Ch=${final.Ch} (informational hub concentration)`)
}

return { repo: REPO, vault: VAULT, thresholds: { CN_MIN, CE_MIN }, topics: TOPICS, catalogs: CATALOGS, baseline: disc, final, gates, pass }
