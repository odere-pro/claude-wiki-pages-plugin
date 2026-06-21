/**
 * TDD: core/ontology-profile.ts — unit suite for parseOntologyProfile and
 * parseContextContract.
 *
 * Coverage targets (N05 finding — untested-code-path):
 *
 * parseOntologyProfile():
 *  1.  Schema file not found → ParseFail with "not found" message.
 *  2.  Predicate table absent → ParseFail with predicate-table message.
 *  3.  Predicate table present but has no data rows → ParseFail.
 *  4.  Enum list absent → ParseFail with enum-table message.
 *  5.  Enum list present but no `type` row → ParseFail.
 *  6.  Enum list present but no `entity_type` row → ParseFail.
 *  7.  Happy path (both tables complete) → ParseOk with correct manifest.
 *  8.  Predicate entry has correct shape (predicate, domain, range, direction,
 *      extensible:false).
 *  9.  vaultClaudeMd = undefined → core entity_type only; no extension panic.
 * 10.  vaultClaudeMd pointing to a non-existent file → core entity_type only.
 * 11.  vaultClaudeMd with flow-sequence entity_type_extensions → composed.
 * 12.  vaultClaudeMd with block-sequence entity_type_extensions → composed.
 * 13.  Extensions already in core set → not duplicated.
 * 14.  manifest arrays are frozen (immutable).
 *
 * parseContextContract():
 * 15.  No `## Context contract` heading → returns null.
 * 16.  Heading present but table has no rows → returns null.
 * 17.  Happy path: inputs / reference / outputs rows → correct categorisation.
 * 18.  Globs are split by comma and trimmed.
 * 19.  Stops reading at the next heading (`#`).
 * 20.  Header row and separator row are skipped; only data rows are parsed.
 * 21.  Role matching is case-insensitive (startsWith "inputs", "reference",
 *      "outputs").
 * 22.  Rows with roles that do not match inputs/reference/outputs still appear
 *      in `rows` but not in the three categorised arrays.
 */

import { test, expect, describe } from "bun:test";
import { join } from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { parseOntologyProfile, parseContextContract } from "./ontology-profile.ts";

// ── Fixtures ────────────────────────────────────────────────────────────────

/** Minimal, valid ontology-profile-v1 markdown content. */
const VALID_SCHEMA_CONTENT = `---
schema_version: 3
---
# LLM Wiki — Schema

## ontology-profile-v1

### Predicate domain→range table

| Predicate | Domain (source class) | Range (target class) | Direction / cardinality |
| --- | --- | --- | --- |
| \`sources\` | \`entity\`,\`concept\`,\`topic\` | \`source\` | directed, 1..N |
| \`parent\` | any non-root page | \`index\` | directed, single |

### Enum list

| Enum | Canonical values | Closed? | Calibration |
| --- | --- | --- | --- |
| page type (\`type\`) | \`source\`,\`entity\`,\`concept\`,\`index\` | closed (core) | not vault-extensible |
| \`entity_type\` (fixed core, calibratable) | \`person\`,\`organization\`,\`tool\` | closed core + owner extension | owner adds via \`entity_type_extensions:\` |
`;

// ── Sandbox helpers ──────────────────────────────────────────────────────────

interface Sandbox {
  dir: string;
  cleanup: () => void;
}

