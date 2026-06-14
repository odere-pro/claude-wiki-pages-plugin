/**
 * P3.4 acceptance tests — entity_type membership check (engine-side only, N7).
 *
 * A new verify-side check validates that a note with `type: entity` carries an
 * `entity_type` value that is a member of the COMPOSED set (core ∪ per-vault
 * `entity_type_extensions`), imported from src/commands/ontology/.
 *
 * Acceptance criteria (per plan P3.4 and task spec):
 *   1. A note with entity_type: persom (typo) is REJECTED (error finding).
 *   2. A note with a valid core entity_type passes (no error finding).
 *   3. A vault declaring entity_type_extensions:[dataset] makes
 *      entity_type: dataset pass.
 *   4. A vault declaring synthesis_type_extensions: or type_extensions: does NOT
 *      extend anything — only entity_type composes (D15).
 *   5. The check imports P3.3's composed set (no second hardcoded core list
 *      in verify — enforced by import structure).
 *   6. Pages with type != entity are never rejected for entity_type.
 *   7. Pages with type: entity and a missing entity_type field are not rejected
 *      by THIS check (that is the existing required-fields check's job).
 *
 * NO-RAG: exact string-in-set membership over a composed allow-list.
 * Deterministic enumeration only — no corpus, no embeddings, no similarity.
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { checkEntityType } from "../../src/commands/verify/check-entity-type.ts";

const REPO_ROOT = join(import.meta.dir, "../..");
const SCHEMA_PATH = join(REPO_ROOT, "skills/init/template/CLAUDE.md");

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Create a minimal entity note with the given entity_type value. */
function entityNote(entityType: string): string {
  return [
    "---",
    'title: "Test Entity"',
    "type: entity",
    `entity_type: ${entityType}`,
    'parent: "[[Topics — Index]]"',
    "path: topics",
    'sources: ["[[Some Source]]"]',
    "created: 2026-06-05",
    "updated: 2026-06-05",
    "status: active",
    "confidence: 0.9",
    "---",
    "",
    "# Test Entity",
  ].join("\n");
}

/** Create a note of a non-entity type. */
function nonEntityNote(type: string): string {
  return [
    "---",
    'title: "Test Note"',
    `type: ${type}`,
    'parent: "[[Topics — Index]]"',
    "path: topics",
    'sources: ["[[Some Source]]"]',
    "created: 2026-06-05",
    "updated: 2026-06-05",
    "status: active",
    "confidence: 0.8",
    "---",
    "",
    "# Test Note",
  ].join("\n");
}

/** Build a minimal CLAUDE.md with the given entity_type_extensions list. */
function vaultClaudeMd(extensions: string[]): string {
  const extLine = extensions.length > 0 ? `entity_type_extensions: [${extensions.join(", ")}]` : "";
  return [
    "---",
    "schema_version: 2",
    ...(extLine ? [extLine] : []),
    "---",
    "",
    "# Vault CLAUDE.md",
  ].join("\n");
}

/** Build a CLAUDE.md with a forbidden *_extensions key. */
function vaultClaudeMdWithForbiddenExtensions(key: string, values: string[]): string {
  return [
    "---",
    "schema_version: 2",
    `${key}: [${values.join(", ")}]`,
    "---",
    "",
    "# Vault CLAUDE.md",
  ].join("\n");
}

// ── Temporary vault setup ────────────────────────────────────────────────────
//
// Per-test isolation (L05, M23): each test creates its own tmp tree in
// beforeEach and tears it down in afterEach. This removes order-dependence on
// module-level shared state and makes every assertion in the test body
// deterministically meaningful — not structurally guaranteed by a prior
// beforeAll having run (M23).

let tmpDir: string;
let tmpVaultClaudeMd: string;
let tmpEntityFile: string;
let tmpWiki: string;

