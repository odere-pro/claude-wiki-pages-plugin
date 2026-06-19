/**
 * docs-check — glossary/CI Tier-0 gate — `lint --check docs`.
 *
 * Ports ALL of scripts/validate-docs.sh — Checks 0–4 (here) plus Check 5
 * (design-drift, ADR-0013, in ./design-drift.ts) — to pure TypeScript. Since the
 * docs-finish migration unit this module IS the gate: scripts/validate-docs.sh is
 * a thin wrapper over `engine lint --check docs`. Retirement was gated on a
 * whole-repo dual-run proving byte/count/file-identical results bash vs engine
 * across every check and every Check-5 sub-rule (5a–5g).
 *
 * Implemented checks:
 *
 *   Check 0  — banned strings (retired glossary terms: second-brain, vault-synthesize,
 *              vault-index, llm-wiki-stack, llm-wiki-ingest, llm-wiki-query, etc.)
 *              do not appear in tracked files outside the exemption list.
 *
 *   Check 0b — retired skill name `llm-wiki` (backtick-wrapped form or as a
 *              /claude-wiki-pages:llm-wiki reference) must not appear outside exemptions.
 *              The bare token `llm-wiki` is NOT banned (it collides with llm-wiki-pattern
 *              and docs/llm-wiki/); only the SKILL usage is checked.
 *
 *   Check 1  — SEO-register terms ("knowledge management", "knowledge base",
 *              "agent harness", "LLM Wiki Stack", "raw material") must not leak
 *              into technical surfaces (only README and GLOSSARY are exempt).
 *
 *   Check 2  — Layer references must be capitalized. "layer 1" → "Layer 1";
 *              "data layer" → "Data layer". Only .md files are scanned.
 *              Case-sensitive: only all-lowercase forms are violations.
 *
 *   Check 3  — Slash commands in markdown must carry the /claude-wiki-pages: prefix.
 *              Only backtick-wrapped forms are flagged (avoids false positives on
 *              file paths like skills/obsidian-cli/).
 *
 *   Check 4  — Every /claude-wiki-pages:<name> reference must resolve to a real
 *              skill directory (skills/<name>/), agent file (agents/<name>.md),
 *              or command file (commands/<name>.md).
 *
 * No git dependency: file discovery is done by walking the filesystem under
 * repoRoot (recursive read). This makes the module testable in sandboxes without
 * a real git repo.
 *
 * All checks are deterministic: same repo in → same findings out.
 * No embeddings, no network, no side effects.
 *
 * Exemption lists mirror scripts/validate-docs.sh exactly.
 *
 * @module docs-check
 */

import { join, relative } from "node:path";
import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import type { Finding } from "./report.ts";
import { checkDesignDrift } from "./design-drift.ts";
import { makeGitRepoIO, type RepoIO } from "./repo-io.ts";

// ── Constants ─────────────────────────────────────────────────────────────────

/** The check name prefix used on all findings from this module. */
const CHECK_PREFIX = "docs-check";

/**
 * Banned strings (word-boundary patterns).
 * Retired from the glossary in schema version 1 and at the 1.0.0 rebrand.
 * Mirror: validate-docs.sh BANNED_STRINGS
 */
const BANNED_PATTERNS: readonly RegExp[] = [
  /\bsecond-brain\b/i,
  /\bsecond brain\b/i,
  /\bvault-synthesize\b/i,
  /\bvault-index\b/i,
  /\bllm-wiki-stack\b/i,
  /\bllm-wiki-ingest\b/i,
  /\bllm-wiki-query\b/i,
  /\bllm-wiki-lint\b/i,
  /\bllm-wiki-fix\b/i,
  /\bllm-wiki-status\b/i,
  /\bllm-wiki-synthesize\b/i,
  /\bllm-wiki-index\b/i,
  /\bllm-wiki-markdown\b/i,
  /\bllm-wiki-ingest-pipeline\b/i,
  /\bllm-wiki-lint-fix\b/i,
  /\bllm-wiki-analyst\b/i,
];

