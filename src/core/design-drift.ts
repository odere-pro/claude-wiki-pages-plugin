/**
 * design-drift — Check 5 of scripts/validate-docs.sh (ADR-0013).
 *
 * A faithful TypeScript port of the design-drift pillar in validate-docs.sh.
 * Scan set: docs/design/*.md and SOFTWARE-3-0.md (git-tracked).
 *
 * Sub-checks (mirror validate-docs.sh Check 5):
 *
 *   5a — mermaid node grounding: file-form tokens (.sh/.ts/.json/.md/.yml/.yaml)
 *        inside mermaid fences must resolve (repo-root, scripts/ inventory, or any
 *        git ls-files basename). Docs carrying [speculative] are fully exempt for 5a.
 *   5b — link resolution: every ](./…) and ](../…) relative link must resolve,
 *        relative to the linking file's directory. Gitignored targets and
 *        http(s)/mailto links are exempt.
 *   5c — hook set-equality: every script wired in hooks/hooks.json must appear in
 *        some design-doc mermaid fence (error per missing). PreToolUse ordering
 *        delta between 02-component-design.md and hooks.json is a WARN (not error).
 *   5d — 06-feature-relations counts: stated Agents/Skills/Commands/Hooks counts
 *        must match reality (git ls-files / hooks.json event count).
 *   5e — authority presence: each scanned doc must carry ≥1 resolvable relative
 *        link to an authority surface (CLAUDE.md, architecture.md, hooks.json,
 *        plugin.json, docs/adr).
 *   5f — router parity: every data row in SOFTWARE-3-0.md's "Six surfaces" table
 *        must have non-empty human AND agent cells, with all relative links resolving.
 *   5g — ontology predicate-node grounding: every mermaid edge-label predicate in
 *        docs/design/07-ontology.md must exist in the ontology-profile-v1 predicate
 *        table in skills/init/template/CLAUDE.md.
 *
 * The check is gated, exactly like the bash: if hooks/hooks.json is not tracked,
 * the whole design-drift check is skipped (no ground truth for 5c/5d). Design docs
 * legitimately link to hooks/, so without it every such link would FAIL spuriously
 * (e.g. in stripped bats test repos).
 *
 * Deterministic: same repo in → same findings out. No embeddings, no network.
 *
 * @module design-drift
 */

import { join, dirname, resolve as resolvePath } from "node:path";
import { existsSync } from "node:fs";
import type { Finding } from "./report.ts";
import type { RepoIO } from "./repo-io.ts";

/** The check name prefix used on all findings from this module. */
const CHECK_PREFIX = "docs-check-design-drift";

/** File-form token extensions recognised inside mermaid fences (5a). */
const FILE_TOKEN_RE = /[A-Za-z0-9_-]+\.(?:sh|ts|json|md|yml|yaml)/g;

/** Authority surfaces a doc must link to (5e). */
const AUTHORITY_RE = /CLAUDE\.md|architecture\.md|hooks\.json|plugin\.json|\/docs\/adr|docs\/adr/;

/** Hook event names used for the 5d count and 5c PreToolUse ordering. */
const HOOK_EVENTS = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "SubagentStop",
  "Stop",
  "SessionEnd",
] as const;

// ── Small parsing helpers (pure) ────────────────────────────────────────────────

/**
 * Extract the body lines inside every ```mermaid fence in `content`.
 * Mirrors the awk `/```mermaid/{f=1} /```/{f=0} f` pattern.
 */
function mermaidFenceLines(content: string): string[] {
  const out: string[] = [];
  let inFence = false;
  for (const line of content.split("\n")) {
    if (/^\s*```mermaid/.test(line)) {
      inFence = true;
      continue;
    }
    if (/^\s*```/.test(line)) {
      if (inFence) inFence = false;
      continue;
    }
    if (inFence) out.push(line);
  }
  return out;
}

/**
 * Extract relative markdown link targets — `](./…)` and `](../…)` — from `content`.
 * Mirrors `grep -oE '\]\(\.(\.)?/[^)]+\)'` then strip the `](` … `)` wrapper.
 */
