import { test, expect, describe } from "bun:test";
import { verify } from "./verify.ts";
import { exitCode } from "../../core/report.ts";
import { makeVault, CLEAN_VAULT, DIRTY_VAULT } from "../../test-helpers/sandbox/vault.ts";

describe("verify", () => {
  test("clean vault has no findings and exit 0", () => {
    const sb = makeVault(CLEAN_VAULT);
    const report = verify({ target: sb.vault });
    expect(report.errors).toBe(0);
    expect(report.clean).toBe(true);
    expect(exitCode(report)).toBe(0);
    sb.cleanup();
  });

  test("reports a missing vault directory", () => {
    const report = verify({ target: "/no/such/vault-xyz" });
    expect(report.errors).toBe(1);
    expect(report.findings[0]?.check).toBe("vault");
  });

  test("dirty vault surfaces every check (5 errors, 5 warnings)", () => {
    const sb = makeVault(DIRTY_VAULT);
    const report = verify({ target: sb.vault });
    expect(report.errors).toBe(5);
    expect(report.warnings).toBe(5);
    expect(exitCode(report)).toBe(1);

    const checks = report.findings.map((f) => f.check);
    expect(checks).toContain("schema");
    expect(checks).toContain("index-duplicates");
    expect(checks).toContain("sources-format");
    expect(checks).toContain("moc");
    expect(checks).toContain("orphan-sources");
    expect(checks).toContain("topic-folder");
    sb.cleanup();
  });
});