/**
 * SEO-register terms that remain allowed in README/plugin.json/GLOSSARY but
 * nowhere else.
 * Mirror: validate-docs.sh SEO_LEAK
 */
const SEO_PATTERNS: readonly RegExp[] = [
  /\bknowledge base\b/i,
  /\bknowledge management\b/i,
  /\bagent harness\b/i,
  /LLM Wiki Stack/,
  /\braw material\b/i,
];

/**
 * Lowercase layer references that violate the capitalization rule.
 * "layer 1..4" and "{data|skills|agents|orchestration} layer" (all lowercase).
 * Case-sensitive: "Data layer" and "Layer 1" are canonical and must pass.
 * Mirror: validate-docs.sh LAYER_DRIFT
 */
const LAYER_DRIFT_RE = /\blayer [1-4]\b|\b(data|skills|agents|orchestration) layer\b/;

/**
 * Known slash-command names (without namespace prefix).
 * Mirror: validate-docs.sh NAMESPACED_NAMES
 */
const NAMESPACED_NAMES: readonly string[] = [
  "doctor",
  "wiki",
  "claude-wiki-pages-orchestrator-agent",
  "claude-wiki-pages-ingest-agent",
  "claude-wiki-pages-curator-agent",
  "claude-wiki-pages-analyst-agent",
  "ingest",
  "query",
  "lint",
  "fix",
  "status",
  "synthesize",
  "index",
  "markdown",
  "init",
  "onboarding",
  "engine-api",
  "maintain-contract",
  "claude-wiki-pages-onboarding-agent",
  "obsidian-graph-colors",
  "obsidian-markdown",
  "obsidian-bases",
  "obsidian-cli",
];

/** Sorted for deterministic regex alternation (longest first). */
const NAMESPACED_NAMES_RE = new RegExp(
  "`/(" +
    [...NAMESPACED_NAMES]
      .sort((a, b) => b.length - a.length)
      .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|") +
    ")([^-a-zA-Z0-9]|$)",
);

/** Match /claude-wiki-pages:<name> anywhere in text. */
const NAMESPACED_REF_RE = /\/claude-wiki-pages:([a-z][a-z0-9-]+)/g;

/**
 * The retired skill form: backtick-wrapped `llm-wiki` or /claude-wiki-pages:llm-wiki.
 * The bare token `llm-wiki` is intentionally NOT matched (Karpathy pattern + docs/llm-wiki/).
 * Mirror: validate-docs.sh RETIRED_SKILL
 */
const RETIRED_SKILL_RE = /`llm-wiki`|\/claude-wiki-pages:llm-wiki([^-a-zA-Z0-9]|$)/;

/**
 * Extensions to scan. Mirrors the validate-docs.sh glob set:
 * *.md *.json *.sh *.yml *.yaml (for Checks 0 and 1);
 * *.md only for Checks 2, 3, 4, 0b.
 */
const PROSE_EXTENSIONS = new Set([".md", ".json", ".sh", ".yml", ".yaml"]);

/**
 * Path prefixes excluded from the scan at the file-discovery layer.
 *
 * Mirrors scripts/validate-docs.sh ls_prose():
 *   git ls-files ... | grep -vE '^docs/vault/|^docs/claude-wiki-pages-plugin-vault/|(^|/)\.obsidian/'
 *
 * The bash uses `git ls-files` which naturally excludes untracked files (e.g.
 * test fixture corpora under tests/). The engine uses a filesystem walk, so
 * these prefix exclusions restore parity for the paths the bash explicitly
 * omits from tracked files.
 *
 * Note: `.obsidian/` is already excluded by SKIP_DIRS (directory name match).
 */
const DOGFOOD_VAULT_PREFIXES: readonly string[] = [
  "docs/vault/",
  "docs/claude-wiki-pages-plugin-vault/",
];

// ── Exemption helpers ─────────────────────────────────────────────────────────