function relativeLinks(content: string): string[] {
  const out: string[] = [];
  const re = /\]\(\.\.?\/[^)]+\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const raw = m[0];
    // strip leading "](" and trailing ")"
    out.push(raw.slice(2, -1));
  }
  return out;
}

/** Strip a trailing #anchor from a link target. */
function stripAnchor(link: string): string {
  const hashAt = link.indexOf("#");
  return hashAt === -1 ? link : link.slice(0, hashAt);
}

// ── Link / token resolution (mirrors bash _resolve_link / _token_resolves) ──────

type LinkResolution = "OK" | "GITIGNORED" | "EXTERNAL" | "MISSING";

/**
 * Resolve a relative link from a given directory.
 * Mirrors validate-docs.sh _resolve_link.
 *
 * @param io repo IO (existence + gitignore + ls-files)
 * @param fileDirAbs absolute path of the directory the link is relative to
 * @param link the raw link target (may include #anchor)
 */
function resolveLink(io: RepoIO, fileDirAbs: string, link: string): LinkResolution {
  if (/^(?:https?:|mailto:)/.test(link)) return "EXTERNAL";
  const stripped = stripAnchor(link);
  if (stripped === "") return "OK"; // same-file anchor
  const abs = resolvePath(fileDirAbs, stripped);
  if (existsSync(abs)) return "OK";
  // gitignored target → treat as OK (matches bash GITIGNORED branch)
  const rel = io.relFromRoot(abs);
  if (io.isGitIgnored(rel)) return "GITIGNORED";
  return "MISSING";
}

/** True when a relative link resolves OK / GITIGNORED / EXTERNAL. */
function linkOk(res: LinkResolution): boolean {
  return res === "OK" || res === "GITIGNORED" || res === "EXTERNAL";
}

/**
 * Whether a file-form token resolves.
 * Mirrors validate-docs.sh _token_resolves: -e repo-root, scripts/ inventory, or
 * any git ls-files path whose final component equals the token.
 */
function tokenResolves(io: RepoIO, tracked: ReadonlySet<string>, tok: string): boolean {
  if (existsSync(join(io.root, tok))) return true;
  if (existsSync(join(io.root, "scripts", tok))) return true;
  for (const p of tracked) {
    if (p === tok || p.endsWith(`/${tok}`)) return true;
  }
  return false;
}

// ── 5a / 5b / 5e — per-file scans ──────────────────────────────────────────────

function scan5aGrounding(
  io: RepoIO,
  tracked: ReadonlySet<string>,
  file: string,
  content: string,
  fenceTokens: ReadonlySet<string>,
): Finding[] {
  // [speculative] docs are fully exempt from 5a grounding.
  if (content.includes("[speculative]")) return [];
  const findings: Finding[] = [];
  for (const tok of fenceTokens) {
    if (tokenResolves(io, tracked, tok)) continue;
    findings.push({
      severity: "error",
      check: `${CHECK_PREFIX}-5a`,
      message: `unresolved mermaid token '${tok}' in ${file}`,
      file,
    });
  }
  return findings;
}

function scan5bLinks(io: RepoIO, file: string, content: string): Finding[] {
  const findings: Finding[] = [];
  const fileDirAbs = dirname(join(io.root, file));
  for (const link of relativeLinks(content)) {
    if (/^(?:https?:|mailto:)/.test(link)) continue;
    const res = resolveLink(io, fileDirAbs, link);
    if (linkOk(res)) continue;
    findings.push({
      severity: "error",
      check: `${CHECK_PREFIX}-5b`,
      message: `dead link in ${file}: ${link}`,
      file,
    });
  }
  return findings;
}

function scan5eAuthority(io: RepoIO, file: string, content: string): Finding[] {
  const fileDirAbs = dirname(join(io.root, file));
  for (const link of relativeLinks(content)) {
    if (/^(?:https?:|mailto:)/.test(link)) continue;
    if (!AUTHORITY_RE.test(link)) continue;
    const res = resolveLink(io, fileDirAbs, link);
    if (res === "OK" || res === "GITIGNORED") return []; // found one — satisfied
  }
  return [
    {
      severity: "error",
      check: `${CHECK_PREFIX}-5e`,
      message: `no resolvable authority link in ${file}`,
      file,
    },
  ];
}

