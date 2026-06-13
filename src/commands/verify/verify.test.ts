import { test, expect, describe } from "bun:test";
import { verify } from "./verify.ts";
import { exitCode } from "../../core/report.ts";
import {
  makeVault,
  CLEAN_VAULT,
  DIRTY_VAULT,
  DIRTY_VAULT_LEGACY_INDEX,
} from "../../test-helpers/sandbox/vault.ts";

// ---------------------------------------------------------------------------
// I3 provenance-completeness test helpers
// ---------------------------------------------------------------------------

/** A minimal valid vault extended with one source-requiring page that has no sources. */
function missingSourcesVault(pageType: string): Record<string, string> {
  return {
    "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
    "wiki/index.md": "---\ntitle: index\n---\n- [[Topics — Index]]\n- [[Unsourced Page]]\n",
    "wiki/log.md": "---\ntitle: log\n---\n",
    "wiki/topics/topics.md":
      '---\ntitle: Topics — Index\ntype: index\naliases: ["topics"]\nchildren: ["[[Unsourced Page]]"]\n---\n',
    "wiki/topics/unsourced.md": `---\ntitle: Unsourced Page\ntype: ${pageType}\nsources: []\n---\nbody\n`,
  };
}

/** A page with derived: true and confidence ≥ 0.8 — should warn. */
function derivedHighConfidenceVault(confidence: number): Record<string, string> {
  return {
    "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n",
    "wiki/index.md": "---\ntitle: index\n---\n- [[Topics — Index]]\n- [[Derived Page]]\n",
    "wiki/log.md": "---\ntitle: log\n---\n",
    "wiki/topics/topics.md":
      '---\ntitle: Topics — Index\ntype: index\naliases: ["topics"]\nchildren: ["[[Derived Page]]"]\n---\n',
    "wiki/topics/derived.md": `---\ntitle: Derived Page\ntype: concept\nsources: ["[[Source One]]"]\nderived: true\nconfidence: ${confidence}\n---\nbody\n`,
  };
}

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
    "wiki/topics/topics.md":
      '---\ntitle: Topics — Index\ntype: index\naliases: ["topics"]\nchildren: ["[[Real Page]]"]\n---\n',
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

  // ──────────────────────────────────────────────────────────────────────────
  // Schema v3: folder notes vs. legacy _index.md
  // ──────────────────────────────────────────────────────────────────────────

  test("v3: legacy _index.md is accepted identically to a folder note (counts match)", () => {
    const sbNote = makeVault(DIRTY_VAULT);
    const sbLegacy = makeVault(DIRTY_VAULT_LEGACY_INDEX);
    const note = verify({ target: sbNote.vault });
    const legacy = verify({ target: sbLegacy.vault });

    expect({ errors: legacy.errors, warnings: legacy.warnings }).toEqual({
      errors: note.errors,
      warnings: note.warnings,
    });
    // No schema_version declared → no legacy-filename WARN at any age.
    expect(legacy.findings.filter((f) => f.check === "legacy-index-filename")).toHaveLength(0);
    sbNote.cleanup();
    sbLegacy.cleanup();
  });

  test("v3: a folder-note vault at schema_version 3 verifies clean", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 3\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n- [[Topics — Index]]\n- [[Real Page]]\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/topics/topics.md":
        '---\ntitle: Topics — Index\ntype: index\nchildren: ["[[Real Page]]"]\n---\n',
      "wiki/topics/real-page.md": "---\ntitle: Real Page\n---\nbody\n",
    });
    const report = verify({ target: sb.vault });
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
    sb.cleanup();
  });

  test("orphan-sources: the source manifest (type: manifest) is exempt, never flagged", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 3\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n- [[Topics — Index]]\n- [[Real Page]]\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      // A manifest in _sources/ that no wiki page cites — must NOT be an orphan.
      "wiki/_sources/manifest.md":
        "---\ntitle: Source Manifest\ntype: manifest\n---\n# Source Manifest\n",
      "wiki/topics/topics.md":
        '---\ntitle: Topics — Index\ntype: index\nchildren: ["[[Real Page]]"]\n---\n',
      "wiki/topics/real-page.md": "---\ntitle: Real Page\n---\nbody\n",
    });
    const report = verify({ target: sb.vault });
    expect(report.findings.filter((f) => f.check === "orphan-sources")).toHaveLength(0);
    expect(report.warnings).toBe(0);
    sb.cleanup();
  });

  test("v3: a remaining _index.md at schema_version 3 gets the legacy-index-filename WARN", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 3\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n- [[Topics — Index]]\n- [[Real Page]]\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/topics/_index.md":
        '---\ntitle: Topics — Index\ntype: index\nchildren: ["[[Real Page]]"]\n---\n',
      "wiki/topics/real-page.md": "---\ntitle: Real Page\n---\nbody\n",
    });
    const report = verify({ target: sb.vault });

    expect(report.errors).toBe(0); // warning severity, not error
    const legacy = report.findings.filter((f) => f.check === "legacy-index-filename");
    expect(legacy).toHaveLength(1);
    expect(legacy[0]?.severity).toBe("warn");
    expect(legacy[0]?.message).toContain("engine.sh migrate --write");
    sb.cleanup();
  });

  test("v3: a v2 vault with _index.md emits NO legacy-index-filename diagnostic (back-compat)", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n- [[Topics — Index]]\n- [[Real Page]]\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/topics/_index.md":
        '---\ntitle: Topics — Index\ntype: index\nchildren: ["[[Real Page]]"]\n---\n',
      "wiki/topics/real-page.md": "---\ntitle: Real Page\n---\nbody\n",
    });
    const report = verify({ target: sb.vault });

    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
    expect(report.findings.filter((f) => f.check === "legacy-index-filename")).toHaveLength(0);
    sb.cleanup();
  });

  test("v3: a same-stem page WITHOUT type: index is a regular page, not a folder note", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 3\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n- [[Topics]]\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      // Stem matches the folder, but no `type: index` → NOT an index file.
      "wiki/topics/topics.md": "---\ntitle: Topics\n---\nbody\n",
    });
    const report = verify({ target: sb.vault });

    const topicFolder = report.findings.filter((f) => f.check === "topic-folder");
    expect(topicFolder).toHaveLength(1); // folder still lacks an index file
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

  // ──────────────────────────────────────────────────────────────────────────
  // I3: provenance-completeness checks
  // ──────────────────────────────────────────────────────────────────────────

  test("I3: entity with no sources is an ERROR", () => {
    const sb = makeVault(missingSourcesVault("entity"));
    const report = verify({ target: sb.vault });

    const findings = report.findings.filter((f) => f.check === "provenance-completeness");
    expect(findings.length).toBe(1);
    expect(findings[0]?.severity).toBe("error");
    expect(findings[0]?.message).toContain("Unsourced Page");
    expect(report.errors).toBeGreaterThan(0);
    sb.cleanup();
  });

  test("I3: concept with no sources is an ERROR", () => {
    const sb = makeVault(missingSourcesVault("concept"));
    const report = verify({ target: sb.vault });

    const findings = report.findings.filter((f) => f.check === "provenance-completeness");
    expect(findings.length).toBe(1);
    expect(findings[0]?.severity).toBe("error");
    sb.cleanup();
  });

  test("I3: topic with no sources is an ERROR", () => {
    const sb = makeVault(missingSourcesVault("topic"));
    const report = verify({ target: sb.vault });

    const findings = report.findings.filter((f) => f.check === "provenance-completeness");
    expect(findings.length).toBe(1);
    expect(findings[0]?.severity).toBe("error");
    sb.cleanup();
  });

  test("I3: project with no sources is an ERROR", () => {
    const sb = makeVault(missingSourcesVault("project"));
    const report = verify({ target: sb.vault });

    const findings = report.findings.filter((f) => f.check === "provenance-completeness");
    expect(findings.length).toBe(1);
    expect(findings[0]?.severity).toBe("error");
    sb.cleanup();
  });

  test("I3: synthesis with no sources is an ERROR", () => {
    const sb = makeVault(missingSourcesVault("synthesis"));
    const report = verify({ target: sb.vault });

    const findings = report.findings.filter((f) => f.check === "provenance-completeness");
    expect(findings.length).toBe(1);
    expect(findings[0]?.severity).toBe("error");
    sb.cleanup();
  });

  test("I3: source/index/log/manifest types are exempt from provenance-completeness", () => {
    // 'source' pages are the citations themselves — they do not require sources entries.
    // 'index', 'log', 'manifest' are bookkeeping pages and are also exempt.
    for (const pageType of ["source", "index", "log", "manifest"]) {
      const sb = makeVault(missingSourcesVault(pageType));
      const report = verify({ target: sb.vault });
      const findings = report.findings.filter((f) => f.check === "provenance-completeness");
      expect(findings.length).toBe(0);
      sb.cleanup();
    }
  });

  test("I3: malformed source entry (plain string) counts as present — no double-flag", () => {
    // DIRTY_VAULT has real-page.md with sources: ["plain-not-a-link"] — 1 entry.
    // The sources-FORMAT check (CHECK 2) already fires for the malformed entry.
    // The provenance-PRESENCE check must NOT also fire, because there IS 1 entry present.
    const sb = makeVault(DIRTY_VAULT);
    const report = verify({ target: sb.vault });

    // No provenance-completeness finding for real-page.md (it has 1 source entry, albeit malformed).
    const findings = report.findings.filter((f) => f.check === "provenance-completeness");
    // DIRTY_VAULT has no source-requiring page with 0 entries: real-page.md has 1 (malformed).
    expect(findings.length).toBe(0);
    sb.cleanup();
  });

  test("I3: derived:true with confidence >= 0.8 is a WARN", () => {
    const sb = makeVault(derivedHighConfidenceVault(0.8));
    const report = verify({ target: sb.vault });

    const findings = report.findings.filter((f) => f.check === "provenance-consistency");
    expect(findings.length).toBe(1);
    expect(findings[0]?.severity).toBe("warn");
    expect(findings[0]?.message).toContain("Derived Page");
    expect(findings[0]?.message).toContain("confidence");
    sb.cleanup();
  });

  test("I3: derived:true with confidence < 0.8 is clean", () => {
    const sb = makeVault(derivedHighConfidenceVault(0.7));
    const report = verify({ target: sb.vault });

    const findings = report.findings.filter((f) => f.check === "provenance-consistency");
    expect(findings.length).toBe(0);
    sb.cleanup();
  });

  test("I3: derived:false with confidence >= 0.8 is clean", () => {
    const files = derivedHighConfidenceVault(0.9);
    // Override the page to have derived: false
    files["wiki/topics/derived.md"] =
      '---\ntitle: Derived Page\ntype: concept\nsources: ["[[Source One]]"]\nderived: false\nconfidence: 0.9\n---\nbody\n';
    const sb = makeVault(files);
    const report = verify({ target: sb.vault });

    const findings = report.findings.filter((f) => f.check === "provenance-consistency");
    expect(findings.length).toBe(0);
    sb.cleanup();
  });

  test("I3: clean vault stays clean after adding provenance checks", () => {
    const sb = makeVault(CLEAN_VAULT);
    const report = verify({ target: sb.vault });
    expect(report.errors).toBe(0);
    expect(report.clean).toBe(true);
    sb.cleanup();
  });

  test("I3: dirty vault parity — provenance-completeness does NOT add new errors", () => {
    // DIRTY_VAULT has real-page.md with 1 source entry (malformed plain-string).
    // The presence check must not increase the error count beyond the baseline.
    const sb = makeVault(DIRTY_VAULT);
    const report = verify({ target: sb.vault });
    // Baseline: 5 errors, 5 warnings (verified by the existing dirty-vault test).
    expect(report.errors).toBe(5);
    expect(report.warnings).toBe(5);
    sb.cleanup();
  });
});
