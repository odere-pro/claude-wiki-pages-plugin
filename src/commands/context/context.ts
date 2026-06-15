/**
 * `context` — resolve the L0–L4 context set for a maintenance skill.
 *
 * Given a vault and a named skill (or agent), the verb reads the skill's
 * `## Context contract` table (parsed by `parseContextContract` in
 * `src/core/ontology-profile.ts`) and resolves each layer against the vault's
 * actual file tree.
 *
 * Layer definitions (ICM):
 *   L0 — vault schema + vocabulary (CLAUDE.md, _vocabulary.md)
 *   L1 — MOC hierarchy (wiki/index.md + per-folder index notes)
 *   L2 — topic pages (non-bookkeeping wiki/ pages)
 *   L3 — source summaries (wiki/_sources/**)
 *   L4 — raw sources (raw/**)
 *
 * The contract globs from the skill file overlay the layer definitions:
 * if a contract is present the `layers.l4` and `layers.l3` lists are narrowed
 * to files that match the contract's `inputs` globs; contract `reference` globs
 * narrow `layers.l3` further. When no contract is present the verb returns the
 * full layer lists (graceful degradation).
 *
 * `tokenEstimate` is a rough estimate of the token cost of loading all resolved
 * files (1 token ≈ 4 bytes; conservative ceiling).
 *
 * Read-only — cannot disturb heal/rollback.
 */

import { join, relative, basename } from "node:path";
import { listMarkdownRecursive, readFileSafe, existsSync, BOOKKEEPING } from "../../core/fs.ts";
import { resolveVault } from "../../core/vault.ts";
import { parseContextContract } from "../../core/ontology-profile.ts";
import { isFolderNote } from "../../core/fs.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

/** The L0–L4 context layers resolved for a skill turn. */
export interface ContextLayers {
  /** L0: vault schema + vocabulary files. */
  readonly l0: readonly string[];
  /** L1: MOC hierarchy — vault index + per-folder index notes. */
  readonly l1: readonly string[];
  /** L2: topic pages — non-bookkeeping wiki/ pages. */
  readonly l2: readonly string[];
  /** L3: source summaries — wiki/_sources/** */
  readonly l3: readonly string[];
  /** L4: raw sources — raw/** */
  readonly l4: readonly string[];
}

/** Report returned by `context()`. Vault-relative paths throughout. */
export interface ContextReport {
  readonly command: "context";
  readonly vault: string;
  readonly skill: string;
  readonly contractFound: boolean;
  readonly layers: ContextLayers;
  /**
   * Rough token estimate for loading all resolved files.
   * Uses the 1 token ≈ 4 bytes heuristic (conservative ceiling).
   * JSON-only — not rendered in text mode.
   */
  readonly tokenEstimate: number;
}