function makeSandbox(): Sandbox {
  const dir = mkdtempSync(join(tmpdir(), "cwp-ontology-profile-test-"));
  return {
    dir,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

function writeFile(dir: string, rel: string, content: string): string {
  const full = join(dir, rel);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content, "utf-8");
  return full;
}

// ── parseOntologyProfile — failure branches ──────────────────────────────────

describe("parseOntologyProfile() — file-not-found / read failures", () => {
  test("1. schema file does not exist → ParseFail with 'not found' message", () => {
    const s = makeSandbox();
    const result = parseOntologyProfile(join(s.dir, "nonexistent.md"), undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
      const msg = result.errors[0]?.message ?? "";
      expect(msg).toContain("not found");
    }
    s.cleanup();
  });
});

describe("parseOntologyProfile() — missing sections", () => {
  test("2. predicate table absent → ParseFail with predicate-table message", () => {
    const s = makeSandbox();
    const content = `---\nschema_version: 3\n---\n# Schema\n\nNo predicate table here.\n`;
    const path = writeFile(s.dir, "CLAUDE.md", content);
    const result = parseOntologyProfile(path, undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const msg = result.errors[0]?.message ?? "";
      expect(msg).toContain("predicate");
    }
    s.cleanup();
  });

  test("3. predicate table section present but no data rows → ParseFail", () => {
    const s = makeSandbox();
    // Has header row and separator but no data rows
    const content = `---\nschema_version: 3\n---\n# Schema\n\n### Predicate domain→range table\n\n| Predicate | Domain (source class) | Range (target class) | Direction / cardinality |\n| --- | --- | --- | --- |\n\n### Enum list\n\n| Enum | Canonical values | Closed? | Calibration |\n| --- | --- | --- | --- |\n`;
    const path = writeFile(s.dir, "CLAUDE.md", content);
    const result = parseOntologyProfile(path, undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const msg = result.errors[0]?.message ?? "";
      expect(msg).toContain("predicate");
    }
    s.cleanup();
  });

  test("4. enum list absent → ParseFail with enum-table message", () => {
    const s = makeSandbox();
    const content = `---\nschema_version: 3\n---\n# Schema\n\n### Predicate domain→range table\n\n| Predicate | Domain | Range | Direction |\n| --- | --- | --- | --- |\n| \`sources\` | \`entity\` | \`source\` | directed |\n\nNo enum list section.\n`;
    const path = writeFile(s.dir, "CLAUDE.md", content);
    const result = parseOntologyProfile(path, undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const msg = result.errors[0]?.message ?? "";
      expect(msg).toContain("enum");
    }
    s.cleanup();
  });

  test("5. enum list present but has no 'type' row → ParseFail", () => {
    const s = makeSandbox();
    // Only entity_type row, no page-type row
    const content = `---\nschema_version: 3\n---\n# Schema\n\n### Predicate domain→range table\n\n| Predicate | Domain | Range | Direction |\n| --- | --- | --- | --- |\n| \`sources\` | \`entity\` | \`source\` | directed |\n\n### Enum list\n\n| Enum | Canonical values | Closed? | Calibration |\n| --- | --- | --- | --- |\n| \`entity_type\` | \`person\`,\`organization\` | closed core | owner extends |\n`;
    const path = writeFile(s.dir, "CLAUDE.md", content);
    const result = parseOntologyProfile(path, undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const msg = result.errors[0]?.message ?? "";
      expect(msg).toContain("type");
    }
    s.cleanup();
  });

  test("6. enum list present but has no 'entity_type' row → ParseFail", () => {
    const s = makeSandbox();
    // Only type row, no entity_type row
    const content = `---\nschema_version: 3\n---\n# Schema\n\n### Predicate domain→range table\n\n| Predicate | Domain | Range | Direction |\n| --- | --- | --- | --- |\n| \`sources\` | \`entity\` | \`source\` | directed |\n\n### Enum list\n\n| Enum | Canonical values | Closed? | Calibration |\n| --- | --- | --- | --- |\n| page type (\`type\`) | \`source\`,\`entity\` | closed (core) | not vault-extensible |\n`;
    const path = writeFile(s.dir, "CLAUDE.md", content);
    const result = parseOntologyProfile(path, undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const msg = result.errors[0]?.message ?? "";
      expect(msg).toContain("entity_type");
    }
    s.cleanup();
  });
});

// ── parseOntologyProfile — happy path ───────────────────────────────────────

describe("parseOntologyProfile() — happy path", () => {
  test("7. valid schema → ParseOk with correct enum lists and predicate entries", () => {
    const s = makeSandbox();
    const path = writeFile(s.dir, "CLAUDE.md", VALID_SCHEMA_CONTENT);
    const result = parseOntologyProfile(path, undefined);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const { manifest } = result;
      // type enum
      expect(manifest.enums.type).toContain("source");
      expect(manifest.enums.type).toContain("entity");
      expect(manifest.enums.type).toContain("index");
      // entity_type enum
      expect(manifest.enums.entity_type).toContain("person");
      expect(manifest.enums.entity_type).toContain("organization");
      expect(manifest.enums.entity_type).toContain("tool");
      // predicates
      expect(manifest.predicates.length).toBe(2);
    }
    s.cleanup();
  });

  test("8. predicate entry shape: predicate/domain/range/direction correct, extensible is false", () => {
    const s = makeSandbox();
    const path = writeFile(s.dir, "CLAUDE.md", VALID_SCHEMA_CONTENT);
    const result = parseOntologyProfile(path, undefined);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const first = result.manifest.predicates[0];
      expect(first).toBeDefined();
      if (first) {
        expect(first.predicate).toBe("sources");
        // domain cell is the raw cell string (not split into backtick tokens)
        expect(first.domain).toBeTruthy();
        expect(first.range).toBeTruthy();
        expect(first.direction).toBeTruthy();
        expect(first.extensible).toBe(false);
      }
    }
    s.cleanup();
  });

  test("9. vaultClaudeMd = undefined → core entity_type only, no panic", () => {
    const s = makeSandbox();
    const path = writeFile(s.dir, "CLAUDE.md", VALID_SCHEMA_CONTENT);
    const result = parseOntologyProfile(path, undefined);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Must contain the core values
      expect(result.manifest.enums.entity_type).toContain("person");
      // Must not have any extra values beyond the schema
      expect(result.manifest.enums.entity_type).toHaveLength(3); // person, organization, tool
    }
    s.cleanup();
  });
});