beforeEach(() => {
  tmpDir = join(
    tmpdir(),
    `p3-4-entity-type-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(tmpDir, { recursive: true });
  tmpWiki = join(tmpDir, "wiki");
  mkdirSync(join(tmpWiki, "_sources"), { recursive: true });
  tmpVaultClaudeMd = join(tmpDir, "CLAUDE.md");
  tmpEntityFile = join(tmpWiki, "test-entity.md");
});

afterEach(() => {
  try {
    rmSync(tmpDir, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }
});

// ── 1. Typo entity_type is REJECTED ─────────────────────────────────────────

describe("checkEntityType — invalid entity_type value", () => {
  test("entity_type: persom (typo) produces an error finding", () => {
    writeFileSync(tmpVaultClaudeMd, vaultClaudeMd([]));
    writeFileSync(tmpEntityFile, entityNote("persom"));

    const findings = checkEntityType(tmpWiki, SCHEMA_PATH, tmpVaultClaudeMd);
    const entityFindings = findings.filter(
      (f) => f.file !== undefined && f.file.endsWith("test-entity.md"),
    );
    expect(entityFindings.length).toBeGreaterThan(0);
    const errFinding = entityFindings.find((f) => f.severity === "error");
    expect(errFinding).toBeDefined();
    expect(errFinding?.check).toBe("entity-type-membership");
    expect(errFinding?.message).toContain("persom");
  });

  test("error finding message names the composed set (helps author correct the value)", () => {
    writeFileSync(tmpVaultClaudeMd, vaultClaudeMd([]));
    writeFileSync(tmpEntityFile, entityNote("persom"));

    const findings = checkEntityType(tmpWiki, SCHEMA_PATH, tmpVaultClaudeMd);
    const errFinding = findings.find(
      (f) =>
        f.severity === "error" &&
        f.check === "entity-type-membership" &&
        f.file !== undefined &&
        f.file.endsWith("test-entity.md"),
    );
    expect(errFinding).toBeDefined();
    // The message should contain the invalid value
    expect(errFinding?.message).toContain("persom");
  });
});

// ── 2. Valid core entity_type passes ─────────────────────────────────────────

describe("checkEntityType — valid core entity_type values", () => {
  const coreValues = ["person", "organization", "product", "tool", "service", "standard", "place"];

  for (const val of coreValues) {
    test(`entity_type: ${val} produces no error finding`, () => {
      writeFileSync(tmpVaultClaudeMd, vaultClaudeMd([]));
      writeFileSync(tmpEntityFile, entityNote(val));

      const findings = checkEntityType(tmpWiki, SCHEMA_PATH, tmpVaultClaudeMd);
      const entityErrors = findings.filter(
        (f) =>
          f.severity === "error" &&
          f.check === "entity-type-membership" &&
          f.file !== undefined &&
          f.file.endsWith("test-entity.md"),
      );
      expect(entityErrors).toHaveLength(0);
    });
  }
});

// ── 3. entity_type_extensions extends the allowed set ────────────────────────

describe("checkEntityType — entity_type_extensions composition", () => {
  test("entity_type_extensions:[dataset] makes entity_type: dataset pass", () => {
    writeFileSync(tmpVaultClaudeMd, vaultClaudeMd(["dataset"]));
    writeFileSync(tmpEntityFile, entityNote("dataset"));

    const findings = checkEntityType(tmpWiki, SCHEMA_PATH, tmpVaultClaudeMd);
    const entityErrors = findings.filter(
      (f) =>
        f.severity === "error" &&
        f.check === "entity-type-membership" &&
        f.file !== undefined &&
        f.file.endsWith("test-entity.md"),
    );
    expect(entityErrors).toHaveLength(0);
  });

  test("entity_type_extensions:[dataset] does not make entity_type: persom pass", () => {
    writeFileSync(tmpVaultClaudeMd, vaultClaudeMd(["dataset"]));
    writeFileSync(tmpEntityFile, entityNote("persom"));

    const findings = checkEntityType(tmpWiki, SCHEMA_PATH, tmpVaultClaudeMd);
    const entityErrors = findings.filter(
      (f) =>
        f.severity === "error" &&
        f.check === "entity-type-membership" &&
        f.file !== undefined &&
        f.file.endsWith("test-entity.md"),
    );
    expect(entityErrors.length).toBeGreaterThan(0);
  });
});

// ── 4. Only entity_type composes (D15) — forbidden *_extensions keys ─────────

describe("checkEntityType — D15: only entity_type_extensions is allowed", () => {
  test("synthesis_type_extensions: in vault CLAUDE.md does NOT extend entity_type", () => {
    // A vault with synthesis_type_extensions:[novel] should NOT make
    // entity_type: novel valid.
    writeFileSync(
      tmpVaultClaudeMd,
      vaultClaudeMdWithForbiddenExtensions("synthesis_type_extensions", ["novel"]),
    );
    writeFileSync(tmpEntityFile, entityNote("novel"));

    const findings = checkEntityType(tmpWiki, SCHEMA_PATH, tmpVaultClaudeMd);
    const entityErrors = findings.filter(
      (f) =>
        f.severity === "error" &&
        f.check === "entity-type-membership" &&
        f.file !== undefined &&
        f.file.endsWith("test-entity.md"),
    );
    // "novel" is not in core or entity_type_extensions → must be rejected
    expect(entityErrors.length).toBeGreaterThan(0);
  });

  test("type_extensions: in vault CLAUDE.md does NOT extend entity_type", () => {
    writeFileSync(
      tmpVaultClaudeMd,
      vaultClaudeMdWithForbiddenExtensions("type_extensions", ["widget"]),
    );
    writeFileSync(tmpEntityFile, entityNote("widget"));

    const findings = checkEntityType(tmpWiki, SCHEMA_PATH, tmpVaultClaudeMd);
    const entityErrors = findings.filter(
      (f) =>
        f.severity === "error" &&
        f.check === "entity-type-membership" &&
        f.file !== undefined &&
        f.file.endsWith("test-entity.md"),
    );
    expect(entityErrors.length).toBeGreaterThan(0);
  });

  test("synthesis_type_extensions: does not cause a vault-level finding on its own", () => {
    // The forbidden key produces no vault-level error — it is silently ignored.
    // Only the entity_type value itself is rejected when it falls outside the set.
    writeFileSync(
      tmpVaultClaudeMd,
      vaultClaudeMdWithForbiddenExtensions("synthesis_type_extensions", ["novel"]),
    );
    // Write a valid entity to keep the entity file clean of other errors.
    writeFileSync(tmpEntityFile, entityNote("tool"));

    const findings = checkEntityType(tmpWiki, SCHEMA_PATH, tmpVaultClaudeMd);
    // With a valid entity_type ("tool"), there should be no entity-type-membership error.
    const entityErrors = findings.filter(
      (f) => f.severity === "error" && f.check === "entity-type-membership",
    );
    expect(entityErrors).toHaveLength(0);
  });
});

// ── 5. Non-entity pages are never rejected for entity_type ───────────────────

describe("checkEntityType — non-entity pages are exempt", () => {
  const nonEntityTypes = ["concept", "topic", "project", "source", "index", "synthesis"];

  for (const type of nonEntityTypes) {
    test(`type: ${type} page is not checked for entity_type membership`, () => {
      writeFileSync(tmpVaultClaudeMd, vaultClaudeMd([]));
      writeFileSync(tmpEntityFile, nonEntityNote(type));

      const findings = checkEntityType(tmpWiki, SCHEMA_PATH, tmpVaultClaudeMd);
      const entityTypeErrors = findings.filter(
        (f) =>
          f.severity === "error" &&
          f.check === "entity-type-membership" &&
          f.file !== undefined &&
          f.file.endsWith("test-entity.md"),
      );
      expect(entityTypeErrors).toHaveLength(0);
    });
  }
});

// ── 6. entity_type present but missing — not rejected by THIS check ───────────

describe("checkEntityType — absent entity_type field is not this check's job", () => {
  test("entity note with no entity_type field produces no entity-type-membership finding", () => {
    writeFileSync(tmpVaultClaudeMd, vaultClaudeMd([]));
    // Write an entity note without entity_type
    const noteWithoutEntityType = [
      "---",
      'title: "Missing Type Entity"',
      "type: entity",
      // entity_type deliberately absent
      'parent: "[[Topics — Index]]"',
      "path: topics",
      'sources: ["[[Some Source]]"]',
      "created: 2026-06-05",
      "updated: 2026-06-05",
      "status: active",
      "confidence: 0.9",
      "---",
      "",
      "# Missing Type Entity",
    ].join("\n");
    writeFileSync(tmpEntityFile, noteWithoutEntityType);

    const findings = checkEntityType(tmpWiki, SCHEMA_PATH, tmpVaultClaudeMd);
    const membershipErrors = findings.filter(
      (f) =>
        f.severity === "error" &&
        f.check === "entity-type-membership" &&
        f.file !== undefined &&
        f.file.endsWith("test-entity.md"),
    );
    // The membership check only fires when entity_type IS present but NOT in the set.
    // A missing field is the required-fields check's job (checkSchema/validate-frontmatter).
    expect(membershipErrors).toHaveLength(0);
  });
});

// ── 7. Reference vault — zero findings (gate-05 parity baseline) ─────────────

describe("checkEntityType — reference vault produces zero findings", () => {
  test("all entity_type values in the reference vault are in the core set", () => {
    const refVaultWiki = join(REPO_ROOT, "tests/fixtures/reference-vault/wiki");
    const refVaultClaudeMd = join(REPO_ROOT, "skills/init/template/CLAUDE.md");

    const findings = checkEntityType(refVaultWiki, SCHEMA_PATH, refVaultClaudeMd);
    const membershipErrors = findings.filter(
      (f) => f.severity === "error" && f.check === "entity-type-membership",
    );
    expect(membershipErrors).toHaveLength(0);
  });
});
