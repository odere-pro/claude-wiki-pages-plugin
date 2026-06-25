/**
 * TDD: structural-check — template-skeleton conformance + no-raw-HTML.
 *
 * Mirrors the logic in scripts/lint-structural.sh (S2-structural):
 *   1. Pages with all required H2 headings → no finding.
 *   2. Page missing a required H2 heading → warn finding (missing-section).
 *   3. Page with raw HTML block element → warn finding (raw-html).
 *   4. Bookkeeping files (index, log, dashboard, manifest, _index, .gitkeep) → skipped.
 *   5. Folder notes (<dir>/<dir>.md + type: index) → skipped.
 *   6. Types exempt from skeleton check (source, index, manifest, log) → no missing-section.
 *   7. Pages with type that has no template → no missing-section finding.
 *   8. Frontmatter stripped before raw-HTML scan.
 *   9. Fenced code blocks excluded from raw-HTML scan.
 *  10. _proposed/ drafts skipped.
 *  11. Missing wiki/ dir → returns [] without throwing.
 *  12. Missing _templates/ dir → skeleton check skipped, raw-HTML still runs.
 *  13. H2 headings with placeholder {{…}} syntax → excluded from required headings.
 *  14. Multiple violations → multiple findings.
 *  15. Integration: lint --check structural on a sandbox vault with clean pages.
 *  16. Integration: lint --check structural on a dirty vault returns findings.
 */

import { test, expect, describe } from "bun:test";
import { join } from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { makeVault, CLEAN_VAULT } from "../test-helpers/sandbox/vault.ts";
import { checkStructural, STRUCTURAL_CHECK } from "./structural-check.ts";
import { lint } from "../commands/lint/lint.ts";
import { exitCode } from "./report.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface StructuralVault {
  vault: string;
  cleanup: () => void;
}