// ── parseOntologyProfile — entity_type_extensions composition ────────────────

describe("parseOntologyProfile() — entity_type_extensions composition", () => {
  test("10. vaultClaudeMd does not exist → core entity_type only (no panic)", () => {
    const s = makeSandbox();
    const schemaPath = writeFile(s.dir, "CLAUDE.md", VALID_SCHEMA_CONTENT);
    const missingVaultMd = join(s.dir, "vault", "CLAUDE.md");
    const result = parseOntologyProfile(schemaPath, missingVaultMd);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.manifest.enums.entity_type).toHaveLength(3); // core only
    }
    s.cleanup();
  });

  test("11. vaultClaudeMd with flow-sequence extensions → composed entity_type", () => {
    const s = makeSandbox();
    const schemaPath = writeFile(s.dir, "CLAUDE.md", VALID_SCHEMA_CONTENT);
    const vaultMd = writeFile(
      s.dir,
      "vault/CLAUDE.md",
      `---\nschema_version: 3\nentity_type_extensions: [dataset, model]\n---\n# Vault\n`,
    );
    const result = parseOntologyProfile(schemaPath, vaultMd);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const et = result.manifest.enums.entity_type;
      // Core values preserved
      expect(et).toContain("person");
      // Extensions appended
      expect(et).toContain("dataset");
      expect(et).toContain("model");
      // Total = 3 core + 2 new
      expect(et).toHaveLength(5);
    }
    s.cleanup();
  });

  test("12. vaultClaudeMd with block-sequence extensions → composed entity_type", () => {
    const s = makeSandbox();
    const schemaPath = writeFile(s.dir, "CLAUDE.md", VALID_SCHEMA_CONTENT);
    const vaultMd = writeFile(
      s.dir,
      "vault/CLAUDE.md",
      `---\nschema_version: 3\nentity_type_extensions:\n  - dataset\n  - model\n---\n# Vault\n`,
    );
    const result = parseOntologyProfile(schemaPath, vaultMd);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const et = result.manifest.enums.entity_type;
      expect(et).toContain("dataset");
      expect(et).toContain("model");
      expect(et).toHaveLength(5);
    }
    s.cleanup();
  });

  test("13. extension already present in core → not duplicated", () => {
    const s = makeSandbox();
    const schemaPath = writeFile(s.dir, "CLAUDE.md", VALID_SCHEMA_CONTENT);
    // "person" is already in core; adding it as an extension should not duplicate
    const vaultMd = writeFile(
      s.dir,
      "vault/CLAUDE.md",
      `---\nschema_version: 3\nentity_type_extensions: [person, dataset]\n---\n# Vault\n`,
    );
    const result = parseOntologyProfile(schemaPath, vaultMd);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const et = result.manifest.enums.entity_type;
      // Only one "person" entry
      const personCount = et.filter((v) => v === "person").length;
      expect(personCount).toBe(1);
      // "dataset" is new, so total = 3 core + 1 new
      expect(et).toHaveLength(4);
    }
    s.cleanup();
  });

  test("14. manifest arrays are frozen (immutable — no runtime mutation)", () => {
    const s = makeSandbox();
    const path = writeFile(s.dir, "CLAUDE.md", VALID_SCHEMA_CONTENT);
    const result = parseOntologyProfile(path, undefined);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.isFrozen(result.manifest)).toBe(true);
      expect(Object.isFrozen(result.manifest.enums)).toBe(true);
      expect(Object.isFrozen(result.manifest.enums.type)).toBe(true);
      expect(Object.isFrozen(result.manifest.enums.entity_type)).toBe(true);
      expect(Object.isFrozen(result.manifest.predicates)).toBe(true);
    }
    s.cleanup();
  });
});

