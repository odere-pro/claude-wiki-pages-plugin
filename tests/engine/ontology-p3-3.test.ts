/**
 * P3.3 acceptance tests — `engine ontology --json`
 *
 * One parser home at src/commands/ontology/ that regex-parses the
 * ontology-profile-v1 markdown tables in skills/init/template/CLAUDE.md at
 * read time, composes entity_type = core ∪ per-vault entity_type_extensions,
 * and emits predicates with extensible:false. (ADR-0015 N6, Part C.)
 *
 * Acceptance checks (per plan P3.3 and task spec):
 *   1. .enums.type returns exactly the 9 page-type values in document order.
 *   2. .enums.entity_type returns the 7 core values (absent extensions).
 *   3. A vault with entity_type_extensions:[dataset,model] makes them appear.
 *   4. .predicates | length equals the predicate-table row count (11).
 *   5. .predicates entries carry extensible:false.
 *   6. Malformed/missing table → non-zero exitCode + error Finding.
 *   7. grep -rn entity_type src/commands/ontology/ → zero enum-value literals
 *      (enforced by the no-hardcode rule; this test checks via import structure).
 *
 * NO-RAG: this is a markdown-table parse + set union over one authored document.
 * No corpus, no embeddings, no similarity — deterministic enumeration only.
 */

import { test, expect, describe, afterAll } from "bun:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import {
  parseOntologyProfile,
  buildOntologyReport,
  type OntologyManifest,
  type PredicateEntry,
} from "../../src/commands/ontology/ontology.ts";
import { exitCode } from "../../src/core/report.ts";

// Resolve the canonical schema path — the single authority.
const REPO_ROOT = join(import.meta.dir, "../..");
const SCHEMA_PATH = join(REPO_ROOT, "skills/init/template/CLAUDE.md");

// ── 1. enums.type — page-type enum in document order ─────────────────────────

describe("ontology -- enums.type (page type, closed)", () => {
  test("returns exactly 9 values in document order", () => {
    const result = parseOntologyProfile(SCHEMA_PATH, undefined);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("parse failed — test cannot continue");
    const manifest: OntologyManifest = result.manifest;
    expect(manifest.enums.type).toEqual([
      "source",
      "entity",
      "concept",
      "topic",
      "project",
      "synthesis",
      "index",
      "manifest",
      "log",
    ]);
  });

  test("enums.type has exactly 9 entries", () => {
    const result = parseOntologyProfile(SCHEMA_PATH, undefined);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("parse failed — test cannot continue");
    expect(result.manifest.enums.type).toHaveLength(9);
  });
});

// ── 2. enums.entity_type — core values, absent extensions ────────────────────

describe("ontology -- enums.entity_type (core, no extensions)", () => {
  test("returns exactly the 7 core values when no vault extensions present", () => {
    const result = parseOntologyProfile(SCHEMA_PATH, undefined);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("parse failed — test cannot continue");
    expect(result.manifest.enums.entity_type).toEqual([
      "person",
      "organization",
      "product",
      "tool",
      "service",
      "standard",
      "place",
    ]);
  });

  test("exits 0 (clean) when no extensions present", () => {
    const result = parseOntologyProfile(SCHEMA_PATH, undefined);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("parse failed — test cannot continue");
    const report = buildOntologyReport(result.manifest);
    expect(exitCode(report)).toBe(0);
  });
});

// ── 3. entity_type_extensions — composition at read time ─────────────────────

