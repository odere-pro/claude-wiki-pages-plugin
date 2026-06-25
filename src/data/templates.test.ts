/**
 * R08: Colocated unit suite for src/data/templates.ts.
 *
 * Tests cover:
 *   - TOPIC_TEMPLATE and PROJECT_TEMPLATE are non-empty strings
 *   - Both templates open and close a YAML frontmatter block
 *   - Required frontmatter fields present in each template
 *   - Template-specific fields (key_pages, objective/project_status)
 *   - {{title}} placeholder present in both templates
 *   - The two constants are distinct values
 */

import { test, expect, describe } from "bun:test";
import { TOPIC_TEMPLATE, PROJECT_TEMPLATE } from "./templates.ts";
import { parseFrontmatter } from "../core/frontmatter.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the text between the first pair of `---` frontmatter fences. */
function extractFrontmatter(template: string): string {
  const lines = template.split("\n");
  const fenceIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === "---") {
      fenceIndices.push(i);
      if (fenceIndices.length === 2) break;
    }
  }
  if (fenceIndices.length < 2) return "";
  return lines.slice(fenceIndices[0]! + 1, fenceIndices[1]!).join("\n");
}

/** Return true when the template contains the given YAML field key. */
function hasFrontmatterField(template: string, field: string): boolean {
  const fm = extractFrontmatter(template);
  // Match `field:` at the start of a line (handles multi-line frontmatter)
  return new RegExp(`^${field}:`, "m").test(fm);
}

/**
 * Return the trimmed scalar value of a YAML field from the frontmatter block,
 * or undefined when the field is absent.  Handles unquoted and quoted values:
 *   type: topic       → "topic"
 *   type: "topic"     → "topic"
 */