// ── parseOntologyProfile — invalid-membership negative branches (N06) ────────
//
// These tests exercise the fail-closed branches that existing tests do NOT
// reach:
//
//  N06-A  Predicate table section is present with data rows, but every row
//         lacks a backtick-wrapped predicate token → extractBacktickToken
//         returns null for all → entries remains [] → ParseFail.
//
//  N06-B  Enum list section is present and has a "page type (`type`)" row, but
//         the values cell contains no backtick-wrapped tokens →
//         extractBacktickValues returns [] → enumMap.set is skipped →
//         typeEnum is undefined → ParseFail.
//
//  N06-C  Enum list section is present with a valid `type` row, but the
//         `entity_type` row's values cell contains no backtick-wrapped tokens
//         → entity_type enum is never set → ParseFail.
//
//  N06-D  Enum list section is present but has only the header and separator
//         row — no data rows at all → enumMap stays empty (size=0) → returns
//         null → ParseFail (independent from the predicate-table failure path).

describe("parseOntologyProfile() — invalid-membership negative branches (N06)", () => {
  test("N06-A: predicate rows present but all lack backtick predicate token → ParseFail", () => {
    // Row cells exist but the first cell contains no backtick-wrapped token,
    // so extractBacktickToken returns null and no entry is pushed → entries=[].
    const s = makeSandbox();
    const content = [
      "---",
      "schema_version: 3",
      "---",
      "# Schema",
      "",
      "### Predicate domain→range table",
      "",
      "| Predicate | Domain | Range | Direction |",
      "| --- | --- | --- | --- |",
      "| plain-text-no-backtick | entity | source | directed |",
      "| another-plain | concept | source | directed |",
      "",
      "### Enum list",
      "",
      "| Enum | Canonical values | Closed? | Calibration |",
      "| --- | --- | --- | --- |",
      "| page type (`type`) | `source`,`entity` | closed (core) | not vault-extensible |",
      "| `entity_type` | `person`,`organization` | closed core | owner extends |",
    ].join("\n");
    const path = writeFile(s.dir, "CLAUDE.md", content);
    const result = parseOntologyProfile(path, undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const msg = result.errors[0]?.message ?? "";
      expect(msg).toContain("predicate");
    }
    s.cleanup();
  });

  test("N06-B: type row present but values cell has no backtick tokens → ParseFail (type enum empty)", () => {
    // The enum list row for page type exists but the values column contains
    // no backtick-wrapped tokens (e.g. plain text) → extractBacktickValues
    // returns [] → the "type" key is never added to enumMap → typeEnum is
    // undefined → ParseFail at step 4.
    const s = makeSandbox();
    const content = [
      "---",
      "schema_version: 3",
      "---",
      "# Schema",
      "",
      "### Predicate domain→range table",
      "",
      "| Predicate | Domain | Range | Direction |",
      "| --- | --- | --- | --- |",
      "| `sources` | `entity` | `source` | directed |",
      "",
      "### Enum list",
      "",
      "| Enum | Canonical values | Closed? | Calibration |",
      "| --- | --- | --- | --- |",
      "| page type (`type`) | source entity index | closed (core) | not vault-extensible |",
      "| `entity_type` | `person`,`organization` | closed core | owner extends |",
    ].join("\n");
    const path = writeFile(s.dir, "CLAUDE.md", content);
    const result = parseOntologyProfile(path, undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const msg = result.errors[0]?.message ?? "";
      // Should fail at the type-enum check (step 4), not the predicate check.
      expect(msg).toContain("type");
    }
    s.cleanup();
  });

  test("N06-C: entity_type row values cell has no backtick tokens → ParseFail (entity_type enum empty)", () => {
    // The `type` row is valid, but the entity_type row's values cell contains
    // no backtick-wrapped tokens → entity_type never added to enumMap →
    // entityTypeCore is undefined → ParseFail at step 5.
    const s = makeSandbox();
    const content = [
      "---",
      "schema_version: 3",
      "---",
      "# Schema",
      "",
      "### Predicate domain→range table",
      "",
      "| Predicate | Domain | Range | Direction |",
      "| --- | --- | --- | --- |",
      "| `sources` | `entity` | `source` | directed |",
      "",
      "### Enum list",
      "",
      "| Enum | Canonical values | Closed? | Calibration |",
      "| --- | --- | --- | --- |",
      "| page type (`type`) | `source`,`entity`,`index` | closed (core) | not vault-extensible |",
      "| `entity_type` | person organization tool | closed core | owner extends |",
    ].join("\n");
    const path = writeFile(s.dir, "CLAUDE.md", content);
    const result = parseOntologyProfile(path, undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const msg = result.errors[0]?.message ?? "";
      // Should fail at the entity_type check (step 5), not the type check.
      expect(msg).toContain("entity_type");
    }
    s.cleanup();
  });

  test("N06-D: enum list section present but only header+separator rows (no data) → ParseFail (enum map null)", () => {
    // parseEnumTable finds the header row but no data rows → enumMap stays
    // empty → returns null → ParseFail at step 3 (enum-table message).
    // This is independent of the predicate-table failure path.
    const s = makeSandbox();
    const content = [
      "---",
      "schema_version: 3",
      "---",
      "# Schema",
      "",
      "### Predicate domain→range table",
      "",
      "| Predicate | Domain | Range | Direction |",
      "| --- | --- | --- | --- |",
      "| `sources` | `entity` | `source` | directed |",
      "",
      "### Enum list",
      "",
      "| Enum | Canonical values | Closed? | Calibration |",
      "| --- | --- | --- | --- |",
    ].join("\n");
    const path = writeFile(s.dir, "CLAUDE.md", content);
    const result = parseOntologyProfile(path, undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const msg = result.errors[0]?.message ?? "";
      expect(msg).toContain("enum");
    }
    s.cleanup();
  });
});

