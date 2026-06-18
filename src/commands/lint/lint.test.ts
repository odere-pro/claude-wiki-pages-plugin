/**
 * TDD: lint scaffold — written FIRST, before the implementation exists.
 *
 * These tests assert the skeleton contract:
 *   1. `lint()` returns an empty Report (no findings, clean, errors === 0).
 *   2. The CLI dispatches `lint` correctly (no "Unknown command" error).
 *   3. `--concurrency <n>` is parsed and accepted without error.
 *   4. `--json` emits a parseable Report with command === "lint".
 *
 * No behavior (no checks) is asserted beyond the empty-Report contract.
 * Behavior tests will be added when lint checks land.
 */

import { test, expect, describe } from "bun:test";
import { join } from "node:path";
import { makeVault, CLEAN_VAULT } from "../../test-helpers/sandbox/vault.ts";
import { lint } from "./lint.ts";
import { exitCode } from "../../core/report.ts";

const CLI = join(import.meta.dir, "../../cli/cli.ts");

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

// ---------------------------------------------------------------------------
// Unit: lint() returns an empty Report
// ---------------------------------------------------------------------------

describe("lint() — unit", () => {
  test("returns an empty Report (no findings, clean, errors === 0)", () => {
    const sb = makeVault(CLEAN_VAULT);
    const report = lint({ target: sb.vault });
    expect(report.command).toBe("lint");
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
    expect(report.findings).toHaveLength(0);
    expect(report.clean).toBe(true);
    expect(exitCode(report)).toBe(0);
    sb.cleanup();
  });

  test("vault path is preserved in the report", () => {
    const sb = makeVault(CLEAN_VAULT);
    const report = lint({ target: sb.vault });
    expect(report.vault).toBe(sb.vault);
    sb.cleanup();
  });

  test("accepts concurrency option without error", () => {
    const sb = makeVault(CLEAN_VAULT);
    // concurrency is parsed but currently unused — must not throw
    const report = lint({ target: sb.vault, concurrency: 4 });
    expect(report.errors).toBe(0);
    sb.cleanup();
  });

  test("works without an explicit target (falls back to resolveVault)", () => {
    // When called with no target the four-tier resolution runs; it may or may not
    // find a vault. Either way the call must not throw.
    expect(() => lint({})).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// CLI dispatch: lint command is routed correctly
// ---------------------------------------------------------------------------

describe("lint — CLI dispatch", () => {
  test("lint --json returns a parseable Report with command === 'lint'", () => {
    const sb = makeVault(CLEAN_VAULT);
    const r = run("lint", "--target", sb.vault, "--json");
    expect(r.code).toBe(0);
    const report = JSON.parse(r.stdout);
    expect(report.command).toBe("lint");
    expect(report.clean).toBe(true);
    expect(report.findings).toHaveLength(0);
    sb.cleanup();
  });

  test("lint exits 0 and does not write to stderr for a clean vault", () => {
    const sb = makeVault(CLEAN_VAULT);
    const r = run("lint", "--target", sb.vault);
    expect(r.code).toBe(0);
    expect(r.stderr).toBe("");
    sb.cleanup();
  });

  test("lint is listed in the capabilities verb list", () => {
    const r = run("capabilities", "--json");
    expect(r.code).toBe(0);
    const manifest = JSON.parse(r.stdout);
    const names: string[] = manifest.manifest.verbs.map((v: { name: string }) => v.name);
    expect(names).toContain("lint");
  });

  test("lint appears in usage output", () => {
    const r = run("--help");
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("lint");
  });

  test("lint --concurrency 2 --json is accepted without error", () => {
    const sb = makeVault(CLEAN_VAULT);
    const r = run("lint", "--target", sb.vault, "--concurrency", "2", "--json");
    expect(r.code).toBe(0);
    const report = JSON.parse(r.stdout);
    expect(report.command).toBe("lint");
    sb.cleanup();
  });

  test("lint is NOT in the 'Unknown command' path", () => {
    const sb = makeVault(CLEAN_VAULT);
    const r = run("lint", "--target", sb.vault);
    expect(r.stderr).not.toContain("Unknown command");
    sb.cleanup();
  });
});