// ── 5a fence-token + sh-token collection ────────────────────────────────────────

function fenceFileTokens(content: string): Set<string> {
  const tokens = new Set<string>();
  for (const line of mermaidFenceLines(content)) {
    const matches = line.match(FILE_TOKEN_RE);
    if (matches) for (const tk of matches) tokens.add(tk);
  }
  return tokens;
}

// ── 5c — PreToolUse ordering ────────────────────────────────────────────────────

/**
 * Extract PreToolUse script order from a 02-component-design.md mermaid fence.
 * Mirrors the bash awk: only fences with ≥5 hook-event lines count; capture
 * `pre -->...".../X.sh"` script names in order, dedup preserving first-seen.
 */
function designPreOrder(content: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  let inFence = false;
  let cnt = 0;
  let buf: string[] = [];
  const eventRe = new RegExp(`(${HOOK_EVENTS.join("|")})`);
  const flush = (): void => {
    if (cnt >= 5) {
      for (const s of buf) {
        if (!seen.has(s)) {
          seen.add(s);
          out.push(s);
        }
      }
    }
    cnt = 0;
    buf = [];
  };
  for (const line of content.split("\n")) {
    if (/^\s*```mermaid/.test(line)) {
      inFence = true;
      cnt = 0;
      buf = [];
      continue;
    }
    if (/^\s*```/.test(line)) {
      if (inFence) flush();
      inFence = false;
      continue;
    }
    if (!inFence) continue;
    if (eventRe.test(line)) cnt++;
    // Match: pre --> ... "....X.sh   (capture the .sh filename after the last quote)
    const m = line.match(/pre\s*-->[^"]*"([A-Za-z0-9_-]+\.sh)/);
    if (m && m[1] !== undefined) buf.push(m[1]);
  }
  // a fence may end at EOF without a closing fence line
  if (inFence) flush();
  return out;
}

/** Extract PreToolUse script order (bare names) from hooks.json, dedup first-seen. */
function hooksPreOrder(hooksJson: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  let inPre = false;
  for (const line of hooksJson.split("\n")) {
    if (line.includes('"PreToolUse"')) inPre = true;
    if (inPre && line.includes('"command"')) {
      const m = line.match(/scripts\/([a-z-]+\.sh)/);
      if (m && m[1] !== undefined && !seen.has(m[1])) {
        seen.add(m[1]);
        out.push(m[1]);
      }
    }
    if (inPre && /^\s*\]/.test(line)) inPre = false;
  }
  return out;
}

// ── 5d — feature-relations counts ───────────────────────────────────────────────

/**
 * Extract the stated count for a labelled row in 06-feature-relations.md.
 * Mirrors: grep '**Label**' | awk -F'|' '{print $3}' | grep -oE '[0-9]+' | head -1.
 * Returns undefined when no integer is found.
 */
function statedCount(featDoc: string, label: string): number | undefined {
  for (const line of featDoc.split("\n")) {
    if (!line.includes(`**${label}**`)) continue;
    const cells = line.split("|");
    const cell = cells[2] ?? "";
    const m = cell.match(/[0-9]+/);
    if (m) return Number.parseInt(m[0], 10);
    return undefined; // row present but no integer
  }
  return undefined; // row absent
}

// ── 5f — router parity ──────────────────────────────────────────────────────────

/** Strip whitespace + markdown placeholders to test cell emptiness (5f). */
function stripCell(cell: string): string {
  return cell.replace(/[\s*]|&nbsp;|—|–|_/g, "");
}

/** Extract the surface name from the first table cell. */
function surfaceName(cell: string): string {
  const bold = cell.match(/\*\*([^*]*)\*\*/);
  if (bold && bold[1] !== undefined) return bold[1].trim();
  return cell.trim();
}

// ── Public API ──────────────────────────────────────────────────────────────────

