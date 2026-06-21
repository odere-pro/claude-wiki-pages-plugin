/**
 * Unit tests for ontology() and buildOntologyReport()
 * (src/commands/ontology/ontology.ts — N09 untested-code-path fix).
 *
 * Tests are hermetic: all schema content is written to a tmp directory;
 * no real vault or network access is performed.
 */

import { test, expect, describe } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ontology, buildOntologyReport } from "./ontology.ts";
import type { Finding } from "../../core/report.ts";

// ── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * Minimal valid ontology-profile-v1 markdown with one predicate row and the
 * two required enum rows (type + entity_type).
 */
const VALID_SCHEMA = `
### Predicate domain→range table

| Predicate | Domain (source class) | Range (target class) | Direction / cardinality |
| --- | --- | --- | --- |
| \`parent\` | entity,concept | index | directed, single |

### Enum list

| Enum | Canonical values | Closed? | Calibration |
| --- | --- | --- | --- |
| page type (\`type\`) | \`source\`,\`entity\`,\`concept\` | closed (core) | — |
| \`entity_type\` (fixed core, calibratable) | \`person\`,\`organization\` | closed core + owner extension | — |
`;

/** Schema that has a predicate table but no Enum list section. */
const SCHEMA_MISSING_ENUM = `
### Predicate domain→range table

| Predicate | Domain | Range | Direction |
| --- | --- | --- | --- |
| \`parent\` | entity | index | directed, single |
`;

