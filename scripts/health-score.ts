#!/usr/bin/env bun
/**
 * health-score.ts — the vault's single self-health estimate (0–100 + grade).
 *
 * No new measurement: a pure, deterministic AGGREGATION of signals the engine
 * already emits — graph-quality (dangling, connectivity, cluster shape, catalog
 * coverage) and engine `verify` (structural errors/warnings). One number the
 * orchestrator and `/claude-wiki-pages:doctor` can report so a user can tell at a
 * glance whether the wiki is healthy and, after a plugin update, whether a
 * self-heal pass is warranted.
 *
 * Offline / NO-RAG (gate-13): shells only to the local graph-quality + verify
 * helpers, no network, no embeddings. Read-only; never writes the vault.
 * Exit 0 always — callers gate on the JSON/text output.
 *
 * Usage: health-score.ts --target <vault> [--json]
 */

import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const target = arg("--target");
if (target === undefined) {
  console.error("usage: health-score.ts --target <vault> [--json]");
  process.exit(2);
}
const asJson = process.argv.includes("--json");
const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);

/** Run a helper and parse its JSON stdout; null on any failure (degrade soft). */
function runJson(cmd: string, args: string[]): Record<string, unknown> | null {
  try {
    const out = execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return JSON.parse(out) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Run a deterministic `--check` writer (exit 3 = drift, 0 = clean) read-only.
 * Returns `"drift"`, `"clean"`, or `"skip"` (couldn't run). These are the
 * auto-fixable presentation issues a plugin update commonly introduces.
 */
function runCheck(cmd: string, args: string[]): "drift" | "clean" | "skip" {
  try {
    execFileSync(cmd, args, { stdio: "ignore" });
    return "clean";
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    return status === 3 ? "drift" : "skip";
  }
}

const num = (v: unknown, fallback = 0): number => (typeof v === "number" && isFinite(v) ? v : fallback);

// ── gather the already-emitted signals ───────────────────────────────────────
const gq = runJson("bun", [join(SCRIPT_DIR, "graph-quality.ts"), "--target", target, "--json"]);
const verify = runJson("bash", [join(SCRIPT_DIR, "engine.sh"), "verify", "--target", target, "--json"]);
// Auto-fixable presentation drift (read-only --check, exit 3 = drift).
const obsidianConfig = runCheck("bash", [join(SCRIPT_DIR, "apply-obsidian-config.sh"), "--target", target, "--check"]);
const ghostLinks = runCheck("bash", [join(SCRIPT_DIR, "heal-ghost-links.sh"), "--target", target, "--check"]);

const conn = (gq?.["connectivity"] as Record<string, unknown> | undefined) ?? {};
const danglingCount = num(gq?.["danglingCount"]);
const nodes = num(conn["nodes"]);
const orphanCount = num(conn["orphanCount"]);
const components = num(conn["components"]);
const Cn = num(gq?.["Cn"]);
// catalogCoverage is optional (1 = no catalog / fully covered).
const catalogCoverage = gq?.["catalogCoverage"] === undefined ? 1 : num(gq?.["catalogCoverage"], 1);
// ADR-0036 strict-tree conformance signals (added to the graph-quality JSON).
// Absent on a pre-0036 graph-quality → treeConformance defaults to 1 (no drift).
const treeConformance = gq?.["treeConformance"] === undefined ? 1 : num(gq?.["treeConformance"], 1);
const nonSpineEdgeCount = num(gq?.["nonSpineEdgeCount"]);
const crossTreeEdgeCount = num(gq?.["crossTreeEdgeCount"]);
const cycleCount = num(gq?.["cycleCount"]);
const multiParentCount = num(gq?.["multiParentCount"]);

// engine verify report shape: { summary: { errors, warnings } } or flat.
const vSummary = (verify?.["summary"] as Record<string, unknown> | undefined) ?? verify ?? {};
const verifyErrors = num(vSummary["errors"]);
const verifyWarnings = num(vSummary["warnings"]);

// ── scoring: weighted 0–100 over six clamped sub-scores ──────────────────────
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const orphanRatio = nodes > 0 ? orphanCount / nodes : 0;

// Each sub-score ∈ [0,1]; weights sum to 100.
const sub = {
  // Link integrity: zero dangling is full marks; each dangling target costs ~3%.
  linkIntegrity: { weight: 25, value: clamp01(1 - danglingCount * 0.03) },
  // Connectivity: penalize orphan fraction (0 orphans → full).
  connectivity: { weight: 20, value: clamp01(1 - orphanRatio * 2) },
  // Cluster + tree shape: average of Cn (filing ratio) and treeConformance
  // (ADR-0036 strict tree) — both target 1.0. The retired Ce edge-fraction
  // (ADR-0033) is subsumed by treeConformance. Strict-tree drift lowers the score.
  clusterShape: { weight: 20, value: clamp01((Cn + treeConformance) / 2) },
  // Structural integrity: any verify error is a hard hit; warnings cost less.
  structural: { weight: 20, value: clamp01(1 - verifyErrors * 0.25 - verifyWarnings * 0.02) },
  // Catalog coverage: families present / families in any structured catalog.
  catalog: { weight: 15, value: clamp01(catalogCoverage) },
};

const available = gq !== null;
const score = available
  ? Math.round(Object.values(sub).reduce((acc, s) => acc + s.weight * s.value, 0))
  : 0;

function gradeOf(s: number): string {
  if (s >= 90) return "A";
  if (s >= 80) return "B";
  if (s >= 70) return "C";
  if (s >= 60) return "D";
  return "F";
}
const grade = available ? gradeOf(score) : "?";

// ── concrete "heal would help" signals (drives the wiki autofix route) ───────
const issues: string[] = [];
if (danglingCount > 0) issues.push(`${danglingCount} dangling wikilink target(s)`);
if (orphanCount > 0) issues.push(`${orphanCount} orphan node(s)`);
if (verifyErrors > 0) issues.push(`${verifyErrors} structural verify error(s)`);
if (nodes > 0 && Cn < 0.85) issues.push(`low cluster concentration (Cn=${Cn})`);
if (catalogCoverage < 1) issues.push(`incomplete catalog coverage (${Math.round(catalogCoverage * 100)}%)`);
// ADR-0036 strict-tree drift (drives the wiki self-heal route via strict-tree-reduce).
if (crossTreeEdgeCount > 0) issues.push(`${crossTreeEdgeCount} cross-tree edge(s) — graph is not a strict tree`);
if (cycleCount > 0) issues.push(`${cycleCount} parent-chain cycle(s)`);
if (multiParentCount > 0) issues.push(`${multiParentCount} multi-parent page(s)`);
if (treeConformance < 0.85) issues.push(`low tree conformance (treeConformance=${treeConformance}, ${nonSpineEdgeCount} non-spine edge(s))`);
if (obsidianConfig === "drift") issues.push("Obsidian graph config is stale (raw/ sprawl, missing island filter)");
if (ghostLinks === "drift") issues.push("ghost wikilinks need healing (alias/title-only citations)");

const result = {
  vault: target,
  available,
  score,
  grade,
  needsHeal: issues.length > 0,
  issues,
  components: Object.fromEntries(
    Object.entries(sub).map(([k, v]) => [k, { weight: v.weight, value: Math.round(v.value * 100) / 100 }]),
  ),
  signals: {
    danglingCount,
    nodes,
    orphanCount,
    components,
    Cn,
    catalogCoverage,
    treeConformance,
    nonSpineEdgeCount,
    crossTreeEdgeCount,
    cycleCount,
    multiParentCount,
    verifyErrors,
    verifyWarnings,
    obsidianConfig,
    ghostLinks,
  },
};

if (asJson) {
  console.log(JSON.stringify(result, null, 2));
} else if (!available) {
  console.log(`health: unavailable (graph-quality could not run on ${target})`);
} else {
  console.log(`health: ${score}/100 (${grade})  ${result.needsHeal ? "— heal recommended" : "— healthy"}`);
  for (const [k, v] of Object.entries(result.components)) {
    console.log(`  ${k}: ${Math.round(v.value * v.weight)}/${v.weight}`);
  }
  if (issues.length) for (const i of issues) console.log(`  • ${i}`);
}