/**
 * Run the design-drift check (Check 5 of validate-docs.sh) against the repo.
 *
 * @param io RepoIO providing root, git ls-files, gitignore + relative-path help.
 * @returns Findings: error-severity for each violation, plus a single WARN for a
 *   PreToolUse ordering delta (5c) which does NOT count as a violation.
 */
export function checkDesignDrift(io: RepoIO): readonly Finding[] {
  // Gate: only run when hooks/hooks.json is tracked (matches bash).
  const tracked = new Set(io.lsFiles());
  if (!tracked.has("hooks/hooks.json")) return [];

  const findings: Finding[] = [];

  // Scan set: docs/design/*.md + SOFTWARE-3-0.md (tracked).
  const scanSet = [...tracked]
    .filter((f) => /^docs\/design\/[^/]+\.md$/.test(f) || f === "SOFTWARE-3-0.md")
    .sort();

  // Aggregate Set A (all *.sh tokens across all design-doc fences) for 5c.
  const designShTokens = new Set<string>();
  let designPre: string[] = [];

  for (const file of scanSet) {
    const content = io.read(file);
    if (content === null) continue;
    const fenceTokens = fenceFileTokens(content);
    for (const tk of fenceTokens) if (tk.endsWith(".sh")) designShTokens.add(tk);
    if (/\/02-component-design\.md$/.test(file)) designPre = designPreOrder(content);

    findings.push(...scan5aGrounding(io, tracked, file, content, fenceTokens));
    findings.push(...scan5bLinks(io, file, content));
    findings.push(...scan5eAuthority(io, file, content));
  }

  // ── 5c: hook set-equality (Set B − Set A) ──────────────────────────────────
  const hooksJson = io.read("hooks/hooks.json") ?? "";
  const hookShSet = new Set<string>();
  for (const m of hooksJson.matchAll(/scripts\/([a-z-]+\.sh)/g)) {
    if (m[1] !== undefined) hookShSet.add(m[1]);
  }
  for (const s of [...hookShSet].sort()) {
    if (!designShTokens.has(s)) {
      findings.push({
        severity: "error",
        check: `${CHECK_PREFIX}-5c`,
        message: `hook script not depicted in any design-doc mermaid fence: ${s}`,
        file: "hooks/hooks.json",
      });
    }
  }

  // ── 5c: PreToolUse ordering WARN (does NOT increment violations) ────────────
  const hooksPre = hooksPreOrder(hooksJson);
  if (designPre.length > 0 && hooksPre.length > 0) {
    const designFiltered = designPre.filter((s) => hooksPre.includes(s));
    if (designFiltered.length > 0 && designFiltered.join("\n") !== hooksPre.join("\n")) {
      findings.push({
        severity: "warn",
        check: `${CHECK_PREFIX}-5c-order`,
        message:
          "PreToolUse script order in 02-component-design.md differs from hooks/hooks.json " +
          `(design: ${designFiltered.join(" ")}; hooks.json: ${hooksPre.join(" ")})`,
        file: "docs/design/02-component-design.md",
      });
    }
  }

  // ── 5d: 06-feature-relations counts ─────────────────────────────────────────
  const featDoc = "docs/design/06-feature-relations.md";
  if (tracked.has(featDoc)) {
    const featContent = io.read(featDoc) ?? "";
    const actualAgents = [...tracked].filter((f) => /^agents\/[^/]+\.md$/.test(f)).length;
    const actualSkills = [...tracked].filter((f) => /^skills\/[^/]+\/SKILL\.md$/.test(f)).length;
    const actualCmds = [...tracked].filter((f) => /^commands\/[^/]+\.md$/.test(f)).length;
    const actualHooks = new Set(
      [
        ...hooksJson.matchAll(
          /"(SessionStart|UserPromptSubmit|PreToolUse|PostToolUse|SubagentStop|Stop|SessionEnd)"/g,
        ),
      ].map((m) => m[1]),
    ).size;

    const dims: ReadonlyArray<readonly [string, string, number]> = [
      ["Agents", "agents", actualAgents],
      ["Skills", "skills", actualSkills],
      ["Commands", "commands", actualCmds],
      ["Hooks", "hook events", actualHooks],
    ];
    for (const [label, noun, actual] of dims) {
      const stated = statedCount(featContent, label);
      if (stated === undefined || stated !== actual) {
        findings.push({
          severity: "error",
          check: `${CHECK_PREFIX}-5d`,
          message: `count mismatch in ${featDoc}: ${noun} stated=${stated ?? "<unextractable>"} actual=${actual}`,
          file: featDoc,
        });
      }
    }
  }

  // ── 5f: router parity (SOFTWARE-3-0.md "Six surfaces" table) ─────────────────
  const routerFile = "SOFTWARE-3-0.md";
  if (tracked.has(routerFile)) {
    const routerContent = io.read(routerFile) ?? "";
    const routerDirAbs = dirname(join(io.root, routerFile));
    for (const row of routerContent.split("\n")) {
      if (!row.startsWith("|")) continue;
      if (row.includes("---")) continue;
      if (row.includes("Human on-ramp")) continue;
      const cells = row.split("|");
      const col1 = cells[1] ?? "";
      const human = cells[2] ?? "";
      const agent = cells[3] ?? "";
      const surface = surfaceName(col1);
      if (stripCell(human) === "" || stripCell(agent) === "") {
        findings.push({
          severity: "error",
          check: `${CHECK_PREFIX}-5f`,
          message: `single-ramped router row in ${routerFile}: '${surface}' missing human or agent on-ramp`,
          file: routerFile,
        });
        continue;
      }
      for (const cell of [human, agent]) {
        for (const link of relativeLinks(cell)) {
          if (/^(?:https?:|mailto:)/.test(link)) continue;
          const res = resolveLink(io, routerDirAbs, link);
          if (linkOk(res)) continue;
          findings.push({
            severity: "error",
            check: `${CHECK_PREFIX}-5f`,
            message: `dead link in router row '${surface}' (${routerFile}): ${link}`,
            file: routerFile,
          });
        }
      }
    }
  }

  // ── 5g: ontology predicate-node grounding ───────────────────────────────────
  const ontologyDoc = "docs/design/07-ontology.md";
  if (tracked.has(ontologyDoc)) {
    const authority = extractAuthorityPredicates(io.read("skills/init/template/CLAUDE.md") ?? "");
    if (authority.size > 0) {
      const ontologyContent = io.read(ontologyDoc) ?? "";
      const diagramPreds = extractDiagramPredicates(ontologyContent);
      for (const pred of [...diagramPreds].sort()) {
        if (!authority.has(pred)) {
          findings.push({
            severity: "error",
            check: `${CHECK_PREFIX}-5g`,
            message: `predicate node '${pred}' in ${ontologyDoc} is absent from the ontology-profile-v1 predicate table in skills/init/template/CLAUDE.md`,
            file: ontologyDoc,
          });
        }
      }
    }
  }

  return findings;
}

/**
 * Extract predicate names from the ontology-profile-v1 "Predicate domain" table
 * in skills/init/template/CLAUDE.md. Mirrors the bash awk extraction.
 */
function extractAuthorityPredicates(schema: string): Set<string> {
  const out = new Set<string>();
  let inTable = false;
  for (const line of schema.split("\n")) {
    if (line.includes("### Predicate domain")) {
      inTable = true;
      continue;
    }
    if (inTable && /^###/.test(line)) inTable = false;
    if (!inTable) continue;
    const m = line.match(/^\|\s*`([a-z_]+)`/);
    if (m && m[1] !== undefined) out.add(m[1]);
  }
  return out;
}

/**
 * Extract mermaid edge-label predicate tokens (`|label|`) from the ontology doc.
 * Mirrors: grep -oE '\|[a-z_]+\|' over mermaid-fence lines, strip pipes.
 */
function extractDiagramPredicates(content: string): Set<string> {
  const out = new Set<string>();
  for (const line of mermaidFenceLines(content)) {
    for (const m of line.matchAll(/\|([a-z_]+)\|/g)) {
      if (m[1] !== undefined) out.add(m[1]);
    }
  }
  return out;
}
