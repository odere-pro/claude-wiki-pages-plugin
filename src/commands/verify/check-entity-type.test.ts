/**
 * M16: check-entity-type — colocated unit tests.
 *
 * Anchors the layering fix: checkEntityType and resolveSchemaPath are importable
 * directly from this module without touching any peer commands/ directory.
 * The import chain is: check-entity-type.ts → core/ontology-profile.ts (DIP-correct).
 *
 * Covers:
 *   1. Schema absent → fail-open (returns []).
 *   2. Valid entity_type (member of core set) → no findings.
 *   3. Invalid entity_type → error finding with "entity-type-membership" check.
 *   4. Non-entity pages (type: concept, source, index) → skipped, no finding.
 *   5. entity_type absent on an entity page → skipped (required-fields' job, no double-flag).
 *   6. Empty entity_type string → skipped (degenerate, not this check's responsibility).
 *   7. Vault extension via entity_type_extensions composes with core.
 *   8. Message contains the page title and the invalid entity_type value.
 *   9. Bookkeeping files (index.md, _index.md, folder notes) are skipped entirely.
 *  10. entity_type: null is skipped (same as absent — no double-flag).
 *  11. Non-string entity_type (numeric/boolean) is coerced and checked for membership.
 *  12. Empty wiki directory (empty-collection boundary) → returns [] (no files to check).
 *  13. Schema present but structurally malformed → fail-open (parseOntologyProfile ok: false).
 *  14. entity_type with surrounding whitespace → trimmed before membership check.
 */

import { test, expect, describe } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkEntityType, resolveSchemaPath } from "./check-entity-type.ts";

// ---------------------------------------------------------------------------
// Minimal schema document (must contain predicate table + enum list).
// Mirrors the shape expected by parseOntologyProfile in core/ontology-profile.ts.
// ---------------------------------------------------------------------------

const MINIMAL_PROFILE = `---
schema_version: 3
---
# LLM Wiki — Schema

## ontology-profile-v1

### Predicate domain→range table

| Predicate | Domain (source class) | Range (target class) | Direction / cardinality |
| --- | --- | --- | --- |
| \`sources\` | \`entity\`,\`concept\`,\`topic\`,\`project\`,\`synthesis\` | \`source\` | directed, 1..N |
| \`related\` | \`entity\`,\`concept\`,\`topic\`,\`project\` | \`entity\`,\`concept\`,\`topic\`,\`project\` | undirected, 0..N |

### Enum list

| Enum | Canonical values | Closed? | Calibration |
| --- | --- | --- | --- |
| page type (\`type\`) | \`source\`,\`entity\`,\`concept\`,\`topic\`,\`project\`,\`synthesis\`,\`index\`,\`manifest\`,\`log\` | closed (core) | not vault-extensible |
| \`entity_type\` (fixed core, calibratable) | \`person\`,\`organization\`,\`product\`,\`tool\`,\`service\`,\`standard\`,\`place\` | closed core + owner extension | owner adds via \`entity_type_extensions:\` |
`;

// ---------------------------------------------------------------------------
// Fixture builder
// ---------------------------------------------------------------------------

interface Sandbox {
  vault: string;
  wiki: string;
  cleanup(): void;
}

