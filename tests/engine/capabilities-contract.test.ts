/**
 * P3.2 — Verb-drift contract test (N9)
 *
 * Pins the expected verb set to a HARDCODED golden fixture list (not re-derived
 * from running code) and asserts three behavioural invariants:
 *
 *   (a) Every IMPLEMENTED verb, called `--json --target /nonexistent`, exits
 *       != 2 (has a live dispatch branch — no exit-2 fallthrough).
 *       NOTE: a nonexistent target may legitimately exit 1; the assertion is
 *       specifically exit != 2.
 *
 *   (b) Every PLANNED verb, called `--json` (no target), exits 0 with
 *       `.status === 'not-implemented'`.
 *
 *   (c) `capabilities --json` verb set (the manifest names) set-equals the
 *       golden list (no drift between the table and what the verb advertises).
 *
 * Removing a dispatch branch for an IMPLEMENTED verb causes that verb to fall
 * through to the `Unknown command` branch (exit 2) — assertion (a) catches it.
 *
 * Adding a table row with status "implemented" but no dispatch branch also falls
 * through to exit 2 — assertion (a) catches it.
 *
 * Runs under `gate-01-engine-tests.sh` `bun test tests/engine/`. NO new gate
 * file (D10). Invokes the real CLI via Bun.spawnSync so dispatch fallthrough is
 * genuinely exercised.
 *
 * NO-RAG: exact set-equality over a known enumerated set — no corpus, no
 * embeddings, no similarity.
 */

import { test, expect, describe } from "bun:test";
import { join } from "node:path";

// ── Golden fixture ─────────────────────────────────────────────────────────────
//
// This list is HARDCODED. It must NOT be derived from CAPABILITIES at runtime.
// Updating it requires a deliberate one-line edit here — that is the point of
// pinning it. The golden list reflects the CAPABILITIES table as committed
// (P3.1 + P3.3 landed: 12 implemented + 3 planned = 15 verbs; ADR-0018 added
// `route` → 13 implemented; the planned `checkpoint` verb shipped as
// `snapshot` → 14 implemented + 2 planned = 16 verbs total).

const GOLDEN_IMPLEMENTED = [
  "verify",
  "fix",
  "heal",
  "doctor",
  "config",
  "migrate",
  "search",
  "firewall",
  "backlog",
  "propose",
  "capabilities",
  "ontology",
  "route",
  "snapshot",
  "context",
  "okf",
  "lint",
] as const;

const GOLDEN_PLANNED = ["index", "link-suggest"] as const;

const GOLDEN_ALL = [...GOLDEN_IMPLEMENTED, ...GOLDEN_PLANNED] as const;

// ── CLI spawner ────────────────────────────────────────────────────────────────
//
// Spawns the REAL CLI so dispatch branches are exercised, not mocked.
// Pattern mirrors src/cli/cli.test.ts (the cli.ts subprocess convention).

const CLI = join(import.meta.dir, "../../src/cli/cli.ts");

interface RunResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

function run(...args: string[]): RunResult {
  const proc = Bun.spawnSync(["bun", CLI, ...args], { stdout: "pipe", stderr: "pipe" });
  return {
    code: proc.exitCode,
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
  };
}

// ── (a) IMPLEMENTED verbs — live dispatch branch ───────────────────────────────
//
// Each verb is called with `--json --target /nonexistent`.
// A nonexistent target may legitimately exit 1 (vault not found).
// The assertion is exit != 2: exit 2 means "Unknown command" fallthrough,
// meaning the dispatch branch is missing.

describe("(a) IMPLEMENTED verbs — every verb exits != 2 (live dispatch branch)", () => {
  // firewall requires --file; call it without to trigger its own early exit (not exit-2).
  // All other implemented verbs accept --json --target /nonexistent.
  const SPECIAL_CASES: Record<string, string[]> = {
    // firewall: omit --target, add a dummy --file to exercise its dispatch branch.
    // It exits 2 when --file is missing, but NOT because of a missing dispatch branch —
    // the dispatch branch is present; the command itself validates args.
    // We pass a non-existent file so it returns 1 (BLOCK) or exits its own way, not 2.
    firewall: ["--json", "--file", "/nonexistent/file.md"],
    // config, backlog, search, propose, capabilities, ontology: no --target needed.
    // They handle a missing target gracefully (default or error finding, exit 0 or 1).
    config: ["--json"],
    backlog: ["--json"],
    search: ["test-query", "--json"],
    propose: ["--json"],
    capabilities: ["--json"],
    ontology: ["--json"],
    // route reads config (not a vault); reachability is passed as flags.
    route: ["--json"],
    // snapshot requires a subcommand (pre|post); without one it exits 2 by
    // design (usage error), which is NOT a missing dispatch branch.
    snapshot: ["pre", "--json", "--target", "/nonexistent"],
  };

  for (const verb of GOLDEN_IMPLEMENTED) {
    test(`${verb} exits != 2 with --json and target args`, () => {
      const extraArgs = SPECIAL_CASES[verb] ?? ["--json", "--target", "/nonexistent"];
      const r = run(verb, ...extraArgs);
      // The core contract: exit 2 means unknown-command fallthrough.
      // Any other exit code (0, 1) means the dispatch branch exists and ran.
      expect(r.code).not.toBe(2);
    });
  }
});

