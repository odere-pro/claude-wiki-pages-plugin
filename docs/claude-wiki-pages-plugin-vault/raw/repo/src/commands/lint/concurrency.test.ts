/**
 * Concurrency tests for lint — Phase 2, tmp/migration-plan.md.
 *
 * Verifies that:
 *   1. lint() is async (returns a Promise).
 *   2. Findings are deterministically sorted by (file, check, severity, message)
 *      regardless of check completion order.
 *   3. --concurrency 1 (serial) produces byte-identical output to the default
 *      (parallel) path on both text and JSON rendering.
 *   4. Counts and clean flag are unchanged vs the existing sync baseline.
 */

import { test, expect, describe } from "bun:test";
import { lint } from "./lint.ts";
import { renderText } from "../../core/report.ts";
import { makeVault, CLEAN_VAULT } from "../../test-helpers/sandbox/vault.ts";

/** A vault with structural issues to produce multiple findings. */
const DIRTY_LINT_VAULT: Record<string, string> = {
  "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
  "wiki/index.md": "---\ntitle: index\n---\n",
  "wiki/log.md": "---\ntitle: log\n---\n",
  // A page with a [text](file.md) markdown link that should be a wikilink.
  "wiki/topics/alpha.md":
    "---\ntitle: Alpha\ntype: concept\n---\n# Alpha\nSee [beta](beta.md) for details.\n",
  // A page with raw HTML.
  "wiki/topics/beta.md": "---\ntitle: Beta\ntype: concept\n---\n# Beta\n<div>raw html here</div>\n",
};

describe("lint — async and deterministic (Phase 2)", () => {
  test("lint() returns a Promise (is async)", () => {
    const sb = makeVault(CLEAN_VAULT);
    const result = lint({ target: sb.vault });
    expect(typeof (result as unknown as Promise<unknown>).then).toBe("function");
    sb.cleanup();
  });

  test("findings are deterministically sorted (file, check, severity, message)", async () => {
    const sb = makeVault(DIRTY_LINT_VAULT);
    const report1 = await lint({ target: sb.vault });
    const report2 = await lint({ target: sb.vault });
    expect(report1.findings).toEqual(report2.findings);
    // Confirm sort invariant.
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
    const sb = makeVault(DIRTY_LINT_VAULT);
    const parallel = await lint({ target: sb.vault });
    const serial = await lint({ target: sb.vault, concurrency: 1 });
    expect({ errors: serial.errors, warnings: serial.warnings }).toEqual({
      errors: parallel.errors,
      warnings: parallel.warnings,
    });
    sb.cleanup();
  });

  test("serial (concurrency 1) produces byte-identical text output as parallel", async () => {
    const sb = makeVault(DIRTY_LINT_VAULT);
    const parallel = await lint({ target: sb.vault });
    const serial = await lint({ target: sb.vault, concurrency: 1 });
    expect(renderText(serial)).toBe(renderText(parallel));
    sb.cleanup();
  });

  test("serial (concurrency 1) produces byte-identical JSON as parallel", async () => {
    const sb = makeVault(DIRTY_LINT_VAULT);
    const parallel = await lint({ target: sb.vault });
    const serial = await lint({ target: sb.vault, concurrency: 1 });
    expect(JSON.stringify(serial)).toBe(JSON.stringify(parallel));
    sb.cleanup();
  });

  test("clean vault: async lint still returns 0 errors / 0 warnings / clean", async () => {
    const sb = makeVault(CLEAN_VAULT);
    const report = await lint({ target: sb.vault });
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
    expect(report.clean).toBe(true);
    sb.cleanup();
  });

  test("lint --check structural async: findings are sorted", async () => {
    const sb = makeVault(DIRTY_LINT_VAULT);
    const report = await lint({ target: sb.vault, check: "structural" });
    for (let i = 1; i < report.findings.length; i++) {
      const a = report.findings[i - 1]!;
      const b = report.findings[i]!;
      const keyA = `${a.file ?? ""}\0${a.check}\0${a.severity}\0${a.message}`;
      const keyB = `${b.file ?? ""}\0${b.check}\0${b.severity}\0${b.message}`;
      expect(keyA <= keyB).toBe(true);
    }
    sb.cleanup();
  });
});