function makeSandbox(files: Record<string, string> = {}): Sandbox {
  const root = mkdtempSync(join(tmpdir(), "cwp-entity-type-test-"));
  const vault = join(root, "vault");
  const wiki = join(vault, "wiki");
  mkdirSync(wiki, { recursive: true });

  for (const [rel, content] of Object.entries(files)) {
    const full = join(vault, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content);
  }
  return {
    vault,
    wiki,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

function schemaPath(sb: Sandbox): string {
  return join(sb.vault, "CLAUDE.md");
}

function vaultClaudeMd(sb: Sandbox): string {
  return join(sb.vault, "CLAUDE.md");
}

// ---------------------------------------------------------------------------
// 1. Schema absent → fail-open (returns [])
// ---------------------------------------------------------------------------

describe("Feature: Verify › entity_type check — schema absent", () => {
  test("1. no CLAUDE.md → returns [] (fail-open, no false positives)", () => {
    const sb = makeSandbox({
      "wiki/topics/my-entity.md": "---\ntitle: My Entity\ntype: entity\nentity_type: person\n---\n",
    });
    // No CLAUDE.md written — parseOntologyProfile will fail → fail-open
    const findings = checkEntityType(sb.wiki, schemaPath(sb), vaultClaudeMd(sb));
    expect(findings).toHaveLength(0);
    sb.cleanup();
  });
});

// ---------------------------------------------------------------------------
// 2. Valid entity_type (member of core set) → no findings
// ---------------------------------------------------------------------------

describe("Feature: Verify › entity_type check — valid entity_type", () => {
  test("2. entity_type in core set → no findings", () => {
    const sb = makeSandbox({
      "CLAUDE.md": MINIMAL_PROFILE,
      "wiki/topics/my-entity.md": "---\ntitle: My Entity\ntype: entity\nentity_type: person\n---\n",
    });
    const findings = checkEntityType(sb.wiki, schemaPath(sb), vaultClaudeMd(sb));
    expect(findings).toHaveLength(0);
    sb.cleanup();
  });

  test("2b. all core entity_type values are accepted", () => {
    const coreValues = [
      "person",
      "organization",
      "product",
      "tool",
      "service",
      "standard",
      "place",
    ];
    for (const val of coreValues) {
      const sb = makeSandbox({
        "CLAUDE.md": MINIMAL_PROFILE,
        "wiki/topics/my-entity.md": `---\ntitle: My Entity\ntype: entity\nentity_type: ${val}\n---\n`,
      });
      const findings = checkEntityType(sb.wiki, schemaPath(sb), vaultClaudeMd(sb));
      expect(findings).toHaveLength(0);
      sb.cleanup();
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Invalid entity_type → error finding
// ---------------------------------------------------------------------------

describe("Feature: Verify › entity_type check — invalid entity_type", () => {
  test("3. entity_type NOT in allowed set → error finding with check: entity-type-membership", () => {
    const sb = makeSandbox({
      "CLAUDE.md": MINIMAL_PROFILE,
      "wiki/topics/my-entity.md":
        "---\ntitle: My Entity\ntype: entity\nentity_type: invalid_type\n---\n",
    });
    const findings = checkEntityType(sb.wiki, schemaPath(sb), vaultClaudeMd(sb));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("error");
    expect(findings[0]?.check).toBe("entity-type-membership");
    sb.cleanup();
  });

  test("3b. multiple entity pages with invalid entity_type → one finding each", () => {
    const sb = makeSandbox({
      "CLAUDE.md": MINIMAL_PROFILE,
      "wiki/topics/entity-a.md": "---\ntitle: Entity A\ntype: entity\nentity_type: bad_type\n---\n",
      "wiki/topics/entity-b.md":
        "---\ntitle: Entity B\ntype: entity\nentity_type: another_bad\n---\n",
    });
    const findings = checkEntityType(sb.wiki, schemaPath(sb), vaultClaudeMd(sb));
    expect(findings).toHaveLength(2);
    expect(findings.every((f) => f.severity === "error")).toBe(true);
    expect(findings.every((f) => f.check === "entity-type-membership")).toBe(true);
    sb.cleanup();
  });
});

// ---------------------------------------------------------------------------
// 4. Non-entity pages are skipped
// ---------------------------------------------------------------------------

describe("Feature: Verify › entity_type check — non-entity page types skipped", () => {
  test("4. type: concept with invalid entity_type → skipped (not an entity page)", () => {
    const sb = makeSandbox({
      "CLAUDE.md": MINIMAL_PROFILE,
      "wiki/topics/my-concept.md":
        "---\ntitle: My Concept\ntype: concept\nentity_type: INVALID\n---\n",
    });
    const findings = checkEntityType(sb.wiki, schemaPath(sb), vaultClaudeMd(sb));
    expect(findings).toHaveLength(0);
    sb.cleanup();
  });

  test("4b. type: source, index, log with invalid entity_type → all skipped", () => {
    for (const pageType of ["source", "index", "log"]) {
      const sb = makeSandbox({
        "CLAUDE.md": MINIMAL_PROFILE,
        "wiki/topics/page.md": `---\ntitle: Page\ntype: ${pageType}\nentity_type: INVALID\n---\n`,
      });
      const findings = checkEntityType(sb.wiki, schemaPath(sb), vaultClaudeMd(sb));
      expect(findings).toHaveLength(0);
      sb.cleanup();
    }
  });
});

// ---------------------------------------------------------------------------
// 5. entity_type absent on an entity page → skipped (no double-flag)
// ---------------------------------------------------------------------------

describe("Feature: Verify › entity_type check — absent entity_type is skipped", () => {
  test("5. entity page with no entity_type field → returns [] (required-fields' responsibility)", () => {
    const sb = makeSandbox({
      "CLAUDE.md": MINIMAL_PROFILE,
      "wiki/topics/my-entity.md": "---\ntitle: My Entity\ntype: entity\n---\n",
    });
    const findings = checkEntityType(sb.wiki, schemaPath(sb), vaultClaudeMd(sb));
    expect(findings).toHaveLength(0);
    sb.cleanup();
  });
});

// ---------------------------------------------------------------------------
// 6. Empty entity_type string → skipped (degenerate)
// ---------------------------------------------------------------------------

describe("Feature: Verify › entity_type check — empty entity_type is skipped", () => {
  test("6. entity_type: '' (empty string) → returns [] (degenerate case)", () => {
    const sb = makeSandbox({
      "CLAUDE.md": MINIMAL_PROFILE,
      "wiki/topics/my-entity.md": "---\ntitle: My Entity\ntype: entity\nentity_type: \n---\n",
    });
    const findings = checkEntityType(sb.wiki, schemaPath(sb), vaultClaudeMd(sb));
    expect(findings).toHaveLength(0);
    sb.cleanup();
  });
});

// ---------------------------------------------------------------------------
// 7. entity_type_extensions compose with core
// ---------------------------------------------------------------------------

describe("Feature: Verify › entity_type check — vault entity_type_extensions", () => {
  test("7. entity_type_extensions value is accepted when present in CLAUDE.md frontmatter", () => {
    // entity_type_extensions must live in the YAML frontmatter (readEntityTypeExtensions
    // reads the --- block first; body text is only the fallback path).
    const profileWithExtension = `---
schema_version: 3
entity_type_extensions: [dataset]
---
# LLM Wiki — Schema

## ontology-profile-v1

### Predicate domain→range table

| Predicate | Domain (source class) | Range (target class) | Direction / cardinality |
| --- | --- | --- | --- |
| \`sources\` | \`entity\`,\`concept\`,\`topic\`,\`project\`,\`synthesis\` | \`source\` | directed, 1..N |

### Enum list

| Enum | Canonical values | Closed? | Calibration |
| --- | --- | --- | --- |
| page type (\`type\`) | \`source\`,\`entity\`,\`concept\`,\`topic\`,\`project\`,\`synthesis\`,\`index\`,\`manifest\`,\`log\` | closed (core) | not vault-extensible |
| \`entity_type\` (fixed core, calibratable) | \`person\`,\`organization\`,\`product\`,\`tool\`,\`service\`,\`standard\`,\`place\` | closed core + owner extension | owner adds via \`entity_type_extensions:\` |
`;
    const sb = makeSandbox({
      "CLAUDE.md": profileWithExtension,
      "wiki/topics/my-entity.md":
        "---\ntitle: My Dataset\ntype: entity\nentity_type: dataset\n---\n",
    });
    const findings = checkEntityType(sb.wiki, schemaPath(sb), vaultClaudeMd(sb));
    expect(findings).toHaveLength(0);
    sb.cleanup();
  });

  test("7b. value absent from both core and extensions → error finding", () => {
    const profileWithExtension = `---
schema_version: 3
entity_type_extensions: [dataset]
---
# LLM Wiki — Schema

## ontology-profile-v1

### Predicate domain→range table

| Predicate | Domain (source class) | Range (target class) | Direction / cardinality |
| --- | --- | --- | --- |
| \`sources\` | \`entity\`,\`concept\`,\`topic\`,\`project\`,\`synthesis\` | \`source\` | directed, 1..N |

### Enum list

| Enum | Canonical values | Closed? | Calibration |
| --- | --- | --- | --- |
| page type (\`type\`) | \`source\`,\`entity\`,\`concept\`,\`topic\`,\`project\`,\`synthesis\`,\`index\`,\`manifest\`,\`log\` | closed (core) | not vault-extensible |
| \`entity_type\` (fixed core, calibratable) | \`person\`,\`organization\`,\`product\`,\`tool\`,\`service\`,\`standard\`,\`place\` | closed core + owner extension | owner adds via \`entity_type_extensions:\` |
`;
    const sb = makeSandbox({
      "CLAUDE.md": profileWithExtension,
      "wiki/topics/my-entity.md":
        "---\ntitle: My Entity\ntype: entity\nentity_type: not_in_either\n---\n",
    });
    const findings = checkEntityType(sb.wiki, schemaPath(sb), vaultClaudeMd(sb));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("error");
    sb.cleanup();
  });
});

// ---------------------------------------------------------------------------
// 8. Error message contains the page title and the invalid value
// ---------------------------------------------------------------------------

describe("Feature: Verify › entity_type check — error message content", () => {
  test("8. error message contains the title and the bad entity_type value", () => {
    const sb = makeSandbox({
      "CLAUDE.md": MINIMAL_PROFILE,
      "wiki/topics/named-entity.md":
        "---\ntitle: Named Entity\ntype: entity\nentity_type: bad_value\n---\n",
    });
    const findings = checkEntityType(sb.wiki, schemaPath(sb), vaultClaudeMd(sb));
    expect(findings).toHaveLength(1);
    const msg = findings[0]?.message ?? "";
    expect(msg).toContain("Named Entity");
    expect(msg).toContain("bad_value");
    sb.cleanup();
  });
});

// ---------------------------------------------------------------------------
// 9. Bookkeeping files are skipped (isBookkeepingFile gate — line 101)
// ---------------------------------------------------------------------------

describe("Feature: Verify › entity_type check — bookkeeping files skipped", () => {
  test("9a. index.md with invalid entity_type → skipped (bookkeeping)", () => {
    const sb = makeSandbox({
      "CLAUDE.md": MINIMAL_PROFILE,
      // "index" basename is in the BOOKKEEPING set; check must skip it
      "wiki/topics/index.md": "---\ntitle: Index\ntype: entity\nentity_type: bad_type\n---\n",
    });
    const findings = checkEntityType(sb.wiki, schemaPath(sb), vaultClaudeMd(sb));
    expect(findings).toHaveLength(0);
    sb.cleanup();
  });

  test("9b. _index.md with invalid entity_type → skipped (bookkeeping)", () => {
    const sb = makeSandbox({
      "CLAUDE.md": MINIMAL_PROFILE,
      "wiki/topics/_index.md": "---\ntitle: Index\ntype: entity\nentity_type: bad_type\n---\n",
    });
    const findings = checkEntityType(sb.wiki, schemaPath(sb), vaultClaudeMd(sb));
    expect(findings).toHaveLength(0);
    sb.cleanup();
  });

  test("9c. folder note (basename == parent dir name) with invalid entity_type → flagged (not bookkeeping)", () => {
    const sb = makeSandbox({
      "CLAUDE.md": MINIMAL_PROFILE,
      // topics/topics.md is a folder note, NOT a bookkeeping file — isBookkeepingFile
      // (the only exclusion this check applies, line 101) does not skip it, so a
      // type: entity folder note with an invalid entity_type IS a real content
      // violation and must be reported.
      "wiki/topics/topics.md": "---\ntitle: Topics\ntype: entity\nentity_type: bad_type\n---\n",
    });
    const findings = checkEntityType(sb.wiki, schemaPath(sb), vaultClaudeMd(sb));
    expect(findings).toHaveLength(1);
    sb.cleanup();
  });
});

// ---------------------------------------------------------------------------
// 10. entity_type: null is skipped (explicitly handled at line 113)
// ---------------------------------------------------------------------------

describe("Feature: Verify › entity_type check — null entity_type is skipped", () => {
  test("10. entity_type explicitly null in frontmatter → skipped (no double-flag)", () => {
    const sb = makeSandbox({
      "CLAUDE.md": MINIMAL_PROFILE,
      // YAML `entity_type: ` with a tilde parses as null
      "wiki/topics/my-entity.md": "---\ntitle: My Entity\ntype: entity\nentity_type: ~\n---\n",
    });
    const findings = checkEntityType(sb.wiki, schemaPath(sb), vaultClaudeMd(sb));
    expect(findings).toHaveLength(0);
    sb.cleanup();
  });
});

// ---------------------------------------------------------------------------
// 11. Non-string entity_type is coerced via String() and checked for membership
//     (line 115-116: `typeof rawEntityType === "string" ? ... : String(rawEntityType).trim()`)
// ---------------------------------------------------------------------------

describe("Feature: Verify › entity_type check — non-string entity_type coercion", () => {
  test("11a. entity_type: 123 (numeric) → coerced to '123', not in core set → error finding", () => {
    const sb = makeSandbox({
      "CLAUDE.md": MINIMAL_PROFILE,
      // YAML bare integer is parsed as number, not string
      "wiki/topics/my-entity.md": "---\ntitle: My Entity\ntype: entity\nentity_type: 123\n---\n",
    });
    const findings = checkEntityType(sb.wiki, schemaPath(sb), vaultClaudeMd(sb));
    // "123" is not a member of the core entity_type set → error
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("error");
    expect(findings[0]?.check).toBe("entity-type-membership");
    sb.cleanup();
  });

  test("11b. entity_type: true (boolean) → coerced to 'true', not in core set → error finding", () => {
    const sb = makeSandbox({
      "CLAUDE.md": MINIMAL_PROFILE,
      "wiki/topics/my-entity.md": "---\ntitle: My Entity\ntype: entity\nentity_type: true\n---\n",
    });
    const findings = checkEntityType(sb.wiki, schemaPath(sb), vaultClaudeMd(sb));
    // YAML `true` may parse as boolean; "true" is not in core set → error
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("error");
    sb.cleanup();
  });
});

// ---------------------------------------------------------------------------
// 12. Empty wiki directory (empty-collection boundary case)
//     listMarkdownRecursive returns [] when wiki/ is empty → no findings
// ---------------------------------------------------------------------------

describe("Feature: Verify › entity_type check — empty wiki directory", () => {
  test("12a. wiki/ exists but is empty → returns [] (no files to check)", () => {
    const sb = makeSandbox({
      "CLAUDE.md": MINIMAL_PROFILE,
      // wiki/ is created by makeSandbox but no .md files are written into it
    });
    const findings = checkEntityType(sb.wiki, schemaPath(sb), vaultClaudeMd(sb));
    expect(findings).toHaveLength(0);
    sb.cleanup();
  });

  test("12b. wiki/ does not exist at all → returns [] (fail-open on missing dir)", () => {
    const sb = makeSandbox({
      "CLAUDE.md": MINIMAL_PROFILE,
    });
    // Pass a non-existent wiki path — listMarkdownRecursive returns []
    const nonExistentWiki = join(sb.vault, "nonexistent-wiki");
    const findings = checkEntityType(nonExistentWiki, schemaPath(sb), vaultClaudeMd(sb));
    expect(findings).toHaveLength(0);
    sb.cleanup();
  });
});

// ---------------------------------------------------------------------------
// 13. Schema present but structurally malformed → fail-open (returns [])
//     Tests the parseOntologyProfile ok: false path for bad schema content.
// ---------------------------------------------------------------------------

describe("Feature: Verify › entity_type check — malformed schema falls back to fail-open", () => {
  test("13a. CLAUDE.md present but missing predicate table → returns [] (fail-open)", () => {
    const noPredicateTable = `---
schema_version: 3
---
# LLM Wiki — Schema

## ontology-profile-v1

### Enum list

| Enum | Canonical values | Closed? | Calibration |
| --- | --- | --- | --- |
| page type (\`type\`) | \`entity\` | closed (core) | not vault-extensible |
| \`entity_type\` | \`person\` | closed core | owner adds via \`entity_type_extensions:\` |
`;
    const sb = makeSandbox({
      "CLAUDE.md": noPredicateTable,
      "wiki/topics/my-entity.md":
        "---\ntitle: My Entity\ntype: entity\nentity_type: invalid_value\n---\n",
    });
    // parseOntologyProfile returns ok: false when predicate table is missing
    const findings = checkEntityType(sb.wiki, schemaPath(sb), vaultClaudeMd(sb));
    expect(findings).toHaveLength(0);
    sb.cleanup();
  });

  test("13b. CLAUDE.md present but missing entity_type enum row → returns [] (fail-open)", () => {
    const noEntityTypeRow = `---
schema_version: 3
---
# LLM Wiki — Schema

## ontology-profile-v1

### Predicate domain→range table

| Predicate | Domain (source class) | Range (target class) | Direction / cardinality |
| --- | --- | --- | --- |
| \`sources\` | \`entity\` | \`source\` | directed, 1..N |

### Enum list

| Enum | Canonical values | Closed? | Calibration |
| --- | --- | --- | --- |
| page type (\`type\`) | \`entity\`,\`source\` | closed (core) | not vault-extensible |
`;
    // No entity_type row in the enum table → parseOntologyProfile returns ok: false
    const sb = makeSandbox({
      "CLAUDE.md": noEntityTypeRow,
      "wiki/topics/my-entity.md":
        "---\ntitle: My Entity\ntype: entity\nentity_type: invalid_value\n---\n",
    });
    const findings = checkEntityType(sb.wiki, schemaPath(sb), vaultClaudeMd(sb));
    expect(findings).toHaveLength(0);
    sb.cleanup();
  });
});

// ---------------------------------------------------------------------------
// 14. entity_type with surrounding whitespace is trimmed before membership check
//     (line 116: rawEntityType.trim()) — boundary / limit value
// ---------------------------------------------------------------------------

describe("Feature: Verify › entity_type check — entity_type whitespace trimming", () => {
  test("14a. entity_type with surrounding spaces: ' person ' → trimmed to 'person' → valid, no finding", () => {
    const sb = makeSandbox({
      "CLAUDE.md": MINIMAL_PROFILE,
      // YAML quoted string with spaces — parseFrontmatter preserves the spaces;
      // the implementation trims before lookup (line 116).
      "wiki/topics/my-entity.md":
        '---\ntitle: My Entity\ntype: entity\nentity_type: " person "\n---\n',
    });
    // YAML literal " person " (with quotes stripped by YAML parser) becomes " person "
    // After trim → "person" → member of core set → no finding.
    // If the YAML parser keeps the quotes, the trimmed value would be '"person"' → error.
    // The test asserts the behaviour matches code as-written; the actual outcome
    // depends on the YAML parser. Either path (0 or 1 finding) is deterministic
    // for a given parser — this test documents the current boundary behaviour.
    const findings = checkEntityType(sb.wiki, schemaPath(sb), vaultClaudeMd(sb));
    // " person " parsed by js-yaml → string with spaces → trimmed to "person" → 0 findings
    expect(findings).toHaveLength(0);
    sb.cleanup();
  });

  test("14b. entity_type with tab whitespace only: '\\t' → trimmed to '' → skipped (degenerate)", () => {
    const sb = makeSandbox({
      "CLAUDE.md": MINIMAL_PROFILE,
      // A tab-only entity_type value; after trim it's empty → the empty-string
      // guard at line 119 skips it rather than flagging it.
      "wiki/topics/my-entity.md": '---\ntitle: My Entity\ntype: entity\nentity_type: "\\t"\n---\n',
    });
    const findings = checkEntityType(sb.wiki, schemaPath(sb), vaultClaudeMd(sb));
    expect(findings).toHaveLength(0);
    sb.cleanup();
  });
});

// ---------------------------------------------------------------------------
// resolveSchemaPath — returns vault CLAUDE.md path
// ---------------------------------------------------------------------------

describe("Feature: Verify › entity_type check — resolveSchemaPath", () => {
  test("returns <vault>/CLAUDE.md path (used by verify.ts to wire checkEntityType)", () => {
    const result = resolveSchemaPath("/some/vault");
    expect(result).toBe("/some/vault/CLAUDE.md");
  });
});
