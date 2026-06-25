/**
 * feature-coverage — the tests-as-documentation gate (Phase 3).
 *
 * Keeps the test suite honest as the plugin's technical documentation. Three checks,
 * in the spirit of the design-drift gate (it grounds every claim against the real
 * filesystem, never a hand-maintained mirror):
 *
 *   1. inventory completeness — every user-facing feature (hook event, engine verb,
 *      skill, agent, command) has at least one documenting test. The mapping comes
 *      from the FEATURE INDEX table in tests/scripts/CLAUDE.md (the `Documents`
 *      column) plus the `Feature:` describe prefixes harvested from the TS suite.
 *      Soft (warn) by default; `--strict-completeness` promotes it to error (Phase 4).
 *   2. title conformance — every `@test` in a `.bats` file leads with its FEATURE
 *      INDEX label; every top-level `describe(` in a `*.test.ts` opens with `Feature: `.
 *   3. index freshness — the set of `.bats` files and the set of FEATURE INDEX rows
 *      are equal (no orphan file, no stale row).
 *
 * Deterministic: same repo in → same violations out. No network, no embeddings.
 *
 * Run standalone: `bun src/core/feature-coverage.ts [--strict-completeness]`
 * (exit 0 clean / 1 violations / 2 internal error). Unit-tested by
 * feature-coverage.test.ts (gate-01). Invoked in CI by gate-14-feature-coverage.sh.
 *
 * @module feature-coverage
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

/** A single coverage violation. */
export interface CoverageViolation {
  /** Stable machine tag, e.g. `index-freshness`, `bats-title`, `ts-describe`, `completeness`. */
  readonly kind: string;
  readonly severity: "error" | "warn";
  readonly message: string;
}

/** The result of a coverage run. */
export interface CoverageResult {
  readonly violations: readonly CoverageViolation[];
  readonly errorCount: number;
  readonly warnCount: number;
}

/** One parsed FEATURE INDEX row. */
export interface FeatureIndexRow {
  readonly file: string;
  readonly feature: string;
  readonly layer: string;
  readonly documents: readonly string[];
}

/** The user-facing inventory derived from the filesystem. */
export interface Inventory {
  readonly hooks: readonly string[];
  readonly skills: readonly string[];
  readonly agents: readonly string[];
  readonly commands: readonly string[];
  readonly verbs: readonly string[];
}

export interface CoverageOptions {
  /** Severity for the inventory-completeness check. Default `warn` (Phase 3). */
  readonly completenessSeverity?: "warn" | "error";
}

const BATS_DIR = join("tests", "scripts");
const INDEX_DOC = join("tests", "scripts", "CLAUDE.md");

/** Matches a FEATURE INDEX data row: first cell is a backtick-wrapped `*.bats` name. */
const INDEX_ROW_RE = /^\|\s*`([a-z0-9-]+\.bats)`\s*\|/;

