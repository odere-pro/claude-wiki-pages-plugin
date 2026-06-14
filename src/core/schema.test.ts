/**
 * M19: Colocated unit suite for src/core/schema.ts.
 *
 * Tests cover:
 *   - checkSchema: missing CLAUDE.md → info finding
 *   - checkSchema: CLAUDE.md without schema_version → error finding
 *   - checkSchema: unsupported version → error finding
 *   - checkSchema: supported versions (1, 2, 3) → no findings
 *   - declaredSchemaVersion: parses plain and backtick-wrapped forms
 *   - declaredSchemaVersion: returns null when absent or file missing
 */

import { test, expect, describe, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkSchema,
  declaredSchemaVersion,
  SUPPORTED_SCHEMA_VERSIONS,
  CURRENT_SCHEMA_VERSION,
} from "./schema.ts";

let tmpDir: string;

function setup(): string {
  tmpDir = mkdtempSync(join(tmpdir(), "cwp-schema-"));
  return tmpDir;
}

function teardown(): void {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
}

describe("SUPPORTED_SCHEMA_VERSIONS and CURRENT_SCHEMA_VERSION", () => {
  test("CURRENT_SCHEMA_VERSION is in SUPPORTED_SCHEMA_VERSIONS", () => {
    expect(SUPPORTED_SCHEMA_VERSIONS).toContain(CURRENT_SCHEMA_VERSION);
  });

  test("SUPPORTED_SCHEMA_VERSIONS includes schema_version 1 and 2 (migration safety)", () => {
    expect(SUPPORTED_SCHEMA_VERSIONS).toContain(1);
    expect(SUPPORTED_SCHEMA_VERSIONS).toContain(2);
  });
});

describe("declaredSchemaVersion", () => {
  afterEach(teardown);

  test("returns null when file does not exist", () => {
    expect(declaredSchemaVersion("/non/existent/CLAUDE.md")).toBeNull();
  });

  test("returns null when file has no schema_version declaration", () => {
    const vault = setup();
    const claude = join(vault, "CLAUDE.md");
    writeFileSync(claude, "# Just a markdown file\n\nNo version here.\n");
    expect(declaredSchemaVersion(claude)).toBeNull();
  });

  test("parses plain schema_version: 1", () => {
    const vault = setup();
    const claude = join(vault, "CLAUDE.md");
    writeFileSync(claude, "schema_version: 1\n");
    expect(declaredSchemaVersion(claude)).toBe(1);
  });

  test("parses plain schema_version: 2", () => {
    const vault = setup();
    const claude = join(vault, "CLAUDE.md");
    writeFileSync(claude, "Some content\nschema_version: 2\nMore content\n");
    expect(declaredSchemaVersion(claude)).toBe(2);
  });

  test("parses backtick-wrapped `schema_version`: `3`", () => {
    const vault = setup();
    const claude = join(vault, "CLAUDE.md");
    writeFileSync(claude, "Set `schema_version`: `3` near the top.\n");
    expect(declaredSchemaVersion(claude)).toBe(3);
  });

  test("parses inline in frontmatter block", () => {
    const vault = setup();
    const claude = join(vault, "CLAUDE.md");
    writeFileSync(claude, "---\nschema_version: 3\ntitle: Test Vault\n---\n# Body\n");
    expect(declaredSchemaVersion(claude)).toBe(3);
  });
});

describe("checkSchema", () => {
  afterEach(teardown);

  test("returns info finding when CLAUDE.md does not exist", () => {
    const vault = setup();
    // Do NOT create CLAUDE.md
    const findings = checkSchema(vault);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("info");
    expect(findings[0]!.check).toBe("schema");
    expect(findings[0]!.message).toContain("not found");
  });

  test("returns error finding when CLAUDE.md has no schema_version", () => {
    const vault = setup();
    writeFileSync(join(vault, "CLAUDE.md"), "# No version\n");
    const findings = checkSchema(vault);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("error");
    expect(findings[0]!.check).toBe("schema");
    expect(findings[0]!.message).toContain("no schema_version");
  });

  test("returns error finding when schema_version is unsupported", () => {
    const vault = setup();
    writeFileSync(join(vault, "CLAUDE.md"), "schema_version: 99\n");
    const findings = checkSchema(vault);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("error");
    expect(findings[0]!.check).toBe("schema");
    expect(findings[0]!.message).toContain("unsupported");
    expect(findings[0]!.message).toContain("99");
  });

  test("returns no findings for schema_version: 1 (migration-safe)", () => {
    const vault = setup();
    writeFileSync(join(vault, "CLAUDE.md"), "schema_version: 1\n");
    expect(checkSchema(vault)).toHaveLength(0);
  });

  test("returns no findings for schema_version: 2 (migration-safe)", () => {
    const vault = setup();
    writeFileSync(join(vault, "CLAUDE.md"), "schema_version: 2\n");
    expect(checkSchema(vault)).toHaveLength(0);
  });

  test("returns no findings for schema_version: 3 (current)", () => {
    const vault = setup();
    const claude = join(vault, "CLAUDE.md");
    writeFileSync(claude, `schema_version: ${CURRENT_SCHEMA_VERSION}\n`);
    expect(checkSchema(vault)).toHaveLength(0);
  });

  test("returns error when schema_version is 0 (below floor)", () => {
    const vault = setup();
    writeFileSync(join(vault, "CLAUDE.md"), "schema_version: 0\n");
    const findings = checkSchema(vault);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("error");
  });

  test("finding includes the vault CLAUDE.md path as file field", () => {
    const vault = setup();
    writeFileSync(join(vault, "CLAUDE.md"), "schema_version: 99\n");
    const findings = checkSchema(vault);
    expect(findings[0]!.file).toContain("CLAUDE.md");
  });

  test("works when vault path has trailing slash", () => {
    const vault = setup();
    mkdirSync(vault, { recursive: true });
    writeFileSync(join(vault, "CLAUDE.md"), "schema_version: 2\n");
    // Join with trailing slash variant
    expect(checkSchema(vault + "/")).toHaveLength(0);
  });
});
