export const meta = {
  name: 'wiki-plugin-guide',
  description: 'Research the claude-wiki-pages plugin and produce a structured guide with mermaid diagrams, saved to tmp/',
  phases: [
    { title: 'Research', detail: 'parallel readers, one per guide aspect' },
    { title: 'Synthesize', detail: 'assemble the full guide with diagrams' },
  ],
}

const ROOT = '/Users/aleksandrderechei/Git/claude-wiki-pages-plugin'
const OUT = `${ROOT}/tmp/claude-wiki-pages-guide.md`

const SECTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'markdown', 'keyFacts'],
  properties: {
    title: { type: 'string', description: 'Section heading' },
    markdown: { type: 'string', description: 'Polished markdown body for this section, including any ```mermaid``` fenced diagrams that belong here. Use real names/paths from the source. No top-level # heading — start at ## or prose.' },
    keyFacts: { type: 'array', items: { type: 'string' }, description: '5-12 atomic, verified facts the synthesizer can cross-reference' },
    mermaidDiagrams: { type: 'array', items: { type: 'string' }, description: 'Any standalone mermaid diagram source (without fences) this section contributes, for the synthesizer to reuse at the top level' },
  },
}

const baseInstr = (focus, files, deliver) => `You are documenting the **claude-wiki-pages** Claude Code plugin (an LLM Wiki for Obsidian, built as a four-layer hook-enforced agent stack).

Repo root: ${ROOT}

YOUR FOCUS: ${focus}

Read these anchor files first (and follow links/grep as needed — read real code/docs, do not invent):
${files.map((f) => `  - ${ROOT}/${f}`).join('\n')}

DELIVERABLE: ${deliver}

Rules:
- Ground every claim in the actual files. Use real command names (e.g. /claude-wiki-pages:wiki), real agent names, real script/engine subcommands, real paths.
- Write clear, well-structured markdown aimed at a developer who has never used the plugin.
- Where a diagram clarifies structure or flow, include a GitHub-compatible \`\`\`mermaid\`\`\` block (flowchart/sequenceDiagram). Keep node labels short; avoid parentheses/quotes that break mermaid parsing.
- Be accurate over comprehensive. Return your section via the structured output.`

phase('Research')

const ASPECTS = [
  {
    label: 'overview',
    focus: 'What the plugin IS, the problem it solves, and how it works at a high level (the LLM Wiki pattern, provenance, the four-layer model). Also the "typical usage" loop.',
    files: ['README.md', 'CLAUDE.md', 'SOFTWARE-3-0.md', 'docs/features.md', 'docs/GLOSSARY.md'],
    deliver: 'A "What it is & how it works" narrative + a "Typical usage" walkthrough of the day-to-day loop. Include a high-level concept diagram if useful.',
  },
  {
    label: 'architecture',
    focus: 'System architecture: the four-layer orchestrator model, the deterministic Bun engine (src/), hooks (firewall, gates), vault schema, and how agents/skills/commands/engine fit together.',
    files: ['docs/architecture.md', 'docs/design/01-system-context.md', 'docs/design/02-component-design.md', 'docs/adr/ADR-0001-four-layer-orchestrator.md', 'hooks/hooks.json', 'schemas/config.schema.json', 'src/cli', 'scripts/engine.sh'],
    deliver: 'An "Architecture" section with at least one clear architecture mermaid flowchart (layers: commands → orchestrator agent → specialist agents → engine/hooks → vault) and a short explanation of each layer and the engine.',
  },
  {
    label: 'ingest',
    focus: 'The ingest pipeline: how raw sources become structured wiki pages (extract workers, page classes, curator self-heal, polish, git checkpoints).',
    files: ['agents/claude-wiki-pages-ingest-agent.md', 'agents/claude-wiki-pages-extract-worker-agent.md', 'agents/claude-wiki-pages-curator-agent.md', 'agents/claude-wiki-pages-polish-agent.md', 'skills/ingest/SKILL.md', 'skills/ingest-pipeline/SKILL.md', 'docs/design/03-sequences.md'],
    deliver: 'A "How to ingest" section: the user-facing steps (drop sources in vault/raw, run /claude-wiki-pages:wiki) AND a sequenceDiagram or flowchart of the ingest pipeline (raw → extract → pages → heal → polish → synthesis).',
  },
  {
    label: 'query',
    focus: 'Querying the wiki: the analyst agent modes, the query/search/markdown skills, citations with wikilinks, and answer verification.',
    files: ['agents/claude-wiki-pages-analyst-agent.md', 'skills/query/SKILL.md', 'skills/search/SKILL.md', 'skills/markdown/SKILL.md', 'skills/analyst-modes/SKILL.md', 'docs/adr/ADR-0019-query-tier-and-answer-verification.md'],
    deliver: 'A "How to query" section: example questions, the analyst modes (Query/Dashboard/Compile/Extract/Challenge), how citations work, and search vs query. Add a small flow diagram if helpful.',
  },
  {
    label: 'init',
    focus: 'Initialising the plugin in a brand-new project: install, vault scaffold, the onboarding wizard, doctor health check, git-per-vault requirement.',
    files: ['docs/install.md', 'docs/getting-started.md', 'commands/onboarding.md', 'commands/doctor.md', 'commands/wiki.md', 'skills/init/SKILL.md', 'skills/onboarding/SKILL.md', 'agents/claude-wiki-pages-onboarding-agent.md', 'docs/adr/ADR-0005-git-required-per-vault-init.md'],
    deliver: 'A "How to install & init in a new project" section: install steps, set-vault, the five-step onboarding flow, doctor, and what gets scaffolded. Number the steps clearly.',
  },
  {
    label: 'obsidian',
    focus: 'Working together with Obsidian: how the vault maps to an Obsidian vault, graph colors/folder notes, obsidian-cli/bases/markdown skills, the vault confinement firewall.',
    files: ['skills/obsidian-vault/SKILL.md', 'skills/obsidian-cli/SKILL.md', 'skills/obsidian-markdown/SKILL.md', 'skills/obsidian-bases/SKILL.md', 'skills/obsidian-graph-colors/SKILL.md', 'agents/claude-wiki-pages-polish-agent.md', 'docs/adr/ADR-0003-polish-agent-and-obsidian-side.md', 'docs/adr/ADR-0022-folder-notes-and-graph-quality.md', 'scripts/firewall.sh'],
    deliver: 'A "Working with Obsidian" section: open the vault in Obsidian, what the graph/folder notes/colors give you, the Obsidian CLI integration, and the safety firewall confining writes to the resolved vault.',
  },
  {
    label: 'future',
    focus: 'Future plans / roadmap: unreleased work, design drafts, recent ADR direction (local models, multi-vault, durable memory, ontology, agent-agnostic plans).',
    files: ['CHANGELOG.md', 'docs/design/README.md', 'docs/adr/README.md', 'docs/local-models.md', 'tmp/agent-agnostic-plugon-plan.md', 'tmp/migration-plan.md', 'tmp/local-scan-context-offload-plan.md', 'docs/adr/ADR-0010-durable-memory-carve-out.md', 'docs/adr/ADR-0016-simultaneous-multi-vault-management.md'],
    deliver: 'A "Future plans / roadmap" section grouping in-flight and planned directions (e.g. agent-agnostic harness support, local-model drafting, multi-vault, durable memory, ontology). Distinguish shipped-recently from planned. Keep it honest — say "planned" where it is a plan, not a feature.',
  },
]