// ── parseContextContract — failure / absent cases ────────────────────────────

describe("parseContextContract() — absent or empty section", () => {
  test("15. no '## Context contract' heading → returns null", () => {
    const md = `# My Skill\n\nSome content.\n\n## Another Section\n\nStuff.\n`;
    expect(parseContextContract(md)).toBeNull();
  });

  test("16. heading present but table has no rows → returns null", () => {
    // Only a heading and separator — zero data rows
    const md = `# My Skill\n\n## Context contract\n\n| role | globs |\n| --- | --- |\n\n## Next Section\n`;
    expect(parseContextContract(md)).toBeNull();
  });
});

// ── parseContextContract — happy path ────────────────────────────────────────

describe("parseContextContract() — happy path", () => {
  test("17. inputs / reference / outputs rows → correct categorisation", () => {
    const md = `# Skill\n\n## Context contract\n\n| role | globs |\n| --- | --- |\n| inputs (L4) | wiki/**/*.md, raw/**/*.md |\n| reference (L3) | skills/**/*.md |\n| outputs | wiki/log.md |\n\n## Next\n`;
    const contract = parseContextContract(md);
    expect(contract).not.toBeNull();
    if (contract) {
      expect(contract.rows).toHaveLength(3);
      expect(contract.inputs).toContain("wiki/**/*.md");
      expect(contract.inputs).toContain("raw/**/*.md");
      expect(contract.reference).toContain("skills/**/*.md");
      expect(contract.outputs).toContain("wiki/log.md");
    }
  });

  test("18. globs are split by comma and whitespace-trimmed", () => {
    const md = `## Context contract\n\n| role | globs |\n| --- | --- |\n| inputs (L4) | a/b.md , c/d.md,e/f.md |\n`;
    const contract = parseContextContract(md);
    expect(contract).not.toBeNull();
    if (contract) {
      expect(contract.inputs).toEqual(["a/b.md", "c/d.md", "e/f.md"]);
    }
  });

  test("19. stops reading at the next heading (next ## or ###)", () => {
    const md = `## Context contract\n\n| role | globs |\n| --- | --- |\n| inputs (L4) | wiki/**/*.md |\n\n## Should not be reached\n\n| role | globs |\n| --- | --- |\n| outputs | should-not-appear.md |\n`;
    const contract = parseContextContract(md);
    expect(contract).not.toBeNull();
    if (contract) {
      // Only the first section's row should be present
      expect(contract.rows).toHaveLength(1);
      expect(contract.outputs).toHaveLength(0);
    }
  });

  test("20. header row and separator row are skipped; only data rows count", () => {
    // The header row contains "role" and "globs" — it must be skipped
    // The separator row (| --- | --- |) must be skipped
    const md = `## Context contract\n\n| role | globs |\n| --- | --- |\n| outputs | wiki/log.md |\n`;
    const contract = parseContextContract(md);
    expect(contract).not.toBeNull();
    if (contract) {
      // Exactly one data row parsed (header + separator skipped)
      expect(contract.rows).toHaveLength(1);
      expect(contract.rows[0]?.role).toBe("outputs");
    }
  });

  test("21. role matching is case-insensitive for categorisation", () => {
    const md = `## Context contract\n\n| role | globs |\n| --- | --- |\n| Inputs (L4) | wiki/a.md |\n| Reference (L3) | skills/b.md |\n| Outputs | wiki/log.md |\n`;
    const contract = parseContextContract(md);
    expect(contract).not.toBeNull();
    if (contract) {
      expect(contract.inputs).toContain("wiki/a.md");
      expect(contract.reference).toContain("skills/b.md");
      expect(contract.outputs).toContain("wiki/log.md");
    }
  });

  test("22. unmatched role still appears in rows but not in inputs/reference/outputs", () => {
    const md = `## Context contract\n\n| role | globs |\n| --- | --- |\n| side-effects | tmp/**/*.md |\n| inputs (L4) | wiki/**/*.md |\n`;
    const contract = parseContextContract(md);
    expect(contract).not.toBeNull();
    if (contract) {
      // Both rows captured
      expect(contract.rows).toHaveLength(2);
      // The side-effects row is NOT in any category
      expect(contract.inputs).toContain("wiki/**/*.md");
      expect(contract.inputs).not.toContain("tmp/**/*.md");
      expect(contract.reference).toHaveLength(0);
      expect(contract.outputs).toHaveLength(0);
    }
  });
});