/**
 * Files exempt from the BANNED_STRINGS check (they define/test the bans
 * or preserve historical record).
 * Mirror: validate-docs.sh BAN_EXEMPT
 */
const BAN_EXEMPT_PREFIXES: readonly string[] = [
  "scripts/validate-docs.sh",
  "docs/GLOSSARY.md",
  "CHANGELOG.md",
  "docs/adr/",
  "tests/",
  ".claude/fixtures/",
];

/**
 * Files exempt from the SEO-register check.
 * Mirror: validate-docs.sh SEO_EXEMPT
 *
 * Note: The bash gate uses `git ls-files` which naturally excludes untracked
 * files (e.g. tests/fixtures/docs-check-corpus/). The engine uses a filesystem
 * walk, so `tests/` is added here to restore parity for the SEO check — test
 * fixtures and Bats scripts are not project prose and may contain SEO terms
 * for testing purposes. The resolve check uses BAN_EXEMPT_PREFIXES which
 * already includes tests/ for the same reason.
 */
const SEO_EXEMPT_PREFIXES: readonly string[] = [
  "README.md",
  "docs/GLOSSARY.md",
  "scripts/validate-docs.sh",
  ".claude-plugin/plugin.json",
  "raw/",
  ".claude/fixtures/",
  "tests/",
];

/** Check whether a repo-relative path matches an exemption prefix list. */
function isExempt(rel: string, exemptions: readonly string[]): boolean {
  const norm = rel.replace(/\\/g, "/");
  for (const ex of exemptions) {
    if (ex.endsWith("/")) {
      // directory prefix
      if (norm.startsWith(ex) || norm.includes(`/${ex.slice(0, -1)}/`)) return true;
    } else {
      // exact match
      if (norm === ex) return true;
    }
  }
  // Check for raw/ embedded anywhere (vault raw/ dirs)
  if (/(^|\/)raw\//.test(norm)) {
    // raw/ is always exempt from SEO check — but we check it per-exemption above
  }
  return false;
}

/** Check SEO exemption with raw/ path embedding. */
function isSeoExempt(rel: string): boolean {
  if (isExempt(rel, SEO_EXEMPT_PREFIXES)) return true;
  // raw/ directory anywhere in path is exempt for SEO
  return /(^|\/)raw\//.test(rel.replace(/\\/g, "/"));
}

// ── File walker ───────────────────────────────────────────────────────────────

/**
 * Recursively list all files under `dir` whose extension is in `extensions`.
 * Skips `.git/`, `.obsidian/`, `node_modules/`, and `dist/` directories.
 * Skips paths matching `DOGFOOD_VAULT_PREFIXES` (mirrors validate-docs.sh ls_prose()).
 * Returns paths sorted for determinism, relative to `root`.
 */
function listFiles(root: string, extensions: Set<string>): readonly string[] {
  const SKIP_DIRS = new Set([".git", ".obsidian", "node_modules", "dist"]);
  const out: string[] = [];

  const walk = (dir: string): void => {
    // Check if this directory path matches a dogfood-vault prefix exclusion.
    // Convert to repo-relative path with trailing slash for prefix comparison.
    const relDir = relative(root, dir).replace(/\\/g, "/") + "/";
    for (const prefix of DOGFOOD_VAULT_PREFIXES) {
      if (relDir === prefix || relDir.startsWith(prefix)) return;
    }

    let entries: string[];
    try {
      entries = readdirSync(dir).sort();
    } catch {
      return;
    }
    for (const name of entries) {
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        if (!SKIP_DIRS.has(name)) walk(full);
      } else if (st.isFile()) {
        const ext = name.includes(".") ? `.${name.split(".").pop()!}` : "";
        if (extensions.has(ext)) {
          out.push(relative(root, full).replace(/\\/g, "/"));
        }
      }
    }
  };

  if (existsSync(root)) walk(root);
  return out.sort();
}