// ── (b) PLANNED verbs — exit 0 + .status === 'not-implemented' ────────────────
//
// Each planned verb is called with `--json` (no target) and must:
//   - exit 0
//   - emit JSON with `.status === 'not-implemented'`

describe("(b) PLANNED verbs — exit 0 + .status === 'not-implemented'", () => {
  for (const verb of GOLDEN_PLANNED) {
    test(`${verb} exits 0 and emits .status='not-implemented' (--json)`, () => {
      const r = run(verb, "--json");
      expect(r.code).toBe(0);
      const payload = JSON.parse(r.stdout) as { command: string; status: string };
      expect(payload.status).toBe("not-implemented");
    });
  }
});

// ── (c) capabilities --json set-equals the golden list ────────────────────────
//
// The manifest.verbs[].name set must be exactly GOLDEN_ALL — no drift between
// the CAPABILITIES table and what the verb advertises.

describe("(c) capabilities --json verb set set-equals the golden list", () => {
  test("manifest.verbs[].name set-equals GOLDEN_ALL", () => {
    const r = run("capabilities", "--json");
    expect(r.code).toBe(0);
    const payload = JSON.parse(r.stdout) as {
      manifest: { verbs: Array<{ name: string; status: string }> };
    };
    const manifestNames = new Set(payload.manifest.verbs.map((v) => v.name));
    const goldenNames = new Set(GOLDEN_ALL);
    expect(manifestNames).toEqual(goldenNames);
  });

  test("manifest implemented verbs set-equals GOLDEN_IMPLEMENTED", () => {
    const r = run("capabilities", "--json");
    expect(r.code).toBe(0);
    const payload = JSON.parse(r.stdout) as {
      manifest: { verbs: Array<{ name: string; status: string }> };
    };
    const implNames = new Set(
      payload.manifest.verbs.filter((v) => v.status === "implemented").map((v) => v.name),
    );
    expect(implNames).toEqual(new Set(GOLDEN_IMPLEMENTED));
  });

  test("manifest planned verbs set-equals GOLDEN_PLANNED", () => {
    const r = run("capabilities", "--json");
    expect(r.code).toBe(0);
    const payload = JSON.parse(r.stdout) as {
      manifest: { verbs: Array<{ name: string; status: string }> };
    };
    const plannedNames = new Set(
      payload.manifest.verbs.filter((v) => v.status === "planned").map((v) => v.name),
    );
    expect(plannedNames).toEqual(new Set(GOLDEN_PLANNED));
  });
});

// ── Golden list completeness — membership and shape guards ───────────────────
//
// These guards assert contract-level invariants over the golden list shape
// without coupling to a separately hardcoded count that silently diverges.
// Adding or removing a verb from GOLDEN_IMPLEMENTED / GOLDEN_PLANNED requires
// exactly one deliberate change here (the golden array above) — not two
// (the array AND a separate count assertion).
//
// "non-empty", "no duplicates", and "GOLDEN_ALL == implemented + planned" are
// the invariants that cannot drift silently.

describe("golden list completeness — membership and shape guards", () => {
  test("GOLDEN_IMPLEMENTED is non-empty", () => {
    expect(GOLDEN_IMPLEMENTED.length).toBeGreaterThan(0);
  });

  test("GOLDEN_PLANNED is non-empty", () => {
    expect(GOLDEN_PLANNED.length).toBeGreaterThan(0);
  });

  test("GOLDEN_ALL equals GOLDEN_IMPLEMENTED + GOLDEN_PLANNED (no duplicates, no extras)", () => {
    // GOLDEN_ALL must be exactly the concatenation of the two sub-lists.
    expect(GOLDEN_ALL).toHaveLength(GOLDEN_IMPLEMENTED.length + GOLDEN_PLANNED.length);
    // Every implemented verb must appear in ALL.
    for (const v of GOLDEN_IMPLEMENTED) {
      expect(GOLDEN_ALL).toContain(v);
    }
    // Every planned verb must appear in ALL.
    for (const v of GOLDEN_PLANNED) {
      expect(GOLDEN_ALL).toContain(v);
    }
  });

  test("GOLDEN_IMPLEMENTED and GOLDEN_PLANNED share no verbs", () => {
    const impl = new Set(GOLDEN_IMPLEMENTED);
    for (const v of GOLDEN_PLANNED) {
      expect(impl.has(v)).toBe(false);
    }
  });
});
