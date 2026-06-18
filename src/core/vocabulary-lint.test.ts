/**
 * TDD tests for vocabulary-lint.ts — lint --check vocabulary.
 *
 * Mirrors the three signals in scripts/lint-vocabulary.sh:
 *   Signal 1 — orphaned-form: a form absent from all wiki pages.
 *   Signal 2 — unreferenced-group: all forms absent → one WARN by canonical.
 *   Signal 3 — tag-floor: a form used as tag on fewer than minTagUsage pages.
 *
 * All tests use the makeVault sandbox.
 */

import { test, expect, describe } from "bun:test";
import { makeVault } from "../test-helpers/sandbox/vault.ts";
import { lintVocabulary } from "./vocabulary-lint.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Minimal vocabulary frontmatter with a single group. */
function vocabContent(canonical: string, variants: string[] = []): string {
  // 4-space indent for list item properties (2 for list level + 2 for item content).
  const variantLines =
    variants.length > 0
      ? `    variants:\n${variants.map((v) => `      - "${v}"`).join("\n")}`
      : `    variants: []`;
  return `---\ngroups:\n  - canonical: "${canonical}"\n${variantLines}\n---\n`;
}

function wikiPage(title: string, tags: string[] = [], body = "body text"): string {
  const tagsLine =
    tags.length > 0 ? `tags:\n${tags.map((t) => `  - ${t}`).join("\n")}` : `tags: []`;
  return `---\ntitle: ${title}\n${tagsLine}\n---\n${body}\n`;
}

// ─── absent _vocabulary.md ────────────────────────────────────────────────────

describe("lintVocabulary — absent _vocabulary.md", () => {
  test("returns zero findings (graceful skip) when _vocabulary.md is absent", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 1\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
    });
    try {
      const findings = lintVocabulary(sb.vault);
      // Graceful skip, consistent with the sibling lint checks: an absent
      // optional lexicon is not a structural finding (the bash twin's INFO line
      // was console-only and exited 0).
      expect(findings).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });
});

// ─── empty groups ─────────────────────────────────────────────────────────────