/**
 * List git-tracked prose files (mirrors validate-docs.sh ls_prose()):
 *   git ls-files | filter by extension
 *               | grep -vE '^docs/vault/|^docs/claude-wiki-pages-plugin-vault/|(^|/)\.obsidian/'
 *
 * This is the production parity path — same tracked-only scope as the bash gate,
 * so untracked files (e.g. the test fixture corpus) never enter the scan.
 */
function trackedProseFiles(io: RepoIO, extensions: Set<string>): readonly string[] {
  const out: string[] = [];
  for (const rel of io.lsFiles()) {
    // Dogfood-vault + Obsidian-config exclusions (mirror ls_prose grep -v).
    if (DOGFOOD_VAULT_PREFIXES.some((p) => rel.startsWith(p))) continue;
    if (/(^|\/)\.obsidian\//.test(rel)) continue;
    const dot = rel.lastIndexOf(".");
    const ext = dot === -1 ? "" : rel.slice(dot);
    if (extensions.has(ext)) out.push(rel);
  }
  return out.sort();
}

/** Read a file as UTF-8, returning null on failure. */
function readSafe(absPath: string): string | null {
  try {
    return readFileSync(absPath, "utf8");
  } catch {
    return null;
  }
}

// ── Check types ───────────────────────────────────────────────────────────────

/** Named checks selectable via opts.onlyChecks. */
export type DocsCheckName =
  | "banned"
  | "retired-skill"
  | "seo"
  | "layer-cap"
  | "bare-slash"
  | "resolve"
  | "design-drift";

/**
 * Options for checkDocs.
 */
export interface DocsCheckOptions {
  /**
   * Run only the named sub-checks (default: all).
   * Use this to isolate a single check in tests or via --check subflags.
   */
  readonly onlyChecks?: readonly DocsCheckName[];
  /**
   * Override the file extensions to scan (default: .md .json .sh .yml .yaml).
   * Useful in tests; normally not set.
   */
  readonly extensions?: readonly string[];
  /**
   * Inject a RepoIO. When set, checks 0–4 scan ONLY git-tracked files (matching
   * scripts/validate-docs.sh `git ls-files`) and Check 5 (design-drift) runs.
   * When omitted, file discovery uses a filesystem walk and Check 5 is skipped
   * (the legacy sandbox-test behaviour — no git dependency).
   *
   * The production path (`lint --check docs`) passes a git-backed RepoIO via the
   * `git: true` convenience flag below; tests inject a memory RepoIO directly.
   */
  readonly io?: RepoIO;
  /**
   * Convenience flag for the production path: build a git-backed RepoIO rooted at
   * `repoRoot`. Equivalent to `io: makeGitRepoIO(repoRoot)`. Ignored when `io` is set.
   */
  readonly git?: boolean;
}

// ── Check 0: banned strings ───────────────────────────────────────────────────

function runBannedStrings(repoRoot: string, files: readonly string[]): Finding[] {
  const findings: Finding[] = [];
  for (const rel of files) {
    if (isExempt(rel, BAN_EXEMPT_PREFIXES)) continue;
    const content = readSafe(join(repoRoot, rel));
    if (content === null) continue;
    for (const pattern of BANNED_PATTERNS) {
      if (pattern.test(content)) {
        findings.push({
          severity: "error",
          check: `${CHECK_PREFIX}-banned`,
          message: `banned string (${pattern.source}) in ${rel}`,
          file: rel,
        });
        // One finding per file (file-level report, mirrors bash BAN_HITS per file)
        break;
      }
    }
  }
  return findings;
}

// ── Check 0b: retired skill name llm-wiki ─────────────────────────────────────

function runRetiredSkill(repoRoot: string, mdFiles: readonly string[]): Finding[] {
  const findings: Finding[] = [];
  for (const rel of mdFiles) {
    if (isExempt(rel, BAN_EXEMPT_PREFIXES)) continue;
    const content = readSafe(join(repoRoot, rel));
    if (content === null) continue;
    if (RETIRED_SKILL_RE.test(content)) {
      findings.push({
        severity: "error",
        check: `${CHECK_PREFIX}-retired-skill`,
        message: `retired skill name \`llm-wiki\` in ${rel} (use \`init\`)`,
        file: rel,
      });
    }
  }
  return findings;
}

// ── Check 1: SEO-register leaks ───────────────────────────────────────────────

function runSeoLeaks(repoRoot: string, files: readonly string[]): Finding[] {
  const findings: Finding[] = [];
  for (const rel of files) {
    if (isSeoExempt(rel)) continue;
    const content = readSafe(join(repoRoot, rel));
    if (content === null) continue;
    for (const pattern of SEO_PATTERNS) {
      if (pattern.test(content)) {
        findings.push({
          severity: "error",
          check: `${CHECK_PREFIX}-seo`,
          message: `SEO-register term (${pattern.source}) in ${rel}`,
          file: rel,
        });
        // One finding per file (mirrors bash SEO_HITS per file)
        break;
      }
    }
  }
  return findings;
}

// ── Check 2: layer capitalization ─────────────────────────────────────────────

function runLayerCap(repoRoot: string, mdFiles: readonly string[]): Finding[] {
  const findings: Finding[] = [];
  for (const rel of mdFiles) {
    if (isExempt(rel, BAN_EXEMPT_PREFIXES)) continue;
    const content = readSafe(join(repoRoot, rel));
    if (content === null) continue;
    if (LAYER_DRIFT_RE.test(content)) {
      findings.push({
        severity: "error",
        check: `${CHECK_PREFIX}-layer-cap`,
        message: `lowercase layer reference in ${rel}`,
        file: rel,
      });
    }
  }
  return findings;
}

// ── Check 3: bare slash commands ──────────────────────────────────────────────

function runBareSlash(repoRoot: string, mdFiles: readonly string[]): Finding[] {
  const findings: Finding[] = [];
  for (const rel of mdFiles) {
    if (isExempt(rel, BAN_EXEMPT_PREFIXES)) continue;
    const content = readSafe(join(repoRoot, rel));
    if (content === null) continue;
    if (NAMESPACED_NAMES_RE.test(content)) {
      findings.push({
        severity: "error",
        check: `${CHECK_PREFIX}-bare-slash`,
        message: `bare slash command in ${rel} (missing /claude-wiki-pages: prefix)`,
        file: rel,
      });
    }
  }
  return findings;
}

// ── Check 4: slash-command references resolve ──────────────────────────────────

/**
 * Resolve /claude-wiki-pages:<name> → one of:
 *   skills/<name>/      (directory)
 *   agents/<name>.md    (file)
 *   commands/<name>.md  (file)
 */
function refResolves(repoRoot: string, name: string): boolean {
  if (existsSync(join(repoRoot, "skills", name))) return true;
  if (existsSync(join(repoRoot, "agents", `${name}.md`))) return true;
  if (existsSync(join(repoRoot, "commands", `${name}.md`))) return true;
  return false;
}

function runResolve(repoRoot: string, mdFiles: readonly string[]): Finding[] {
  // Collect all unique /claude-wiki-pages:<name> references across all markdown files.
  // Exempt files in BAN_EXEMPT_PREFIXES (e.g. tests/, docs/adr/, CHANGELOG.md)
  // because the bash gate uses git ls-files which excludes untracked test fixtures,
  // and because historical/test files may intentionally reference retired names.
  const seenRefs = new Map<string, string[]>(); // name → [file, ...]

  for (const rel of mdFiles) {
    if (isExempt(rel, BAN_EXEMPT_PREFIXES)) continue;
    const content = readSafe(join(repoRoot, rel));
    if (content === null) continue;
    let m: RegExpExecArray | null;
    const re = new RegExp(NAMESPACED_REF_RE.source, "g");
    while ((m = re.exec(content)) !== null) {
      const name = m[1];
      if (name === undefined) continue;
      const existing = seenRefs.get(name);
      if (existing !== undefined) {
        existing.push(rel);
      } else {
        seenRefs.set(name, [rel]);
      }
    }
  }

  const findings: Finding[] = [];
  for (const [name, usedIn] of [...seenRefs.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (refResolves(repoRoot, name)) continue;
    // Show the first file that references it in the finding message
    const firstFile = usedIn[0] ?? "(unknown)";
    findings.push({
      severity: "error",
      check: `${CHECK_PREFIX}-resolve`,
      message: `/claude-wiki-pages:${name} does not resolve to skills/${name}/, agents/${name}.md, or commands/${name}.md (first seen in ${firstFile})`,
      file: firstFile,
    });
  }
  return findings;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Run the glossary/docs checks (Checks 0–4 of scripts/validate-docs.sh) against
 * `repoRoot` and return one `Finding` per violation.
 *
 * @param repoRoot Absolute path to the repository root (the directory that
 *   contains `scripts/`, `docs/`, `skills/`, `agents/`, etc.). This is NOT the
 *   vault root — it is the plugin repository root.
 * @param opts Optional flags to restrict which checks run or which extensions
 *   to scan.
 * @returns Frozen array of findings sorted deterministically by (check, file, message).
 */
export function checkDocs(repoRoot: string, opts: DocsCheckOptions = {}): readonly Finding[] {
  const only = opts.onlyChecks ? new Set(opts.onlyChecks) : null;
  const shouldRun = (name: DocsCheckName): boolean => only === null || only.has(name);

  // ── RepoIO seam ──────────────────────────────────────────────────────────────
  // When a RepoIO is present (production path or git-backed tests), checks 0–4
  // scan ONLY git-tracked files (matching validate-docs.sh `git ls-files`) and
  // Check 5 (design-drift) runs. Without one, the filesystem walk is used and
  // Check 5 is skipped — the legacy sandbox-test behaviour.
  const io: RepoIO | null = opts.io ?? (opts.git ? makeGitRepoIO(repoRoot) : null);

  // ── File lists ─────────────────────────────────────────────────────────────
  const defaultExt = opts.extensions ? new Set(opts.extensions) : PROSE_EXTENSIONS;
  const allFiles = io ? trackedProseFiles(io, defaultExt) : listFiles(repoRoot, defaultExt);
  const mdFiles = allFiles.filter((f) => f.endsWith(".md"));

  const findings: Finding[] = [];

  // Check 0: banned strings — all prose files
  if (shouldRun("banned")) {
    findings.push(...runBannedStrings(repoRoot, allFiles));
  }

  // Check 0b: retired skill name — markdown only
  if (shouldRun("retired-skill")) {
    findings.push(...runRetiredSkill(repoRoot, mdFiles));
  }

  // Check 1: SEO leaks — all prose files
  if (shouldRun("seo")) {
    findings.push(...runSeoLeaks(repoRoot, allFiles));
  }

  // Check 2: layer capitalization — markdown only
  if (shouldRun("layer-cap")) {
    findings.push(...runLayerCap(repoRoot, mdFiles));
  }

  // Check 3: bare slash commands — markdown only
  if (shouldRun("bare-slash")) {
    findings.push(...runBareSlash(repoRoot, mdFiles));
  }

  // Check 4: slash-command resolution — markdown only (collect across all md files)
  if (shouldRun("resolve")) {
    findings.push(...runResolve(repoRoot, mdFiles));
  }

  // Check 5: design-drift (ADR-0013) — only with a RepoIO (needs git ls-files
  // for the scan set + hook set-equality ground truth). Matches validate-docs.sh,
  // which gates Check 5 on hooks/hooks.json being tracked.
  if (shouldRun("design-drift") && io !== null) {
    findings.push(...checkDesignDrift(io));
  }

  // Deterministic sort: (check, file, message)
  findings.sort((a, b) => {
    const ck = a.check.localeCompare(b.check);
    if (ck !== 0) return ck;
    const fa = a.file ?? "";
    const fb = b.file ?? "";
    const fk = fa.localeCompare(fb);
    if (fk !== 0) return fk;
    return a.message.localeCompare(b.message);
  });

  return Object.freeze(findings);
}