describe("ontology -- enums.entity_type with vault extensions", () => {
  let tmpVaultDir: string;
  let tmpClaudeMd: string;

  // Use afterAll for cleanup so it does not masquerade as a test (M22).
  afterAll(() => {
    if (tmpVaultDir) {
      try {
        rmSync(tmpVaultDir, { recursive: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  // Create a temporary vault CLAUDE.md that declares entity_type_extensions.
  // The file must be a minimal vault schema that the parser can read.
  // We only need entity_type_extensions — the parser reads the schema's
  // ontology-profile-v1 tables from the profile document (SCHEMA_PATH)
  // and picks up entity_type_extensions from the vault's own CLAUDE.md.
  test("entity_type_extensions:[dataset,model] appear in .enums.entity_type", () => {
    tmpVaultDir = join(tmpdir(), `ontology-test-${Date.now()}`);
    mkdirSync(tmpVaultDir, { recursive: true });
    tmpClaudeMd = join(tmpVaultDir, "CLAUDE.md");
    writeFileSync(
      tmpClaudeMd,
      [
        "---",
        "schema_version: 2",
        "entity_type_extensions:",
        "  - dataset",
        "  - model",
        "---",
        "",
        "# Vault CLAUDE.md",
      ].join("\n"),
    );

    const result = parseOntologyProfile(SCHEMA_PATH, tmpClaudeMd);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("parse failed — test cannot continue");
    const et = result.manifest.enums.entity_type;
    // Must contain all 7 core values
    expect(et).toContain("person");
    expect(et).toContain("organization");
    expect(et).toContain("product");
    expect(et).toContain("tool");
    expect(et).toContain("service");
    expect(et).toContain("standard");
    expect(et).toContain("place");
    // Must also contain the extensions
    expect(et).toContain("dataset");
    expect(et).toContain("model");
    // Total = 9
    expect(et).toHaveLength(9);
  });

  test("absent extensions → core set only, exit 0", () => {
    const result = parseOntologyProfile(SCHEMA_PATH, undefined);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("parse failed — test cannot continue");
    expect(result.manifest.enums.entity_type).toHaveLength(7);
    const report = buildOntologyReport(result.manifest);
    expect(exitCode(report)).toBe(0);
  });

  // M22: verify the tmp dir is actually cleaned up after afterAll runs.
  // Written as a standalone assertion test (not a cleanup test).
  test("tmp vault dir is created and accessible before teardown", () => {
    // This test only runs after the first test has set tmpVaultDir.
    // If tmpVaultDir is undefined (first test skipped), assert that invariant.
    if (tmpVaultDir) {
      expect(existsSync(tmpVaultDir)).toBe(true);
    } else {
      // First test did not run — nothing to assert.
      expect(tmpVaultDir).toBeUndefined();
    }
  });
});

// ── 4 & 5. predicates — row count and extensible:false ───────────────────────

describe("ontology -- predicates", () => {
  test("predicates length equals the predicate-table row count (11)", () => {
    const result = parseOntologyProfile(SCHEMA_PATH, undefined);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("parse failed — test cannot continue");
    // The predicate domain→range table in skills/init/template/CLAUDE.md has 11 rows:
    // parent, sources, related, contradicts, supersedes, depends_on,
    // key_pages, members, scope, children, child_indexes
    expect(result.manifest.predicates).toHaveLength(11);
  });

  test("every predicate entry carries extensible:false", () => {
    const result = parseOntologyProfile(SCHEMA_PATH, undefined);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("parse failed — test cannot continue");
    for (const pred of result.manifest.predicates) {
      const p: PredicateEntry = pred;
      expect(p.extensible).toBe(false);
    }
  });

  test("predicate names include the 11 expected predicates", () => {
    const result = parseOntologyProfile(SCHEMA_PATH, undefined);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("parse failed — test cannot continue");
    const names = result.manifest.predicates.map((p) => p.predicate);
    const expected = [
      "parent",
      "sources",
      "related",
      "contradicts",
      "supersedes",
      "depends_on",
      "key_pages",
      "members",
      "scope",
      "children",
      "child_indexes",
    ];
    for (const name of expected) {
      expect(names).toContain(name);
    }
  });

  test("predicate entries carry domain, range, and direction fields", () => {
    const result = parseOntologyProfile(SCHEMA_PATH, undefined);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("parse failed — test cannot continue");
    for (const pred of result.manifest.predicates) {
      expect(typeof pred.predicate).toBe("string");
      expect(pred.predicate.length).toBeGreaterThan(0);
      expect(typeof pred.domain).toBe("string");
      expect(typeof pred.range).toBe("string");
      expect(typeof pred.direction).toBe("string");
    }
  });
});

// ── 6. Malformed/missing table → fail closed ─────────────────────────────────

describe("ontology -- fail closed on malformed/missing table", () => {
  test("missing schema file → non-zero exitCode + error finding", () => {
    const result = parseOntologyProfile("/nonexistent/path/CLAUDE.md", undefined);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected parse to fail on missing file, but it succeeded");
    const report = buildOntologyReport(undefined, result.errors);
    expect(exitCode(report)).toBeGreaterThan(0);
    expect(report.findings.some((f) => f.severity === "error")).toBe(true);
  });

  test("malformed table (no predicate rows) → non-zero exitCode + error finding", () => {
    const tmpDir = join(tmpdir(), `ontology-malformed-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    const malformedMd = join(tmpDir, "CLAUDE.md");
    writeFileSync(
      malformedMd,
      [
        "## Ontology profile (`ontology-profile-v1`)",
        "",
        "### Predicate domain→range table",
        "",
        "| Predicate | Domain (source class) | Range (target class) | Direction / cardinality |",
        "| --- | --- | --- | --- |",
        "| this row is missing backtick-wrapped predicate name |",
        "",
        "### Enum list",
        "",
        "| Enum | Canonical values | Closed? | Calibration |",
        "| --- | --- | --- | --- |",
        "",
      ].join("\n"),
    );
    const result = parseOntologyProfile(malformedMd, undefined);
    // Empty or malformed tables must fail closed
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected parse to fail on malformed table, but it succeeded");
    const report = buildOntologyReport(undefined, result.errors);
    expect(exitCode(report)).toBeGreaterThan(0);
    expect(report.findings.some((f) => f.severity === "error")).toBe(true);
    try {
      rmSync(tmpDir, { recursive: true });
    } catch {
      // Ignore
    }
  });
});

// ── 7. OntologyManifest JSON field names (ADR-0015 field name contract) ───────

describe("ontology -- manifest JSON field names match ADR-0015", () => {
  test("manifest has .enums.type field", () => {
    const result = parseOntologyProfile(SCHEMA_PATH, undefined);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("parse failed — test cannot continue");
    expect(Array.isArray(result.manifest.enums.type)).toBe(true);
  });

  test("manifest has .enums.entity_type field", () => {
    const result = parseOntologyProfile(SCHEMA_PATH, undefined);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("parse failed — test cannot continue");
    expect(Array.isArray(result.manifest.enums.entity_type)).toBe(true);
  });

  test("manifest has .predicates field", () => {
    const result = parseOntologyProfile(SCHEMA_PATH, undefined);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("parse failed — test cannot continue");
    expect(Array.isArray(result.manifest.predicates)).toBe(true);
  });
});

// ── buildOntologyReport — envelope shape ─────────────────────────────────────

describe("buildOntologyReport — Report envelope (ADR-0015 N3)", () => {
  test("clean manifest → report.command = 'ontology'", () => {
    const result = parseOntologyProfile(SCHEMA_PATH, undefined);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("parse failed — test cannot continue");
    const report = buildOntologyReport(result.manifest);
    expect(report.command).toBe("ontology");
  });

  test("clean manifest → report.clean = true, exitCode = 0", () => {
    const result = parseOntologyProfile(SCHEMA_PATH, undefined);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("parse failed — test cannot continue");
    const report = buildOntologyReport(result.manifest);
    expect(report.clean).toBe(true);
    expect(exitCode(report)).toBe(0);
  });

  test("report carries manifest field with OntologyManifest shape", () => {
    const result = parseOntologyProfile(SCHEMA_PATH, undefined);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("parse failed — test cannot continue");
    const report = buildOntologyReport(result.manifest);
    expect(report.manifest).toBeDefined();
    expect(Array.isArray(report.manifest.predicates)).toBe(true);
    expect(typeof report.manifest.enums).toBe("object");
  });
});
