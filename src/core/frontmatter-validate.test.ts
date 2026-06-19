/**
 * Colocated tests for src/core/frontmatter-validate.ts.
 *
 * TDD parity target: scripts/validate-frontmatter.sh `validate_content`
 * (lines 221-346). Each dirty case below mirrors one rule the awk-YAML parser
 * enforced; the clean case proves a fully-conformant page yields no findings.
 *
 * The required-fields table and the page-type enum are single-sourced from a
 * schema CLAUDE.md (skills/init/template/CLAUDE.md, "### Required fields by
 * type" + "### Enum list" — TEAM-BRIEF §6). Tests synthesise a minimal schema
 * via makeVault so the suite never depends on the real template's churn.
 */

import { describe, test, expect, afterEach } from "bun:test";
import { join } from "node:path";
import { makeVault, type Sandbox } from "../test-helpers/sandbox/vault.ts";
import { validateFrontmatter, validateContent } from "./frontmatter-validate.ts";

// ── A minimal but complete schema CLAUDE.md for the sandbox ─────────────────
// Carries both the "### Required fields by type" table (required-field rules)
// and the "### Enum list" table (the page-type enum), so validateFrontmatter
// resolves rules entirely from the sandbox vault — no bundled-template reach.
const SCHEMA_CLAUDE_MD = `---
schema_version: 1
---
# Vault schema

### Required fields by type

| Type | Required fields | Conditional |
| --- | --- | --- |
| \`source\` | \`source_type sources created updated status confidence\` | \`source_format != text\` requires \`attachment_path extracted_at\` |
| \`entity\` | \`entity_type parent path sources created updated status confidence\` | — |
| \`concept\` | \`parent path sources created updated status confidence\` | — |
| \`topic\` | \`summary parent path sources created updated status confidence\` | — |
| \`project\` | \`objective project_status parent path sources created updated status confidence\` | — |
| \`synthesis\` | \`synthesis_type sources created updated status confidence\` | — |
| \`index\` | \`aliases created updated\` | — |
| \`manifest\` | \`created updated\` | — |
| \`log\` | \`created updated\` | — |

### Enum list

| Enum | Canonical values | Closed? | Calibration |
| --- | --- | --- | --- |
| page type (\`type\`) | \`source\`,\`entity\`,\`concept\`,\`topic\`,\`project\`,\`synthesis\`,\`index\`,\`manifest\`,\`log\` | closed (core) | n/a |
| \`entity_type\` | \`person\`,\`organization\`,\`product\` | closed (core) | extensible |
`;

let sb: Sandbox | undefined;
afterEach(() => {
  sb?.cleanup();
  sb = undefined;
});

/** Build a sandbox vault carrying the schema plus the given wiki files. */
function vaultWith(files: Record<string, string>): Sandbox {
  return makeVault({ "CLAUDE.md": SCHEMA_CLAUDE_MD, ...files });
}

/** A fully-conformant concept page body. */
const CLEAN_CONCEPT = `---
type: concept
title: Photosynthesis
parent: "[[Biology]]"
path: topics/biology
sources: ["[[Some Source]]"]
created: 2026-01-01
updated: 2026-01-02
status: published
confidence: 0.9
---
# Photosynthesis
body
`;

describe("validateFrontmatter (vault-level CLI parity)", () => {
  test("a clean conformant concept page yields no findings", () => {
    sb = vaultWith({ "wiki/topics/biology/photosynthesis.md": CLEAN_CONCEPT });
    const findings = validateFrontmatter(sb.vault);
    expect(findings).toEqual([]);
  });

  test("returns one error finding per dirty page, carrying the wiki-relative file", () => {
    sb = vaultWith({
      "wiki/topics/biology/good.md": CLEAN_CONCEPT,
      "wiki/topics/biology/bad.md": "no frontmatter here\n",
    });
    const findings = validateFrontmatter(sb.vault);
    expect(findings.length).toBe(1);
    expect(findings[0]?.severity).toBe("error");
    expect(findings[0]?.check).toBe("frontmatter");
    expect(findings[0]?.file).toBe("topics/biology/bad.md");
  });

  test("missing wiki/ directory yields no findings (CLI exit-2 case handled by caller)", () => {
    sb = makeVault({ "CLAUDE.md": SCHEMA_CLAUDE_MD });
    const findings = validateFrontmatter(sb.vault);
    expect(findings).toEqual([]);
  });
});