export interface ContextOptions {
  readonly target?: string;
  readonly cwd?: string;
  /**
   * The skill or agent name whose SKILL.md carries the `## Context contract`.
   * Looked up under `skills/<name>/SKILL.md` and `agents/<name>.md`.
   * When omitted or not found, layers are returned without contract filtering.
   */
  readonly skill?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Estimate the byte size of a file for token-cost calculation.
 * Returns 0 when the file cannot be read.
 */
function byteSize(filePath: string): number {
  const content = readFileSafe(filePath);
  return content === null ? 0 : Buffer.byteLength(content, "utf8");
}

/**
 * Rough token estimate: 1 token ≈ 4 bytes (conservative ceiling).
 * Sum over all resolved files in all layers.
 */
function estimateTokens(allFiles: readonly string[]): number {
  const totalBytes = allFiles.reduce((acc, f) => acc + byteSize(f), 0);
  return Math.ceil(totalBytes / 4);
}

/**
 * Resolve the skill markdown from the standard search paths:
 *   1. `<repoRoot>/skills/<name>/SKILL.md`
 *   2. `<repoRoot>/agents/<name>.md`
 *   3. `<repoRoot>/skills/<name>.md`   (flat layout fallback)
 *
 * `repoRoot` is derived by walking up from `__dirname` until we find a
 * `package.json` or fall back to `import.meta.dir/../../..`.
 *
 * Returns null when no file is found.
 */
function resolveSkillPath(skillName: string): string | null {
  // Derive repo root: this file lives at src/commands/context/context.ts
  // → ../../.. == repo root.
  const repoRoot = join(import.meta.dir, "..", "..", "..");
  const candidates = [
    join(repoRoot, "skills", skillName, "SKILL.md"),
    join(repoRoot, "agents", `${skillName}.md`),
    join(repoRoot, "skills", `${skillName}.md`),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

/**
 * Glob-match a vault-relative path against a simple glob pattern.
 * Supports `**` (cross-segment wildcard) and `*` (within-segment wildcard)
 * matching the same dialect used in `scripts/firewall.sh`.
 */
function matchesGlob(relPath: string, pattern: string): boolean {
  // Normalise: strip leading/trailing slashes.
  const p = pattern.replace(/^\/+|\/+$/g, "");
  const r = relPath.replace(/^\/+|\/+$/g, "");

  // Convert glob to regex: ** → .*, * → [^/]*.
  let re = "^";
  let i = 0;
  while (i < p.length) {
    const c = p[i];
    if (c === undefined) break;
    if (c === "*") {
      if (p[i + 1] === "*") {
        re += ".*";
        i += 2;
        // consume optional following /
        if (p[i] === "/") i++;
      } else {
        re += "[^/]*";
        i++;
      }
    } else if (/[\\^$.|?+()[\]{}]/.test(c)) {
      re += `\\${c}`;
      i++;
    } else {
      re += c;
      i++;
    }
  }
  re += "$";

  return new RegExp(re).test(r);
}

/**
 * Filter a list of vault-relative paths to those matching ANY of the given
 * glob patterns. Returns the original list unchanged when `globs` is empty.
 */
function filterByGlobs(files: readonly string[], globs: readonly string[]): readonly string[] {
  if (globs.length === 0) return files;
  return files.filter((f) => globs.some((g) => matchesGlob(f, g)));
}

// ── Main verb ─────────────────────────────────────────────────────────────────

export function context(opts: ContextOptions): ContextReport {
  const vault = (opts.target ?? resolveVault({ cwd: opts.cwd })).replace(/\/+$/, "");
  const skillName = opts.skill ?? "";

  // ── Resolve the skill's context contract ──────────────────────────────────
  let contractFound = false;
  let inputGlobs: readonly string[] = [];
  let referenceGlobs: readonly string[] = [];

  if (skillName !== "") {
    const skillPath = resolveSkillPath(skillName);
    if (skillPath !== null) {
      const skillMd = readFileSafe(skillPath);
      if (skillMd !== null) {
        const contract = parseContextContract(skillMd);
        if (contract !== null) {
          contractFound = true;
          inputGlobs = contract.inputs;
          referenceGlobs = contract.reference;
        }
      }
    }
  }

  // ── L0: vault schema + vocabulary ─────────────────────────────────────────
  const l0Candidates = [join(vault, "CLAUDE.md"), join(vault, "_vocabulary.md")];
  const l0 = Object.freeze(
    l0Candidates.filter((f) => existsSync(f)).map((f) => relative(vault, f)),
  );

  // ── L1: MOC hierarchy — vault index + per-folder index notes ──────────────
  const wikiDir = join(vault, "wiki");
  const l1Files: string[] = [];
  const wikiIndexPath = join(wikiDir, "index.md");
  if (existsSync(wikiIndexPath)) l1Files.push(wikiIndexPath);

  // Collect folder notes (isFolderNote) from the wiki tree.
  if (existsSync(wikiDir)) {
    for (const f of listMarkdownRecursive(wikiDir)) {
      if (isFolderNote(f) && f !== wikiIndexPath) {
        l1Files.push(f);
      }
    }
  }
  const l1 = Object.freeze(l1Files.sort().map((f) => relative(vault, f)));

  // ── L2: topic pages — non-bookkeeping, non-index wiki/ pages ──────────────
  const l2Files: string[] = [];
  if (existsSync(wikiDir)) {
    for (const f of listMarkdownRecursive(wikiDir)) {
      const stem = basename(f, ".md");
      if (BOOKKEEPING.has(stem)) continue;
      if (isFolderNote(f)) continue;
      // Exclude _sources and _synthesis subtrees from L2 (those are L3/synthesis).
      const rel = relative(wikiDir, f);
      if (rel.startsWith("_sources/") || rel.startsWith("_synthesis/")) continue;
      l2Files.push(f);
    }
  }
  const l2 = Object.freeze(l2Files.sort().map((f) => relative(vault, f)));

  // ── L3: source summaries — wiki/_sources/** ────────────────────────────────
  const sourcesDir = join(wikiDir, "_sources");
  let l3Raw: string[] = [];
  if (existsSync(sourcesDir)) {
    l3Raw = listMarkdownRecursive(sourcesDir).map((f) => relative(vault, f));
  }
  // Apply reference contract globs when present.
  const l3Applied = referenceGlobs.length > 0 ? filterByGlobs(l3Raw, referenceGlobs) : l3Raw;
  const l3 = Object.freeze(l3Applied);

  // ── L4: raw sources — raw/** ──────────────────────────────────────────────
  const rawDir = join(vault, "raw");
  let l4Raw: string[] = [];
  if (existsSync(rawDir)) {
    l4Raw = listMarkdownRecursive(rawDir).map((f) => relative(vault, f));
  }
  // Apply input contract globs when present.
  const l4Applied = inputGlobs.length > 0 ? filterByGlobs(l4Raw, inputGlobs) : l4Raw;
  const l4 = Object.freeze(l4Applied);

  // ── Token estimate ─────────────────────────────────────────────────────────
  // Resolve absolute paths for byte-size calculation.
  const allRelFiles: readonly string[] = [...l0, ...l1, ...l2, ...l3, ...l4];
  const allAbsFiles = allRelFiles.map((r) => join(vault, r));
  const tokenEstimate = estimateTokens(allAbsFiles);

  return Object.freeze({
    command: "context" as const,
    vault,
    skill: skillName,
    contractFound,
    layers: Object.freeze({
      l0,
      l1,
      l2,
      l3,
      l4,
    }),
    tokenEstimate,
  });
}

// ── Text renderer helper (used by cli.ts) ─────────────────────────────────────

/** Human-readable summary of a ContextReport. */
export function renderContextText(report: ContextReport): string {
  const lines: string[] = [];
  lines.push(`context: vault=${report.vault} skill=${report.skill || "(none)"}`);
  lines.push(`contract: ${report.contractFound ? "found" : "not found"}`);
  lines.push(`L0 schema+vocab: ${report.layers.l0.length} file(s)`);
  lines.push(`L1 MOC:          ${report.layers.l1.length} file(s)`);
  lines.push(`L2 topic pages:  ${report.layers.l2.length} file(s)`);
  lines.push(`L3 sources:      ${report.layers.l3.length} file(s)`);
  lines.push(`L4 raw:          ${report.layers.l4.length} file(s)`);
  lines.push(`token estimate:  ~${report.tokenEstimate}`);
  return lines.join("\n");
}