/** Build a minimal scratch vault with wiki/ and optional _templates/. */
function makeStructuralVault(
  wikiFiles: Record<string, string>,
  templateFiles: Record<string, string> = {},
): StructuralVault {
  const root = mkdtempSync(join(tmpdir(), "cwp-structural-test-"));
  const vault = join(root, "vault");
  mkdirSync(join(vault, "wiki"), { recursive: true });
  writeFileSync(join(vault, "CLAUDE.md"), "---\nschema_version: 1\n---\n# Vault\n");
  for (const [rel, content] of Object.entries(wikiFiles)) {
    const full = join(vault, "wiki", rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content);
  }
  if (Object.keys(templateFiles).length > 0) {
    mkdirSync(join(vault, "_templates"), { recursive: true });
    for (const [rel, content] of Object.entries(templateFiles)) {
      const full = join(vault, "_templates", rel);
      mkdirSync(join(full, ".."), { recursive: true });
      writeFileSync(full, content);
    }
  }
  return { vault, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

const CONCEPT_TEMPLATE = `---
type: concept
---

# {{title}}

## Definition

## Key Principles

## Examples

## Related Concepts
`;

// ---------------------------------------------------------------------------
// Unit: checkStructural
// ---------------------------------------------------------------------------

describe("Feature: Verify › structural check — unit: check name constant", () => {
  test("STRUCTURAL_CHECK is 'structural'", () => {
    expect(STRUCTURAL_CHECK).toBe("structural");
  });
});

describe("Feature: Verify › structural check — unit: clean vault", () => {
  test("no wiki/ dir returns empty array", () => {
    const sb = makeVault(CLEAN_VAULT);
    // CLEAN_VAULT has a wiki/ with only bookkeeping files — should be clean
    const findings = checkStructural(sb.vault);
    expect(findings).toEqual([]);
    sb.cleanup();
  });

  test("page with all required H2 headings → no finding", () => {
    const v = makeStructuralVault(
      {
        "concepts/provenance.md": `---
title: Provenance
type: concept
---

# Provenance

## Definition

Some definition.

## Key Principles

Some principles.

## Examples

Some examples.

## Related Concepts

Related stuff.
`,
      },
      { "concept.md": CONCEPT_TEMPLATE },
    );
    const findings = checkStructural(v.vault);
    expect(findings).toEqual([]);
    v.cleanup();
  });

  test("page type with no template → no missing-section finding", () => {
    const v = makeStructuralVault(
      {
        "concepts/my-concept.md": `---
title: My Concept
type: concept
---

# My Concept

## Some Section
`,
      },
      // No templates directory provided
    );
    const findings = checkStructural(v.vault);
    // No template for concept → no skeleton check → no finding
    expect(
      findings.filter((f) => f.check === STRUCTURAL_CHECK && f.message.includes("missing-section")),
    ).toHaveLength(0);
    v.cleanup();
  });
});

describe("Feature: Verify › structural check — unit: missing-section", () => {
  test("page missing a required H2 heading → warn finding", () => {
    const v = makeStructuralVault(
      {
        "concepts/incomplete.md": `---
title: Incomplete
type: concept
---

# Incomplete

## Definition

Only definition present.
`,
      },
      { "concept.md": CONCEPT_TEMPLATE },
    );
    const findings = checkStructural(v.vault);
    const warnFindings = findings.filter(
      (f) => f.severity === "warn" && f.message.includes("missing-section"),
    );
    // Missing: Key Principles, Examples, Related Concepts
    expect(warnFindings.length).toBeGreaterThan(0);
    v.cleanup();
  });

  test("missing-section finding has severity warn", () => {
    const v = makeStructuralVault(
      {
        "concepts/partial.md": `---
title: Partial
type: concept
---

# Partial

## Definition

Present.
`,
      },
      { "concept.md": CONCEPT_TEMPLATE },
    );
    const findings = checkStructural(v.vault);
    const missingSectionFindings = findings.filter((f) => f.message.includes("missing-section"));
    for (const f of missingSectionFindings) {
      expect(f.severity).toBe("warn");
    }
    v.cleanup();
  });

  test("missing-section finding includes the required heading text", () => {
    const v = makeStructuralVault(
      {
        "concepts/partial.md": `---
title: Partial
type: concept
---

# Partial

## Definition

Present.
`,
      },
      { "concept.md": CONCEPT_TEMPLATE },
    );
    const findings = checkStructural(v.vault);
    const msgs = findings.map((f) => f.message);
    expect(msgs.some((m) => m.includes("Key Principles"))).toBe(true);
    expect(msgs.some((m) => m.includes("Examples"))).toBe(true);
    expect(msgs.some((m) => m.includes("Related Concepts"))).toBe(true);
    v.cleanup();
  });

  test("missing-section finding has check === STRUCTURAL_CHECK", () => {
    const v = makeStructuralVault(
      {
        "concepts/partial.md": `---
title: Partial
type: concept
---

# Partial

## Definition

Present.
`,
      },
      { "concept.md": CONCEPT_TEMPLATE },
    );
    const findings = checkStructural(v.vault);
    for (const f of findings) {
      expect(f.check).toBe(STRUCTURAL_CHECK);
    }
    v.cleanup();
  });
});

describe("Feature: Verify › structural check — unit: raw-html", () => {
  test("page with raw HTML block element → warn finding (raw-html)", () => {
    const v = makeStructuralVault({
      "concepts/html-page.md": `---
title: HTML Page
type: concept
---

# HTML Page

<div>Some raw HTML</div>

Body content.
`,
    });
    const findings = checkStructural(v.vault);
    const rawHtmlFindings = findings.filter((f) => f.message.includes("raw-html"));
    expect(rawHtmlFindings.length).toBeGreaterThan(0);
    v.cleanup();
  });

  test("raw-html finding has severity warn", () => {
    const v = makeStructuralVault({
      "concepts/html-page.md": `---
title: HTML Page
type: concept
---

# HTML Page

<span>inline html</span>
`,
    });
    const findings = checkStructural(v.vault);
    const rawHtmlFindings = findings.filter((f) => f.message.includes("raw-html"));
    for (const f of rawHtmlFindings) {
      expect(f.severity).toBe("warn");
    }
    v.cleanup();
  });

  test("raw HTML in frontmatter is NOT flagged (frontmatter stripped)", () => {
    // The frontmatter itself might contain < characters in HTML entities but
    // the scanner must not flag frontmatter content.
    const v = makeStructuralVault({
      "concepts/page.md": `---
title: "Page <em>with</em> title"
type: concept
---

# Page

Body without HTML.
`,
    });
    const findings = checkStructural(v.vault);
    const rawHtmlFindings = findings.filter((f) => f.message.includes("raw-html"));
    expect(rawHtmlFindings).toHaveLength(0);
    v.cleanup();
  });

  test("raw HTML in fenced code block is NOT flagged", () => {
    const v = makeStructuralVault({
      "concepts/page.md": `---
title: Page
type: concept
---

# Page

Here is an example:

\`\`\`html
<div>this is a code example</div>
\`\`\`

No raw HTML in prose.
`,
    });
    const findings = checkStructural(v.vault);
    const rawHtmlFindings = findings.filter((f) => f.message.includes("raw-html"));
    expect(rawHtmlFindings).toHaveLength(0);
    v.cleanup();
  });

  test("all target raw HTML tags trigger a finding", () => {
    const tags = [
      "div",
      "span",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
      "iframe",
      "script",
      "style",
      "form",
      "input",
      "button",
      "select",
      "textarea",
    ];
    for (const tag of tags) {
      const v = makeStructuralVault({
        "concepts/page.md": `---
title: Page
type: concept
---

# Page

<${tag}>content</${tag}>
`,
      });
      const findings = checkStructural(v.vault);
      const rawHtmlFindings = findings.filter((f) => f.message.includes("raw-html"));
      expect(rawHtmlFindings.length).toBeGreaterThan(0);
      v.cleanup();
    }
  });
});

describe("Feature: Verify › structural check — unit: exemptions", () => {
  test("bookkeeping file 'index.md' is skipped", () => {
    const v = makeStructuralVault(
      {
        "index.md": `---
title: index
type: index
---

# Index

<div>raw html here</div>
`,
      },
      { "index.md": `---\n---\n\n## Pages\n\n## Subtopics\n` },
    );
    // index.md is bookkeeping — should be skipped entirely
    const findings = checkStructural(v.vault);
    expect(findings).toHaveLength(0);
    v.cleanup();
  });

  test("bookkeeping file 'log.md' is skipped", () => {
    const v = makeStructuralVault({
      "log.md": `---
title: log
type: log
---

# Log

<div>raw html</div>
`,
    });
    const findings = checkStructural(v.vault);
    expect(findings).toHaveLength(0);
    v.cleanup();
  });

  test("bookkeeping file 'dashboard.md' is skipped", () => {
    const v = makeStructuralVault({
      "dashboard.md": `---
title: dashboard
type: concept
---

# Dashboard

<div>raw html</div>
`,
    });
    const findings = checkStructural(v.vault);
    expect(findings).toHaveLength(0);
    v.cleanup();
  });

  test("folder note (stem == parent dir name + type: index) is skipped", () => {
    const v = makeStructuralVault(
      {
        "concepts/concepts.md": `---
title: Concepts Index
type: index
---

# Concepts Index

<div>raw html in folder note</div>
`,
      },
      // Even with a template it should be skipped as folder note
      { "index.md": `---\n---\n\n## Pages\n\n## Subtopics\n` },
    );
    const findings = checkStructural(v.vault);
    expect(findings).toHaveLength(0);
    v.cleanup();
  });

  test("_proposed/ drafts are skipped", () => {
    const v = makeStructuralVault({
      "_proposed/concepts/draft.md": `---
title: Draft
type: concept
---

# Draft

<div>raw html in draft</div>
`,
    });
    const findings = checkStructural(v.vault);
    expect(findings).toHaveLength(0);
    v.cleanup();
  });

  test("type 'source' is exempt from skeleton check", () => {
    const v = makeStructuralVault(
      {
        "_sources/my-source.md": `---
title: My Source
type: source
---

# My Source

No required H2 sections.
`,
      },
      { "source.md": `---\ntype: source\n---\n\n## Summary\n\n## Key Claims\n` },
    );
    const findings = checkStructural(v.vault);
    const missingSectionFindings = findings.filter((f) => f.message.includes("missing-section"));
    expect(missingSectionFindings).toHaveLength(0);
    v.cleanup();
  });

  test("type 'manifest' is exempt from skeleton check", () => {
    const v = makeStructuralVault(
      {
        "_sources/manifest.md": `---
title: Manifest
type: manifest
---

# Manifest
`,
      },
      { "manifest.md": `---\ntype: manifest\n---\n\n## Sources\n` },
    );
    const findings = checkStructural(v.vault);
    const missingSectionFindings = findings.filter((f) => f.message.includes("missing-section"));
    expect(missingSectionFindings).toHaveLength(0);
    v.cleanup();
  });

  test("page without a type field is skipped", () => {
    const v = makeStructuralVault(
      {
        "concepts/no-type.md": `---
title: No Type
---

# No Type

<div>raw html would normally trigger</div>
`,
      },
      { "concept.md": CONCEPT_TEMPLATE },
    );
    // No type → entire page is skipped (mirrors bash behavior: _page_type returns empty → continue)
    const findings = checkStructural(v.vault);
    expect(findings).toHaveLength(0);
    v.cleanup();
  });
});

describe("Feature: Verify › structural check — unit: template placeholder exclusion", () => {
  test("H2 headings like '## {{something}}' in templates are NOT required", () => {
    const templateWithPlaceholder = `---
type: concept
---

# {{title}}

## Definition

## {{optional_section}}

## Key Principles
`;
    const v = makeStructuralVault(
      {
        "concepts/page.md": `---
title: Page
type: concept
---

# Page

## Definition

Some definition.

## Key Principles

Some principles.
`,
      },
      { "concept.md": templateWithPlaceholder },
    );
    // {{optional_section}} should not be required — only Definition and Key Principles
    const findings = checkStructural(v.vault);
    const missingSectionFindings = findings.filter((f) => f.message.includes("missing-section"));
    expect(missingSectionFindings).toHaveLength(0);
    v.cleanup();
  });
});

describe("Feature: Verify › structural check — unit: multiple violations", () => {
  test("page with both missing sections AND raw html produces multiple findings", () => {
    const v = makeStructuralVault(
      {
        "concepts/bad-page.md": `---
title: Bad Page
type: concept
---

# Bad Page

<div>some raw html</div>

## Definition

Only definition.
`,
      },
      { "concept.md": CONCEPT_TEMPLATE },
    );
    const findings = checkStructural(v.vault);
    const missingSectionFindings = findings.filter((f) => f.message.includes("missing-section"));
    const rawHtmlFindings = findings.filter((f) => f.message.includes("raw-html"));
    expect(missingSectionFindings.length).toBeGreaterThan(0);
    expect(rawHtmlFindings.length).toBeGreaterThan(0);
    v.cleanup();
  });

  test("two pages each with a violation → two raw-html findings", () => {
    const v = makeStructuralVault({
      "concepts/page-a.md": `---
title: Page A
type: concept
---

# Page A

<span>html in A</span>
`,
      "concepts/page-b.md": `---
title: Page B
type: entity
---

# Page B

<div>html in B</div>
`,
    });
    const findings = checkStructural(v.vault);
    const rawHtmlFindings = findings.filter((f) => f.message.includes("raw-html"));
    expect(rawHtmlFindings.length).toBe(2);
    v.cleanup();
  });
});

describe("Feature: Verify › structural check — unit: file field", () => {
  test("finding includes the file field (vault-relative path)", () => {
    const v = makeStructuralVault({
      "concepts/page.md": `---
title: Page
type: concept
---

# Page

<div>raw html</div>
`,
    });
    const findings = checkStructural(v.vault);
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) {
      expect(f.file).toBeDefined();
      expect(typeof f.file).toBe("string");
    }
    v.cleanup();
  });

  test("finding file path is vault-relative", () => {
    const v = makeStructuralVault({
      "concepts/page.md": `---
title: Page
type: concept
---

# Page

<div>raw html</div>
`,
    });
    const findings = checkStructural(v.vault);
    expect(findings.length).toBeGreaterThan(0);
    // Should be relative (not starting with '/')
    for (const f of findings) {
      if (f.file !== undefined) {
        expect(f.file.startsWith("/")).toBe(false);
      }
    }
    v.cleanup();
  });
});

describe("Feature: Verify › structural check — unit: missing templates dir", () => {
  test("no _templates/ dir → skeleton check skipped, raw-HTML still runs", () => {
    const v = makeStructuralVault({
      "concepts/page.md": `---
title: Page
type: concept
---

# Page

<div>raw html</div>
`,
    });
    // No templates provided — skeleton check skipped
    const findings = checkStructural(v.vault);
    // Raw HTML should still be found
    const rawHtmlFindings = findings.filter((f) => f.message.includes("raw-html"));
    expect(rawHtmlFindings.length).toBeGreaterThan(0);
    // No missing-section findings without templates
    const missingSectionFindings = findings.filter((f) => f.message.includes("missing-section"));
    expect(missingSectionFindings).toHaveLength(0);
    v.cleanup();
  });
});

describe("Feature: Verify › structural check — unit: missing wiki/ dir", () => {
  test("missing wiki/ dir returns [] without throwing", () => {
    const sb = makeVault({ "CLAUDE.md": "---\nschema_version: 1\n---\n# Vault\n" });
    // No wiki/ created
    const findings = checkStructural(sb.vault);
    expect(findings).toEqual([]);
    sb.cleanup();
  });
});

// ---------------------------------------------------------------------------
// Integration: lint --check structural
// ---------------------------------------------------------------------------

describe("Feature: Verify › structural check — lint --check structural integration", () => {
  test("clean vault (no wiki pages) → clean report", async () => {
    const sb = makeVault(CLEAN_VAULT);
    const report = await lint({ target: sb.vault, check: "structural" });
    expect(report.command).toBe("lint");
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
    expect(report.clean).toBe(true);
    expect(exitCode(report)).toBe(0);
    sb.cleanup();
  });

  test("page with raw html → report has warnings > 0, exitCode 0 (warn-only)", async () => {
    const v = makeStructuralVault({
      "concepts/page.md": `---
title: Page
type: concept
---

# Page

<div>raw html</div>
`,
    });
    const report = await lint({ target: v.vault, check: "structural" });
    expect(report.warnings).toBeGreaterThan(0);
    // structural check emits warn-severity, not error — exitCode stays 0
    expect(exitCode(report)).toBe(0);
    v.cleanup();
  });

  test("check=all includes structural check", async () => {
    const v = makeStructuralVault({
      "concepts/page.md": `---
title: Page
type: concept
---

# Page

<div>raw html in all mode</div>
`,
    });
    const report = await lint({ target: v.vault, check: "all" });
    // structural is included in all — should pick up the raw html warning
    const structuralFindings = report.findings.filter((f) => f.check === STRUCTURAL_CHECK);
    expect(structuralFindings.length).toBeGreaterThan(0);
    v.cleanup();
  });

  test("structural findings have check === 'structural'", async () => {
    const v = makeStructuralVault({
      "concepts/page.md": `---
title: Page
type: concept
---

# Page

<div>raw html</div>
`,
    });
    const report = await lint({ target: v.vault, check: "structural" });
    for (const f of report.findings) {
      expect(f.check).toBe(STRUCTURAL_CHECK);
    }
    v.cleanup();
  });

  test("reference-vault fixtures pass structural check cleanly", async () => {
    const REFERENCE_VAULT = join(import.meta.dir, "../../tests/fixtures/reference-vault");
    const report = await lint({ target: REFERENCE_VAULT, check: "structural" });
    // Reference vault should be clean — zero structural violations
    expect(report.warnings).toBe(0);
    expect(report.errors).toBe(0);
    expect(report.clean).toBe(true);
  });
});
