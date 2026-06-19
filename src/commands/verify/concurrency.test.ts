/**
 * Concurrency tests for verify — Phase 2, tmp/migration-plan.md.
 *
 * Verifies that:
 *   1. verify() is async (returns a Promise).
 *   2. Findings are deterministically sorted by (file, check, severity, message)
 *      regardless of check completion order.
 *   3. --concurrency 1 (serial) produces byte-identical output to the default
 *      (parallel) path on both text and JSON rendering.
 *   4. Counts and clean flag are unchanged vs the sync baseline.
 */

import { test, expect, describe } from "bun:test";
import { verify } from "./verify.ts";
import { renderText } from "../../core/report.ts";
import { makeVault, CLEAN_VAULT, DIRTY_VAULT } from "../../test-helpers/sandbox/vault.ts";

describe("verify — async and deterministic (Phase 2)", () => {
  test("verify() returns a Promise (is async)", () => {
    const sb = makeVault(CLEAN_VAULT);
    const result = verify({ target: sb.vault });
    // A Promise has a .then method; a sync return value does not.
    expect(typeof (result as unknown as Promise<unknown>).then).toBe("function");
    sb.cleanup();
  });

  test("findings are deterministically sorted (file, check, severity, message)", async () => {
    // Use a dirty vault so there are multiple findings to sort.
    const sb = makeVault(DIRTY_VAULT);
    const report1 = await verify({ target: sb.vault });
    const report2 = await verify({ target: sb.vault });
    // Two independent runs produce findings in the same order.
    expect(report1.findings).toEqual(report2.findings);
    // Confirm the sort invariant: each finding is <= the next on the sort key tuple.
    for (let i = 1; i < report1.findings.length; i++) {
      const a = report1.findings[i - 1]!;
      const b = report1.findings[i]!;
      const keyA = `${a.file ?? ""}\0${a.check}\0${a.severity}\0${a.message}`;
      const keyB = `${b.file ?? ""}\0${b.check}\0${b.severity}\0${b.message}`;
      expect(keyA <= keyB).toBe(true);
    }
    sb.cleanup();
  });

  test("serial (concurrency 1) produces same counts as default (parallel)", async () => {
    const sb = makeVault(DIRTY_VAULT);
    const parallel = await verify({ target: sb.vault });
    const serial = await verify({ target: sb.vault, concurrency: 1 });
    expect({ errors: serial.errors, warnings: serial.warnings }).toEqual({
      errors: parallel.errors,
      warnings: parallel.warnings,
    });
    sb.cleanup();
  });

  test("serial (concurrency 1) produces byte-identical text output as parallel", async () => {
    const sb = makeVault(DIRTY_VAULT);
    const parallel = await verify({ target: sb.vault });
    const serial = await verify({ target: sb.vault, concurrency: 1 });
    expect(renderText(serial)).toBe(renderText(parallel));
    sb.cleanup();
  });

  test("serial (concurrency 1) produces byte-identical JSON as parallel", async () => {
    const sb = makeVault(DIRTY_VAULT);
    const parallel = await verify({ target: sb.vault });
    const serial = await verify({ target: sb.vault, concurrency: 1 });
    expect(JSON.stringify(serial)).toBe(JSON.stringify(parallel));
    sb.cleanup();
  });

  test("clean vault: async verify still returns 0 errors / 0 warnings / clean", async () => {
    const sb = makeVault(CLEAN_VAULT);
    const report = await verify({ target: sb.vault });
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
    expect(report.clean).toBe(true);
    sb.cleanup();
  });

  test("dirty vault: async verify still returns 5 errors, 4 warnings (parity baseline)", async () => {
    const sb = makeVault(DIRTY_VAULT);
    const report = await verify({ target: sb.vault });
    expect(report.errors).toBe(5);
    expect(report.warnings).toBe(4);
    sb.cleanup();
  });
});