describe("lintVocabulary — empty groups", () => {
  test("returns zero findings when groups list is empty", () => {
    const sb = makeVault({
      "_vocabulary.md": "---\ngroups: []\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
    });
    try {
      const findings = lintVocabulary(sb.vault);
      expect(findings).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });
});

// ─── Signal 2 — unreferenced group ────────────────────────────────────────────

describe("lintVocabulary — signal 2: unreferenced-group", () => {
  test("emits one warn when canonical and all variants absent from wiki", () => {
    const sb = makeVault({
      "_vocabulary.md": vocabContent("automobile", ["car", "vehicle"]),
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/topics/alpha.md": wikiPage("Alpha", [], "electric bikes are great"),
    });
    try {
      const findings = lintVocabulary(sb.vault);
      const unrefd = findings.filter((f) => f.check === "vocabulary-unreferenced-group");
      expect(unrefd).toHaveLength(1);
      expect(unrefd[0]?.severity).toBe("warn");
      expect(unrefd[0]?.message).toContain("automobile");
    } finally {
      sb.cleanup();
    }
  });

  test("emits one unreferenced-group warn per absent group (two groups)", () => {
    const sb = makeVault({
      "_vocabulary.md":
        '---\ngroups:\n  - canonical: "alpha"\n    variants: []\n  - canonical: "beta"\n    variants: []\n---\n',
      "wiki/topics/page.md": wikiPage("Page", [], "nothing matches here"),
    });
    try {
      const findings = lintVocabulary(sb.vault);
      const unrefd = findings.filter((f) => f.check === "vocabulary-unreferenced-group");
      expect(unrefd).toHaveLength(2);
    } finally {
      sb.cleanup();
    }
  });

  test("no unreferenced-group warn when canonical appears in page body", () => {
    const sb = makeVault({
      "_vocabulary.md": vocabContent("automobile"),
      "wiki/topics/transport.md": wikiPage("Transport", [], "automobile is a common word"),
    });
    try {
      const findings = lintVocabulary(sb.vault);
      expect(findings.filter((f) => f.check === "vocabulary-unreferenced-group")).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });

  test("variant presence rescues the group (no unreferenced-group warn)", () => {
    const sb = makeVault({
      "_vocabulary.md": vocabContent("automobile", ["car"]),
      "wiki/topics/transport.md": wikiPage("Transport", [], "the car industry is large"),
    });
    try {
      const findings = lintVocabulary(sb.vault);
      expect(findings.filter((f) => f.check === "vocabulary-unreferenced-group")).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });

  test("match in page title rescues group", () => {
    const sb = makeVault({
      "_vocabulary.md": vocabContent("transport"),
      "wiki/topics/transport.md": wikiPage("Transport", [], "some body text"),
    });
    try {
      const findings = lintVocabulary(sb.vault);
      expect(findings.filter((f) => f.check === "vocabulary-unreferenced-group")).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });

  test("match in page alias rescues group", () => {
    const sb = makeVault({
      "_vocabulary.md": vocabContent("motorbike"),
      "wiki/topics/motorcycle.md":
        '---\ntitle: Motorcycle\naliases: ["motorbike"]\ntags: []\n---\nbody\n',
    });
    try {
      const findings = lintVocabulary(sb.vault);
      expect(findings.filter((f) => f.check === "vocabulary-unreferenced-group")).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });

  test("match in page tags rescues group", () => {
    const sb = makeVault({
      "_vocabulary.md": vocabContent("transport"),
      "wiki/topics/page.md": wikiPage("Page", ["transport"], "unrelated body"),
    });
    try {
      const findings = lintVocabulary(sb.vault);
      expect(findings.filter((f) => f.check === "vocabulary-unreferenced-group")).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });

  test("no wiki pages → every group is unreferenced", () => {
    const sb = makeVault({
      "_vocabulary.md": vocabContent("alpha", ["beta"]),
    });
    try {
      const findings = lintVocabulary(sb.vault);
      const unrefd = findings.filter((f) => f.check === "vocabulary-unreferenced-group");
      expect(unrefd).toHaveLength(1);
    } finally {
      sb.cleanup();
    }
  });
});

// ─── Signal 1 — orphaned form ─────────────────────────────────────────────────

describe("lintVocabulary — signal 1: orphaned-form", () => {
  test("emits orphaned-form for each variant absent when canonical present", () => {
    const sb = makeVault({
      "_vocabulary.md": vocabContent("automobile", ["car", "vehicle"]),
      "wiki/topics/transport.md": wikiPage("Transport", [], "automobile is a type of transport"),
    });
    try {
      const findings = lintVocabulary(sb.vault);
      const orphans = findings.filter((f) => f.check === "vocabulary-orphaned-form");
      // "car" and "vehicle" are absent; "automobile" is present so no unreferenced-group
      expect(orphans).toHaveLength(2);
      const msgs = orphans.map((f) => f.message);
      expect(msgs.some((m) => m.includes('"car"'))).toBe(true);
      expect(msgs.some((m) => m.includes('"vehicle"'))).toBe(true);
      // canonical mentioned in context
      expect(msgs.every((m) => m.includes("automobile"))).toBe(true);
    } finally {
      sb.cleanup();
    }
  });

  test("no orphaned-form warn when all forms present", () => {
    const sb = makeVault({
      "_vocabulary.md": vocabContent("automobile", ["car"]),
      "wiki/topics/transport.md": wikiPage("Transport", [], "automobile and car are synonyms"),
    });
    try {
      const findings = lintVocabulary(sb.vault);
      expect(findings.filter((f) => f.check === "vocabulary-orphaned-form")).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });

  test("canonical absent but variant present → orphaned-form for canonical only", () => {
    const sb = makeVault({
      "_vocabulary.md": vocabContent("automobile", ["car"]),
      "wiki/topics/transport.md": wikiPage("Transport", [], "the car industry"),
    });
    try {
      const findings = lintVocabulary(sb.vault);
      const orphans = findings.filter((f) => f.check === "vocabulary-orphaned-form");
      expect(orphans).toHaveLength(1);
      expect(orphans[0]?.message).toContain('"automobile"');
    } finally {
      sb.cleanup();
    }
  });

  test("form match is case-insensitive", () => {
    const sb = makeVault({
      "_vocabulary.md": vocabContent("automobile"),
      "wiki/topics/transport.md": wikiPage("Transport", [], "AUTOMOBILE engines"),
    });
    try {
      const findings = lintVocabulary(sb.vault);
      // All uppercase match should mean no unreferenced or orphaned
      const relevant = findings.filter(
        (f) =>
          f.check === "vocabulary-unreferenced-group" || f.check === "vocabulary-orphaned-form",
      );
      expect(relevant).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });
});

// ─── Signal 3 — tag-floor ─────────────────────────────────────────────────────

describe("lintVocabulary — signal 3: tag-floor", () => {
  test("emits tag-floor warn when a form is a tag on only 1 page (floor=2)", () => {
    const sb = makeVault({
      "_vocabulary.md": vocabContent("transport"),
      "wiki/topics/page1.md": wikiPage("Page 1", ["transport"], "transport is present"),
      "wiki/topics/page2.md": wikiPage("Page 2", [], "also mentions transport"),
    });
    try {
      const findings = lintVocabulary(sb.vault);
      const floor = findings.filter((f) => f.check === "vocabulary-tag-floor");
      expect(floor).toHaveLength(1);
      expect(floor[0]?.severity).toBe("warn");
      expect(floor[0]?.message).toContain("transport");
      expect(floor[0]?.message).toContain("1");
    } finally {
      sb.cleanup();
    }
  });

  test("no tag-floor warn when form is tag on 2+ pages (meets floor=2)", () => {
    const sb = makeVault({
      "_vocabulary.md": vocabContent("transport"),
      "wiki/topics/page1.md": wikiPage("Page 1", ["transport"], "transport is present"),
      "wiki/topics/page2.md": wikiPage("Page 2", ["transport"], "also transport"),
    });
    try {
      const findings = lintVocabulary(sb.vault);
      expect(findings.filter((f) => f.check === "vocabulary-tag-floor")).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });

  test("no tag-floor warn when form is not used as a tag at all", () => {
    const sb = makeVault({
      "_vocabulary.md": vocabContent("transport"),
      "wiki/topics/page1.md": wikiPage("Page 1", [], "transport is in the body"),
    });
    try {
      const findings = lintVocabulary(sb.vault);
      expect(findings.filter((f) => f.check === "vocabulary-tag-floor")).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });

  test("custom minTagUsage=1 suppresses tag-floor on a 1-page tag", () => {
    const sb = makeVault({
      "_vocabulary.md": vocabContent("transport"),
      "wiki/topics/page1.md": wikiPage("Page 1", ["transport"], "transport body"),
    });
    try {
      const findings = lintVocabulary(sb.vault, { minTagUsage: 1 });
      expect(findings.filter((f) => f.check === "vocabulary-tag-floor")).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });

  test("tag count aggregates across synonym forms in the same group", () => {
    const sb = makeVault({
      "_vocabulary.md": vocabContent("automobile", ["car"]),
      // "automobile" used as tag on page1, "car" as tag on page2 → total 2 → no floor
      "wiki/topics/page1.md": wikiPage("Page 1", ["automobile"], "automobile text"),
      "wiki/topics/page2.md": wikiPage("Page 2", ["car"], "car text"),
    });
    try {
      const findings = lintVocabulary(sb.vault);
      expect(findings.filter((f) => f.check === "vocabulary-tag-floor")).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });
});

// ─── findings are warn-severity only ──────────────────────────────────────────

describe("lintVocabulary — severity contract", () => {
  test("all findings are warn-severity (never error)", () => {
    const sb = makeVault({
      "_vocabulary.md": vocabContent("ghost-term", ["phantom"]),
      "wiki/topics/unrelated.md": wikiPage("Unrelated", [], "nothing relevant here"),
    });
    try {
      const findings = lintVocabulary(sb.vault);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings.every((f) => f.severity === "warn")).toBe(true);
    } finally {
      sb.cleanup();
    }
  });
});

// ─── determinism ──────────────────────────────────────────────────────────────

describe("lintVocabulary — determinism", () => {
  test("same vault → same findings on two calls", () => {
    const sb = makeVault({
      "_vocabulary.md":
        '---\ngroups:\n  - canonical: "alpha"\n    variants: []\n  - canonical: "beta"\n    variants: ["gamma"]\n---\n',
      "wiki/topics/page.md": wikiPage("Page", ["beta"], "alpha text here"),
    });
    try {
      const r1 = lintVocabulary(sb.vault);
      const r2 = lintVocabulary(sb.vault);
      expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
    } finally {
      sb.cleanup();
    }
  });

  test("findings are sorted by check then message for determinism", () => {
    const sb = makeVault({
      "_vocabulary.md":
        '---\ngroups:\n  - canonical: "zebra"\n    variants: ["zz"]\n  - canonical: "alpha"\n    variants: ["aa"]\n---\n',
      "wiki/topics/page.md": wikiPage("Page", [], "nothing"),
    });
    try {
      const findings = lintVocabulary(sb.vault);
      const msgs = findings.map((f) => f.message);
      const sorted = [...msgs].sort();
      expect(msgs).toEqual(sorted);
    } finally {
      sb.cleanup();
    }
  });
});

// ─── bookkeeping-file exemption ───────────────────────────────────────────────

describe("lintVocabulary — bookkeeping exemption", () => {
  test("index.md and log.md are excluded from wiki page corpus", () => {
    const sb = makeVault({
      "_vocabulary.md": vocabContent("someconcept"),
      // Only bookkeeping files mention the term
      "wiki/index.md": "---\ntitle: index\n---\nsomeconcept\n",
      "wiki/log.md": "---\ntitle: log\n---\nsomeconcept\n",
    });
    try {
      const findings = lintVocabulary(sb.vault);
      // Bookkeeping pages should not rescue the group
      const unrefd = findings.filter((f) => f.check === "vocabulary-unreferenced-group");
      expect(unrefd).toHaveLength(1);
    } finally {
      sb.cleanup();
    }
  });
});