function getFrontmatterFieldValue(template: string, field: string): string | undefined {
  const fm = extractFrontmatter(template);
  const match = new RegExp(`^${field}:\\s*(.*)$`, "m").exec(fm);
  if (!match) return undefined;
  // Strip optional surrounding quotes produced by different YAML serialisers.
  return match[1]!.trim().replace(/^["']|["']$/g, "");
}

// ---------------------------------------------------------------------------
// Suite: basic type contracts
// ---------------------------------------------------------------------------

describe("Feature: Schema › page templates — TOPIC_TEMPLATE: basic contract", () => {
  test("is a non-empty string", () => {
    expect(typeof TOPIC_TEMPLATE).toBe("string");
    expect(TOPIC_TEMPLATE.length).toBeGreaterThan(0);
  });

  test("opens and closes a YAML frontmatter block", () => {
    const fences = TOPIC_TEMPLATE.split("\n").filter((l) => l === "---");
    expect(fences.length).toBeGreaterThanOrEqual(2);
  });

  test("starts with the opening frontmatter fence", () => {
    expect(TOPIC_TEMPLATE.trimStart().startsWith("---")).toBe(true);
  });
});

describe("Feature: Schema › page templates — PROJECT_TEMPLATE: basic contract", () => {
  test("is a non-empty string", () => {
    expect(typeof PROJECT_TEMPLATE).toBe("string");
    expect(PROJECT_TEMPLATE.length).toBeGreaterThan(0);
  });

  test("opens and closes a YAML frontmatter block", () => {
    const fences = PROJECT_TEMPLATE.split("\n").filter((l) => l === "---");
    expect(fences.length).toBeGreaterThanOrEqual(2);
  });

  test("starts with the opening frontmatter fence", () => {
    expect(PROJECT_TEMPLATE.trimStart().startsWith("---")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite: required frontmatter fields shared by both templates
// ---------------------------------------------------------------------------

const SHARED_FIELDS = [
  "title",
  "aliases",
  "parent",
  "path",
  "sources",
  "related",
  "source_quotes",
  "derived",
  "tags",
  "created",
  "updated",
  "update_count",
  "status",
  "confidence",
];

describe("Feature: Schema › page templates — TOPIC_TEMPLATE: frontmatter fields", () => {
  for (const field of SHARED_FIELDS) {
    test(`contains shared field "${field}"`, () => {
      expect(hasFrontmatterField(TOPIC_TEMPLATE, field)).toBe(true);
    });
  }

  test('type field value is "topic"', () => {
    expect(getFrontmatterFieldValue(TOPIC_TEMPLATE, "type")).toBe("topic");
  });

  test("contains topic-specific field key_pages", () => {
    expect(hasFrontmatterField(TOPIC_TEMPLATE, "key_pages")).toBe(true);
  });

  test("contains summary field", () => {
    expect(hasFrontmatterField(TOPIC_TEMPLATE, "summary")).toBe(true);
  });
});

describe("Feature: Schema › page templates — PROJECT_TEMPLATE: frontmatter fields", () => {
  for (const field of SHARED_FIELDS) {
    test(`contains shared field "${field}"`, () => {
      expect(hasFrontmatterField(PROJECT_TEMPLATE, field)).toBe(true);
    });
  }

  test('type field value is "project"', () => {
    expect(getFrontmatterFieldValue(PROJECT_TEMPLATE, "type")).toBe("project");
  });

  test("contains project-specific field objective", () => {
    expect(hasFrontmatterField(PROJECT_TEMPLATE, "objective")).toBe(true);
  });

  test("contains project-specific field project_status", () => {
    expect(hasFrontmatterField(PROJECT_TEMPLATE, "project_status")).toBe(true);
  });

  test("contains project-specific field members", () => {
    expect(hasFrontmatterField(PROJECT_TEMPLATE, "members")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite: Mustache placeholder presence
// ---------------------------------------------------------------------------

describe("Feature: Schema › page templates — TOPIC_TEMPLATE: placeholders", () => {
  test("contains {{title}} placeholder", () => {
    expect(TOPIC_TEMPLATE).toContain("{{title}}");
  });

  test("contains {{summary}} placeholder in body", () => {
    expect(TOPIC_TEMPLATE).toContain("{{summary}}");
  });
});

describe("Feature: Schema › page templates — PROJECT_TEMPLATE: placeholders", () => {
  test("contains {{title}} placeholder", () => {
    expect(PROJECT_TEMPLATE).toContain("{{title}}");
  });

  test("contains {{objective}} placeholder in body", () => {
    expect(PROJECT_TEMPLATE).toContain("{{objective}}");
  });
});

// ---------------------------------------------------------------------------
// Suite: YAML-validity contract (S24 de-coupling)
//
// Assert the CONTRACT — the frontmatter parses as valid YAML through the
// engine's own parser and carries every required key — rather than pinning the
// exact byte layout. This is the coverage the regex-only checks above lacked: a
// malformed value (bad indentation, an unbalanced quote) would slip past a
// `^field:` regex but fail real YAML parsing.
// ---------------------------------------------------------------------------

const REQUIRED_KEYS_BY_TYPE: Record<string, readonly string[]> = {
  topic: [...SHARED_FIELDS, "type", "summary", "key_pages"],
  project: [...SHARED_FIELDS, "type", "objective", "project_status", "members"],
};

describe("Feature: Schema › page templates — frontmatter parses as valid YAML with all required keys", () => {
  const cases: readonly [string, string, string][] = [
    ["TOPIC_TEMPLATE", TOPIC_TEMPLATE, "topic"],
    ["PROJECT_TEMPLATE", PROJECT_TEMPLATE, "project"],
  ];

  for (const [name, template, type] of cases) {
    test(`${name} frontmatter is valid YAML (parses without throwing)`, () => {
      expect(() => parseFrontmatter(template)).not.toThrow();
      const fm = parseFrontmatter(template);
      expect(typeof fm).toBe("object");
      expect(fm).not.toBeNull();
    });

    test(`${name} carries every required ${type} key when parsed`, () => {
      const fm = parseFrontmatter(template);
      for (const key of REQUIRED_KEYS_BY_TYPE[type]!) {
        expect(Object.prototype.hasOwnProperty.call(fm, key)).toBe(true);
      }
      expect(fm.type).toBe(type);
    });
  }
});

// ---------------------------------------------------------------------------
// Suite: distinctness — the two templates must not be identical
// ---------------------------------------------------------------------------

describe("Feature: Schema › page templates — template distinctness", () => {
  test("TOPIC_TEMPLATE and PROJECT_TEMPLATE are different strings", () => {
    expect(TOPIC_TEMPLATE).not.toBe(PROJECT_TEMPLATE);
  });
});