const sections = await parallel(
  ASPECTS.map((a) => () =>
    agent(baseInstr(a.focus, a.files, a.deliver), {
      label: `read:${a.label}`,
      phase: 'Research',
      schema: SECTION_SCHEMA,
    }).then((r) => (r ? { ...r, label: a.label } : null)),
  ),
)

const ok = sections.filter(Boolean)
log(`Research complete: ${ok.length}/${ASPECTS.length} sections returned`)

phase('Synthesize')

const order = ['overview', 'architecture', 'ingest', 'query', 'init', 'obsidian', 'future']
const sorted = order.map((l) => ok.find((s) => s.label === l)).filter(Boolean)

const bundle = sorted
  .map(
    (s) =>
      `### SECTION [${s.label}] — proposed title: ${s.title}\n\nKEY FACTS:\n${s.keyFacts.map((f) => `- ${f}`).join('\n')}\n\nDRAFT MARKDOWN:\n${s.markdown}\n\nEXTRA MERMAID:\n${(s.mermaidDiagrams || []).join('\n---\n') || '(none)'}`,
  )
  .join('\n\n========================================\n\n')

const guide = await agent(
  `You are the lead technical writer assembling a single, polished guide for the **claude-wiki-pages** Claude Code plugin (an LLM Wiki for Obsidian, four-layer hook-enforced agent stack).

You are given ${sorted.length} researched, source-grounded sections below. Assemble them into ONE cohesive markdown guide. Do NOT invent facts; rely on the key facts and draft markdown. You MAY rewrite for flow, dedupe overlap, and improve diagrams.

Required document structure (use these top-level ## headings, in this order):
1. Title (# claude-wiki-pages — Project Guide) + a 2-3 sentence elevator description.
2. ## What it is & how it works
3. ## Architecture  — must contain a clear \`\`\`mermaid\`\`\` architecture diagram (layers: commands → orchestrator → specialists → engine/hooks → Obsidian vault).
4. ## User flow  — must contain a \`\`\`mermaid\`\`\` diagram of the end-to-end loop (init → ingest → curate → query), sequenceDiagram or flowchart.
5. ## Typical usage
6. ## How to use  (the /claude-wiki-pages:wiki entry point and the main commands/skills)
7. ## How to install & initialise in a new project  (numbered steps)
8. ## How to ingest  (with the pipeline diagram)
9. ## How to query  (analyst modes, citations)
10. ## Working with Obsidian
11. ## Future plans / roadmap
12. ## Reference — a compact table of the key commands, agents, and engine entry points.

Rules:
- Every \`\`\`mermaid\`\`\` block MUST be valid GitHub-flavored mermaid: simple node ids, short labels, no unescaped parentheses/quotes/semicolons inside labels. Prefer flowchart TD/LR and sequenceDiagram.
- Keep a confident, practical voice. Use real command names, agent names, paths, engine subcommands.
- Add a short "> " callout at the top noting this guide was generated from the repo on the current branch.
- Output ONLY the final markdown of the guide — no preamble, no commentary. It will be written verbatim to a file.

=== RESEARCHED SECTIONS ===

${bundle}`,
  { label: 'synthesize-guide', phase: 'Synthesize', effort: 'high' },
)

return { guide, sectionsUsed: sorted.map((s) => s.label), outPath: OUT }