/** Extracts a `@test` title (the text between the first quote and the closing `" {`). */
const TEST_TITLE_RE = /^\s*@test\s+"(.*)"\s*\{/;

/** A top-level `describe(` line and its opening string literal (double-quote or backtick). */
const TOPLEVEL_DESCRIBE_RE = /^describe\(\s*["`]([^"`]*)/;

// ── FEATURE INDEX ────────────────────────────────────────────────────────────

/** Parse the FEATURE INDEX table from tests/scripts/CLAUDE.md. */
export function parseFeatureIndex(root: string): FeatureIndexRow[] {
  const path = join(root, INDEX_DOC);
  const text = readFileSync(path, "utf8");
  const rows: FeatureIndexRow[] = [];
  for (const line of text.split("\n")) {
    const m = INDEX_ROW_RE.exec(line);
    if (!m || m[1] === undefined) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 4) continue;
    const documents = (cells[3] ?? "")
      .split(",")
      .map((d) => d.trim())
      .filter((d) => d.length > 0);
    rows.push({ file: m[1], feature: cells[1] ?? "", layer: cells[2] ?? "", documents });
  }
  return rows;
}

/** List the `.bats` files actually present under tests/scripts/. */
export function listBatsFiles(root: string): string[] {
  const dir = join(root, BATS_DIR);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".bats"))
    .sort();
}

// ── Check 3: index freshness ─────────────────────────────────────────────────

export function checkIndexFreshness(
  rows: readonly FeatureIndexRow[],
  batsFiles: readonly string[],
): CoverageViolation[] {
  const out: CoverageViolation[] = [];
  const indexed = new Set(rows.map((r) => r.file));
  const actual = new Set(batsFiles);
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.file)) {
      out.push({
        kind: "index-freshness",
        severity: "error",
        message: `FEATURE INDEX has a duplicate row for ${r.file}`,
      });
    }
    seen.add(r.file);
    if (!actual.has(r.file)) {
      out.push({
        kind: "index-freshness",
        severity: "error",
        message: `FEATURE INDEX row ${r.file} has no matching file in ${BATS_DIR}/`,
      });
    }
  }
  for (const f of batsFiles) {
    if (!indexed.has(f)) {
      out.push({
        kind: "index-freshness",
        severity: "error",
        message: `${BATS_DIR}/${f} is not listed in the FEATURE INDEX`,
      });
    }
  }
  return out;
}

// ── Check 2a: Bats title conformance ─────────────────────────────────────────

export function checkBatsTitles(
  root: string,
  rows: readonly FeatureIndexRow[],
): CoverageViolation[] {
  const out: CoverageViolation[] = [];
  for (const row of rows) {
    const path = join(root, BATS_DIR, row.file);
    if (!existsSync(path)) continue; // freshness check already reports the mismatch
    const text = readFileSync(path, "utf8");
    const prefix = `${row.feature}: `;
    const lines = text.split("\n");
    for (const [i, line] of lines.entries()) {
      const m = TEST_TITLE_RE.exec(line);
      if (!m || m[1] === undefined) continue;
      const title = m[1];
      if (!title.startsWith(prefix)) {
        out.push({
          kind: "bats-title",
          severity: "error",
          message: `${BATS_DIR}/${row.file}:${i + 1} — title must lead with "${row.feature}: " (got "${title}")`,
        });
      }
    }
  }
  return out;
}

// ── Check 2b: TS describe conformance ────────────────────────────────────────

/** Recursively collect every `*.test.ts` under the given roots. */
export function collectTestFiles(root: string, subdirs: readonly string[]): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules") continue;
        walk(full);
      } else if (entry.name.endsWith(".test.ts")) {
        out.push(full);
      }
    }
  };
  for (const sub of subdirs) walk(join(root, sub));
  return out.sort();
}

export function checkTsDescribes(root: string): {
  violations: CoverageViolation[];
  describeStrings: string[];
} {
  const out: CoverageViolation[] = [];
  const describeStrings: string[] = [];
  const files = collectTestFiles(root, ["src", join("tests", "engine")]);
  for (const path of files) {
    const text = readFileSync(path, "utf8");
    const lines = text.split("\n");
    for (const [i, line] of lines.entries()) {
      const m = TOPLEVEL_DESCRIBE_RE.exec(line);
      if (!m || m[1] === undefined) continue;
      const str = m[1];
      describeStrings.push(str);
      if (!str.startsWith("Feature: ")) {
        const rel = path.startsWith(root) ? path.slice(root.length + 1) : path;
        out.push({
          kind: "ts-describe",
          severity: "error",
          message: `${rel}:${i + 1} — top-level describe must open with "Feature: " (got "${str}")`,
        });
      }
    }
  }
  return { violations: out, describeStrings };
}

// ── Inventory ────────────────────────────────────────────────────────────────

export function collectInventory(root: string): Inventory {
  // Hook events — top-level keys of hooks/hooks.json's `hooks` object.
  const hooksJson = JSON.parse(readFileSync(join(root, "hooks", "hooks.json"), "utf8")) as {
    hooks?: Record<string, unknown>;
  };
  const hooks = Object.keys(hooksJson.hooks ?? hooksJson);

  // Skills — directory names under skills/.
  const skills = readdirSync(join(root, "skills"), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  // Agents — claude-wiki-pages-<name>-agent.md → <name>.
  const agents = readdirSync(join(root, "agents"))
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/^claude-wiki-pages-/, "").replace(/-agent\.md$/, ""));

  // Commands — basenames under commands/.
  const commands = readdirSync(join(root, "commands"))
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));

  // Engine verbs — implemented entries of the CAPABILITIES table in src/cli/cli.ts.
  const cli = readFileSync(join(root, "src", "cli", "cli.ts"), "utf8");
  const verbs: string[] = [];
  const verbRe = /\{\s*name:\s*"([a-z-]+)",\s*status:\s*"implemented"\s*\}/g;
  let vm: RegExpExecArray | null;
  while ((vm = verbRe.exec(cli)) !== null) {
    if (vm[1] !== undefined) verbs.push(vm[1]);
  }

  return { hooks, skills, agents, commands, verbs };
}

// ── Check 1: inventory completeness ──────────────────────────────────────────

/** Build the coverage sets from the FEATURE INDEX `Documents` column + TS describes. */
export function buildCoverage(
  rows: readonly FeatureIndexRow[],
  describeStrings: readonly string[],
  verbs: readonly string[],
): {
  hooks: Set<string>;
  skills: Set<string>;
  agents: Set<string>;
  commands: Set<string>;
  verbs: Set<string>;
} {
  const hooks = new Set<string>();
  const skills = new Set<string>();
  const agents = new Set<string>();
  const commands = new Set<string>();
  const verbsCovered = new Set<string>();
  const verbSet = new Set(verbs);

  for (const row of rows) {
    for (const tok of row.documents) {
      if (tok.startsWith("skill:")) skills.add(tok.slice("skill:".length));
      else if (tok.startsWith("agent:")) agents.add(tok.slice("agent:".length));
      else if (tok.startsWith("cmd:")) commands.add(tok.slice("cmd:".length));
      else if (tok === "infra" || tok === "eval") continue;
      else if (verbSet.has(tok)) verbsCovered.add(tok);
      else hooks.add(tok); // bare hook-event token (SessionStart, PreToolUse, …)
    }
  }

  // TS-side verb coverage: a verb is documented if any top-level describe names it.
  const haystack = describeStrings.map((s) => s.toLowerCase());
  for (const v of verbs) {
    const needle = v.toLowerCase();
    if (haystack.some((s) => new RegExp(`\\b${needle.replace(/[-]/g, "\\-")}\\b`).test(s)))
      verbsCovered.add(v);
  }

  return { hooks, skills, agents, commands, verbs: verbsCovered };
}

export function checkCompleteness(
  inv: Inventory,
  rows: readonly FeatureIndexRow[],
  describeStrings: readonly string[],
  severity: "warn" | "error",
): CoverageViolation[] {
  const cov = buildCoverage(rows, describeStrings, inv.verbs);
  const out: CoverageViolation[] = [];
  const report = (category: string, missing: readonly string[]): void => {
    for (const name of missing) {
      out.push({
        kind: "completeness",
        severity,
        message: `${category} "${name}" has no documenting test`,
      });
    }
  };
  report(
    "hook event",
    inv.hooks.filter((h) => !cov.hooks.has(h)),
  );
  report(
    "skill",
    inv.skills.filter((s) => !cov.skills.has(s)),
  );
  report(
    "agent",
    inv.agents.filter((a) => !cov.agents.has(a)),
  );
  report(
    "command",
    inv.commands.filter((c) => !cov.commands.has(c)),
  );
  report(
    "engine verb",
    inv.verbs.filter((v) => !cov.verbs.has(v)),
  );
  return out;
}

// ── Top-level run ────────────────────────────────────────────────────────────

export function checkFeatureCoverage(root: string, opts: CoverageOptions = {}): CoverageResult {
  const completenessSeverity = opts.completenessSeverity ?? "warn";
  const rows = parseFeatureIndex(root);
  const batsFiles = listBatsFiles(root);
  const ts = checkTsDescribes(root);
  const inv = collectInventory(root);

  const violations: CoverageViolation[] = [
    ...checkIndexFreshness(rows, batsFiles),
    ...checkBatsTitles(root, rows),
    ...ts.violations,
    ...checkCompleteness(inv, rows, ts.describeStrings, completenessSeverity),
  ];

  const errorCount = violations.filter((v) => v.severity === "error").length;
  const warnCount = violations.filter((v) => v.severity === "warn").length;
  return { violations, errorCount, warnCount };
}

// ── CLI entry ────────────────────────────────────────────────────────────────

if (import.meta.main) {
  const strict = process.argv.includes("--strict-completeness");
  const root = process.cwd();
  try {
    // Fail loudly if the repo shape is wrong rather than silently passing.
    if (!existsSync(join(root, INDEX_DOC)) || !statSync(join(root, BATS_DIR)).isDirectory()) {
      process.stderr.write(
        `feature-coverage: cannot find ${INDEX_DOC} or ${BATS_DIR}/ under ${root}\n`,
      );
      process.exit(2);
    }
    const result = checkFeatureCoverage(root, { completenessSeverity: strict ? "error" : "warn" });
    for (const v of result.violations) {
      const tag = v.severity === "error" ? "ERROR" : "WARN";
      process.stdout.write(`${tag} [${v.kind}] ${v.message}\n`);
    }
    process.stdout.write(
      `\nfeature-coverage: ${result.errorCount} error(s), ${result.warnCount} warning(s)\n`,
    );
    process.exit(result.errorCount > 0 ? 1 : 0);
  } catch (err) {
    process.stderr.write(`feature-coverage: internal error — ${(err as Error).message}\n`);
    process.exit(2);
  }
}