describe("validateContent — bash validate_content parity rules", () => {
  const schemaPath = (s: Sandbox): string => join(s.vault, "CLAUDE.md");

  test("clean concept page → null", () => {
    sb = vaultWith({});
    const msg = validateContent("topics/biology/photosynthesis.md", CLEAN_CONCEPT, schemaPath(sb));
    expect(msg).toBeNull();
  });

  test("missing frontmatter block", () => {
    sb = vaultWith({});
    const msg = validateContent("x.md", "plain body, no fences\n", schemaPath(sb));
    expect(msg).toContain("Missing YAML frontmatter");
  });

  test("missing universal fields type and title reported together", () => {
    sb = vaultWith({});
    const msg = validateContent("x.md", "---\nstatus: draft\n---\nbody\n", schemaPath(sb));
    expect(msg).toContain("Missing required field(s)");
    expect(msg).toContain("type");
    expect(msg).toContain("title");
  });

  test("unknown type lists allowed types", () => {
    sb = vaultWith({});
    const msg = validateContent("x.md", "---\ntype: widget\ntitle: W\n---\nbody\n", schemaPath(sb));
    expect(msg).toContain("Unknown type: widget");
    expect(msg).toContain("concept");
  });

  test("missing per-type required fields reported together", () => {
    sb = vaultWith({});
    const content = "---\ntype: concept\ntitle: C\nparent: x\n---\nbody\n";
    const msg = validateContent("topics/c.md", content, schemaPath(sb));
    expect(msg).toContain("concept");
    expect(msg).toContain("missing required field(s)");
    // path, sources, created, updated, status, confidence all absent
    expect(msg).toContain("sources");
    expect(msg).toContain("confidence");
  });

  test("source with source_format != text requires attachment_path + extracted_at", () => {
    sb = vaultWith({});
    const content = `---
type: source
title: A PDF
source_type: paper
source_format: pdf
sources: []
created: 2026-01-01
updated: 2026-01-01
status: published
confidence: 0.9
---
body
`;
    const msg = validateContent("_sources/a.md", content, schemaPath(sb));
    expect(msg).toContain("source_format: pdf");
    expect(msg).toContain("attachment_path");
    expect(msg).toContain("extracted_at");
  });

  test("source with source_format text does NOT require attachment_path", () => {
    sb = vaultWith({});
    const content = `---
type: source
title: A text source
source_type: article
source_format: text
sources: []
created: 2026-01-01
updated: 2026-01-01
status: published
confidence: 0.9
---
body
`;
    const msg = validateContent("_sources/a.md", content, schemaPath(sb));
    expect(msg).toBeNull();
  });

  test("path field inconsistent with file location is flagged", () => {
    sb = vaultWith({});
    const content = CLEAN_CONCEPT.replace("path: topics/biology", "path: wrong/place");
    const msg = validateContent("topics/biology/photosynthesis.md", content, schemaPath(sb));
    expect(msg).toContain("path:");
    expect(msg).toContain("wrong/place");
    expect(msg).toContain("topics/biology");
  });

  test("path field consistent with file location passes", () => {
    sb = vaultWith({});
    const msg = validateContent("topics/biology/photosynthesis.md", CLEAN_CONCEPT, schemaPath(sb));
    expect(msg).toBeNull();
  });

  test("page at wiki root with no path subdir passes the path check", () => {
    sb = vaultWith({});
    const content = CLEAN_CONCEPT.replace("path: topics/biology", "path: anything");
    // file directly under wiki/ → expected_path empty → check skipped (bash parity)
    const msg = validateContent("root-page.md", content, schemaPath(sb));
    expect(msg).toBeNull();
  });
});

describe("validateContent — fail-closed when schema table is absent", () => {
  test("schema CLAUDE.md without the required-fields table fails closed", () => {
    sb = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n# No tables here\n" });
    const content = "---\ntype: concept\ntitle: C\n---\nbody\n";
    const msg = validateContent("c.md", content, join(sb.vault, "CLAUDE.md"));
    expect(msg).not.toBeNull();
    expect(msg).toContain("cannot validate");
  });

  test("a nonexistent schema path fails closed", () => {
    const content = "---\ntype: concept\ntitle: C\n---\nbody\n";
    const msg = validateContent("c.md", content, "/no/such/schema/CLAUDE.md");
    expect(msg).not.toBeNull();
    expect(msg).toContain("cannot validate");
  });
});

describe("validateContent — extension rules (beyond bash, additive)", () => {
  const schemaPath = (s: Sandbox): string => join(s.vault, "CLAUDE.md");

  test("derived: true with confidence >= 0.8 is flagged (provenance shape)", () => {
    sb = vaultWith({});
    const content = CLEAN_CONCEPT.replace("confidence: 0.9", "derived: true\nconfidence: 0.95");
    const msg = validateContent("topics/biology/photosynthesis.md", content, schemaPath(sb));
    expect(msg).toContain("derived");
    expect(msg).toContain("confidence");
  });

  test("confidence out of the 0..1 range is flagged (provenance shape)", () => {
    sb = vaultWith({});
    const content = CLEAN_CONCEPT.replace("confidence: 0.9", "confidence: 1.5");
    const msg = validateContent("topics/biology/photosynthesis.md", content, schemaPath(sb));
    expect(msg).toContain("confidence");
  });

  test("sources present but not a list/wikilink shape is flagged", () => {
    sb = vaultWith({});
    const content = CLEAN_CONCEPT.replace('sources: ["[[Some Source]]"]', "sources: 42");
    const msg = validateContent("topics/biology/photosynthesis.md", content, schemaPath(sb));
    expect(msg).toContain("sources");
  });

  test("schema_version present but not 1 or 2 is flagged", () => {
    sb = vaultWith({});
    const content = CLEAN_CONCEPT.replace("type: concept", "schema_version: 9\ntype: concept");
    const msg = validateContent("topics/biology/photosynthesis.md", content, schemaPath(sb));
    expect(msg).toContain("schema_version");
  });

  test("schema_version 2 is accepted", () => {
    sb = vaultWith({});
    const content = CLEAN_CONCEPT.replace("type: concept", "schema_version: 2\ntype: concept");
    const msg = validateContent("topics/biology/photosynthesis.md", content, schemaPath(sb));
    expect(msg).toBeNull();
  });
});