/** Schema with no predicate table at all. */
const SCHEMA_NO_PREDICATE_TABLE = `
### Enum list

| Enum | Canonical values | Closed? | Calibration |
| --- | --- | --- | --- |
| page type (\`type\`) | \`source\`,\`entity\` | closed | — |
| \`entity_type\` (fixed core) | \`person\` | closed | — |
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

interface TmpDir {
  readonly dir: string;
  cleanup(): void;
}

function tmpDir(): TmpDir {
  const dir = mkdtempSync(join(tmpdir(), "cwp-ontology-test-"));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

function writeSchema(dir: string, name: string, content: string): string {
  const path = join(dir, name);
  writeFileSync(path, content);
  return path;
}

// ── buildOntologyReport() ─────────────────────────────────────────────────────

describe("buildOntologyReport", () => {
  test("returns clean report when manifest is provided and no errors", () => {
    const manifest = Object.freeze({
      enums: Object.freeze({
        type: Object.freeze(["source", "entity"]),
        entity_type: Object.freeze(["person"]),
      }),
      predicates: Object.freeze([]),
    });

    const report = buildOntologyReport(manifest);

    expect(report.clean).toBe(true);
    expect(report.errors).toBe(0);
    expect(report.findings).toHaveLength(0);
    expect(report.manifest).toBe(manifest);
    expect(report.command).toBe("ontology");
  });

  test("returns non-clean stub report when manifest is undefined", () => {
    const report = buildOntologyReport(undefined);

    expect(report.clean).toBe(false);
    expect(report.errors).toBe(1);
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.severity).toBe("error");
    expect(report.findings[0]?.check).toBe("ontology");
    expect(report.findings[0]?.message).toContain("parse failed");
    // stub manifest has empty arrays
    expect(report.manifest.enums.type).toHaveLength(0);
    expect(report.manifest.enums.entity_type).toHaveLength(0);
    expect(report.manifest.predicates).toHaveLength(0);
  });

  test("returns non-clean report when explicit errors are supplied", () => {
    const errors: readonly Finding[] = [
      Object.freeze({
        severity: "error" as const,
        check: "ontology",
        message: "explicit test error",
      }),
    ];

    const report = buildOntologyReport(undefined, errors);

    expect(report.clean).toBe(false);
    expect(report.errors).toBe(1);
    expect(report.findings[0]?.message).toBe("explicit test error");
  });

  test("errors array takes precedence over a supplied manifest (fail-closed)", () => {
    const manifest = Object.freeze({
      enums: Object.freeze({ type: Object.freeze(["source"]), entity_type: Object.freeze([]) }),
      predicates: Object.freeze([]),
    });
    const errors: readonly Finding[] = [
      Object.freeze({ severity: "error" as const, check: "ontology", message: "parse error" }),
    ];

    const report = buildOntologyReport(manifest, errors);

    // When errors are present the report must be non-clean regardless of manifest.
    expect(report.clean).toBe(false);
    expect(report.errors).toBe(1);
  });

  test("report is immutable (Object.freeze contract)", () => {
    const report = buildOntologyReport(undefined);
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.manifest)).toBe(true);
  });
});

// ── ontology() — success path ─────────────────────────────────────────────────

describe("ontology — success path", () => {
  test("parses a valid schema and returns clean report with manifest", () => {
    const tmp = tmpDir();
    const schemaPath = writeSchema(tmp.dir, "CLAUDE.md", VALID_SCHEMA);

    const report = ontology({ schemaPath });

    expect(report.clean).toBe(true);
    expect(report.errors).toBe(0);
    expect(report.findings).toHaveLength(0);
    expect(report.manifest.enums.type).toContain("source");
    expect(report.manifest.enums.type).toContain("entity");
    expect(report.manifest.enums.entity_type).toContain("person");
    expect(report.manifest.predicates.length).toBeGreaterThan(0);
    expect(report.manifest.predicates[0]?.predicate).toBe("parent");

    tmp.cleanup();
  });

  test("predicates carry extensible:false on every entry", () => {
    const tmp = tmpDir();
    const schemaPath = writeSchema(tmp.dir, "CLAUDE.md", VALID_SCHEMA);

    const report = ontology({ schemaPath });

    expect(report.clean).toBe(true);
    for (const pred of report.manifest.predicates) {
      expect(pred.extensible).toBe(false);
    }

    tmp.cleanup();
  });
});

// ── ontology() — error / fail-closed paths ────────────────────────────────────

describe("ontology — fail-closed error paths", () => {
  test("missing schema file: non-clean report with error finding", () => {
    const report = ontology({ schemaPath: "/no/such/file/CLAUDE.md" });

    expect(report.clean).toBe(false);
    expect(report.errors).toBe(1);
    expect(report.findings[0]?.severity).toBe("error");
    expect(report.findings[0]?.check).toBe("ontology");
    expect(report.findings[0]?.message).toContain("not found");
  });

  test("schema with no predicate table: non-clean report", () => {
    const tmp = tmpDir();
    const schemaPath = writeSchema(tmp.dir, "CLAUDE.md", SCHEMA_NO_PREDICATE_TABLE);

    const report = ontology({ schemaPath });

    expect(report.clean).toBe(false);
    expect(report.errors).toBe(1);
    expect(report.findings[0]?.message).toMatch(/predicate domain.*range table not found/i);

    tmp.cleanup();
  });

  test("schema with missing enum list section: non-clean report", () => {
    const tmp = tmpDir();
    const schemaPath = writeSchema(tmp.dir, "CLAUDE.md", SCHEMA_MISSING_ENUM);

    const report = ontology({ schemaPath });

    expect(report.clean).toBe(false);
    expect(report.errors).toBe(1);
    expect(report.findings[0]?.message).toMatch(/enum list/i);

    tmp.cleanup();
  });

  test("empty schema file: non-clean report (no predicate table)", () => {
    const tmp = tmpDir();
    const schemaPath = writeSchema(tmp.dir, "CLAUDE.md", "");

    const report = ontology({ schemaPath });

    expect(report.clean).toBe(false);
    expect(report.errors).toBe(1);

    tmp.cleanup();
  });
});

// ── ontology() — vaultClaudeMd extension composition ─────────────────────────

describe("ontology — entity_type_extensions composition", () => {
  test("extensions in vault CLAUDE.md are merged into entity_type", () => {
    const tmp = tmpDir();
    const schemaPath = writeSchema(tmp.dir, "CLAUDE.md", VALID_SCHEMA);
    const vaultClaudeMd = writeSchema(
      tmp.dir,
      "vault-CLAUDE.md",
      "---\nentity_type_extensions: [dataset, model]\n---\n",
    );

    const report = ontology({ schemaPath, vaultClaudeMd });

    expect(report.clean).toBe(true);
    expect(report.manifest.enums.entity_type).toContain("person");
    expect(report.manifest.enums.entity_type).toContain("dataset");
    expect(report.manifest.enums.entity_type).toContain("model");

    tmp.cleanup();
  });

  test("absent vaultClaudeMd: entity_type contains only core values", () => {
    const tmp = tmpDir();
    const schemaPath = writeSchema(tmp.dir, "CLAUDE.md", VALID_SCHEMA);

    const report = ontology({ schemaPath });

    expect(report.clean).toBe(true);
    expect(report.manifest.enums.entity_type).toEqual(["person", "organization"]);

    tmp.cleanup();
  });

  test("non-existent vaultClaudeMd path: graceful degradation to core entity_type", () => {
    const tmp = tmpDir();
    const schemaPath = writeSchema(tmp.dir, "CLAUDE.md", VALID_SCHEMA);

    const report = ontology({
      schemaPath,
      vaultClaudeMd: "/no/such/vault-CLAUDE.md",
    });

    // Extensions silently absent; report stays clean.
    expect(report.clean).toBe(true);
    expect(report.manifest.enums.entity_type).toEqual(["person", "organization"]);

    tmp.cleanup();
  });

  test("duplicate extensions (already in core) are deduplicated", () => {
    const tmp = tmpDir();
    const schemaPath = writeSchema(tmp.dir, "CLAUDE.md", VALID_SCHEMA);
    // "person" is already in the core enum.
    const vaultClaudeMd = writeSchema(
      tmp.dir,
      "vault-CLAUDE.md",
      "---\nentity_type_extensions: [person, dataset]\n---\n",
    );

    const report = ontology({ schemaPath, vaultClaudeMd });

    expect(report.clean).toBe(true);
    // "person" must not be duplicated.
    const personCount = report.manifest.enums.entity_type.filter((v) => v === "person").length;
    expect(personCount).toBe(1);
    expect(report.manifest.enums.entity_type).toContain("dataset");

    tmp.cleanup();
  });
});
