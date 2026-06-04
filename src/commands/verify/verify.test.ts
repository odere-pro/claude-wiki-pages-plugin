import { test, expect, describe } from "bun:test";
import { verify } from "./verify.ts";
import { exitCode } from "../../core/report.ts";
import { makeVault, CLEAN_VAULT, DIRTY_VAULT } from "../../test-helpers/sandbox/vault.ts";

/**
 * Build a single-source / single-page vault wired so the page cites the source,
 * the folder index lists the page, and index.md catalogs both. Only the two
 * `updated` dates vary, isolating the S4 (cited-source staleness) check.
 */
function stalenessVault(pageUpdated: string, sourceUpdated: string): Record<string, string> {
  return {
    "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
    "wiki/index.md":
      "---\ntitle: index\n---\n- [[Source One]]\n- [[Topics — Index]]\n- [[Real Page]]\n",
    "wiki/log.md": "---\ntitle: log\n---\n",
    "wiki/_sources/source-one.md": `---\ntitle: Source One\naliases: ["Source One"]\nsources: []\nupdated: ${sourceUpdated}\n---\nbody\n`,
    "wiki/topics/_index.md":
      '---\ntitle: Topics — Index\naliases: ["topics"]\nchildren: ["[[Real Page]]"]\n---\n',
    "wiki/topics/real-page.md": `---\ntitle: Real Page\nsources: ["[[Source One]]"]\nupdated: ${pageUpdated}\n---\nbody\n`,
  };
}

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

  test("S4: warns when a wiki page predates its cited source", () => {
    const sb = makeVault(stalenessVault("2026-04-18", "2026-05-01"));
    const report = verify({ target: sb.vault });

    // WARN-severity, counted: no errors, exactly the staleness warning.
    expect(report.errors).toBe(0);
    const stale = report.findings.filter((f) => f.check === "stale-source");
    expect(stale.length).toBe(1);
    expect(stale[0]?.severity).toBe("warn");
    expect(stale[0]?.message).toContain("stale-source");
    expect(stale[0]?.message).toContain("Real Page");
    sb.cleanup();
  });

  test("S4: clean when the wiki page is newer than its cited source", () => {
    const sb = makeVault(stalenessVault("2026-06-01", "2026-05-01"));
    const report = verify({ target: sb.vault });

    expect(report.findings.filter((f) => f.check === "stale-source").length).toBe(0);
    sb.cleanup();
  });

  test("S4: equal dates are not stale (strictly-newer rule)", () => {
    const sb = makeVault(stalenessVault("2026-05-01", "2026-05-01"));
    const report = verify({ target: sb.vault });

    expect(report.findings.filter((f) => f.check === "stale-source").length).toBe(0);
    sb.cleanup();
  });

  test("S4: a dangling cited source is labelled, not treated as fresh", () => {
    const files = stalenessVault("2026-04-18", "2026-05-01");
    // Repoint the page at a source that does not exist in _sources/.
    files["wiki/topics/real-page.md"] =
      '---\ntitle: Real Page\nsources: ["[[Nonexistent Source]]"]\nupdated: 2026-04-18\n---\nbody\n';
    // Drop the now-uncited Source One from index.md to keep the dangling case isolated.
    files["wiki/index.md"] = "---\ntitle: index\n---\n- [[Topics — Index]]\n- [[Real Page]]\n";
    const sb = makeVault(files);
    const report = verify({ target: sb.vault });

    const stale = report.findings.filter((f) => f.check === "stale-source");
    expect(stale.length).toBe(1);
    expect(stale[0]?.severity).toBe("warn");
    expect(stale[0]?.message).toContain("dangling-source");
    expect(stale[0]?.message).toContain("Nonexistent Source");
    sb.cleanup();
  });
});
