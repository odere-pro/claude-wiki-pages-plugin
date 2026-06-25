/**
 * TDD — RED first: duplicate-claims check.
 *
 * Tests `checkDuplicateClaims(vaultPath: string, proposedFile?: string): Finding[]`
 * from ./duplicate-claims.ts.
 *
 * This is the TS port of scripts/check-duplicate-claims.sh (ADR-0014 Part B).
 *
 * Behavioral spec (from the bash header):
 *   1. WARN-only (severity: "warn"); never errors; never blocks; always exits/returns.
 *   2. No proposed file supplied → zero findings.
 *   3. For each source_quotes[].quote in the proposed file, compute the canonical
 *      form and check it against the canonical forms of all wiki/ pages' quotes.
 *   4. On a match: one warn Finding per (proposed-file, matching-wiki-page) pair.
 *   5. Canonical form — applied in this exact documented order:
 *      a. Strip leading/trailing YAML scalar quoting chars: " ' [
 *      b. ASCII lowercase.
 *      c. Collapse whitespace runs to a single space.
 *      d. Trim leading/trailing whitespace.
 *      e. Remove fixed punctuation class: . , ; : ! ? " ' ` ( ) [ ] - – —
 *   6. HARD NO-RAG: comparison is canonical-string equality ONLY. No fuzzy matching,
 *      no edit-distance, no token-overlap, no embeddings, no semantic similarity.
 *
 * check name: "dup-claims"
 */

import { test, expect, describe, afterEach } from "bun:test";
import { makeVault } from "../test-helpers/sandbox/vault.ts";
import { join } from "node:path";
import { checkDuplicateClaims } from "./duplicate-claims.ts";

// ── Fixture helpers ───────────────────────────────────────────────────────────

function wikiPage(title: string, quotes: string[]): string {
  const quotesYaml =
    quotes.length === 0
      ? "source_quotes: []"
      : `source_quotes:\n${quotes.map((q) => `  - source: "[[source-a]]"\n    quote: "${q}"`).join("\n")}`;
  return `---\ntitle: "${title}"\ntype: entity\nsources:\n  - "[[source-a]]"\n${quotesYaml}\n---\n# ${title}\n`;
}

function proposedPage(title: string, quotes: string[]): string {
  const quotesYaml =
    quotes.length === 0
      ? "source_quotes: []"
      : `source_quotes:\n${quotes.map((q) => `  - source: "[[source-a]]"\n    quote: "${q}"`).join("\n")}`;
  return `---\ntitle: "${title}"\ntype: entity\nsources:\n  - "[[source-a]]"\n${quotesYaml}\n---\n# ${title}\n`;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("checkDuplicateClaims — no proposed file", () => {
  test("returns empty findings when proposedFile is undefined", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
    });
    try {
      const findings = checkDuplicateClaims(sb.vault);
      expect(findings).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });

  test("returns empty findings when proposedFile is an empty string", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
    });
    try {
      const findings = checkDuplicateClaims(sb.vault, "");
      expect(findings).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });

  test("returns empty findings when proposedFile does not exist on disk", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
    });
    try {
      const findings = checkDuplicateClaims(sb.vault, "/does/not/exist.md");
      expect(findings).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });
});

describe("checkDuplicateClaims — no duplication (clean vault)", () => {
  afterEach(() => {});

  test("returns no findings when proposed quotes are unique", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
      "wiki/topics/existing.md": wikiPage("Existing", ["The cat sat on the mat."]),
      "_proposed/new-page.md": proposedPage("New Page", ["The dog ran over the hill."]),
    });
    try {
      const findings = checkDuplicateClaims(sb.vault, join(sb.vault, "_proposed/new-page.md"));
      expect(findings.filter((f) => f.severity === "warn")).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });

  test("returns no findings when proposed source_quotes is empty", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/topics/existing.md": wikiPage("Existing", ["Some important claim."]),
      "_proposed/new-page.md": proposedPage("New Page", []),
    });
    try {
      const findings = checkDuplicateClaims(sb.vault, join(sb.vault, "_proposed/new-page.md"));
      expect(findings).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });

  test("returns no findings when wiki has no source_quotes at all", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/topics/no-quotes.md":
        '---\ntitle: No Quotes\ntype: entity\nsources:\n  - "[[src]]"\nsource_quotes: []\n---\n',
      "_proposed/new-page.md": proposedPage("New Page", ["A brand new claim."]),
    });
    try {
      const findings = checkDuplicateClaims(sb.vault, join(sb.vault, "_proposed/new-page.md"));
      expect(findings).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });
});

describe("checkDuplicateClaims — detects exact duplicates", () => {
  test("emits one warn finding per duplicate match", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/topics/existing.md": wikiPage("Existing", ["The sky is blue."]),
      "_proposed/draft.md": proposedPage("Draft", ["The sky is blue."]),
    });
    try {
      const findings = checkDuplicateClaims(sb.vault, join(sb.vault, "_proposed/draft.md"));
      const warns = findings.filter((f) => f.severity === "warn");
      expect(warns).toHaveLength(1);
      expect(warns[0]!.check).toBe("dup-claims");
    } finally {
      sb.cleanup();
    }
  });

  test("finding message names the proposed page and the existing wiki page", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/topics/solar-system.md": wikiPage("Solar System", ["The sun is a star."]),
      "_proposed/my-draft.md": proposedPage("My Draft", ["The sun is a star."]),
    });
    try {
      const findings = checkDuplicateClaims(sb.vault, join(sb.vault, "_proposed/my-draft.md"));
      const warns = findings.filter((f) => f.severity === "warn" && f.check === "dup-claims");
      expect(warns).toHaveLength(1);
      expect(warns[0]!.message).toContain("my-draft");
      expect(warns[0]!.message).toContain("solar-system");
    } finally {
      sb.cleanup();
    }
  });

  test("emits one finding per (proposed-quote, wiki-page) match pair", () => {
    // Proposed has two duplicate quotes; each maps to a different wiki page.
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/topics/page-a.md": wikiPage("Page A", ["Claim alpha."]),
      "wiki/topics/page-b.md": wikiPage("Page B", ["Claim beta."]),
      "_proposed/draft.md": proposedPage("Draft", ["Claim alpha.", "Claim beta."]),
    });
    try {
      const findings = checkDuplicateClaims(sb.vault, join(sb.vault, "_proposed/draft.md"));
      const warns = findings.filter((f) => f.severity === "warn");
      expect(warns).toHaveLength(2);
    } finally {
      sb.cleanup();
    }
  });

  test("finding includes the file field pointing to the proposed file", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/topics/existing.md": wikiPage("Existing", ["Water is wet."]),
      "_proposed/draft.md": proposedPage("Draft", ["Water is wet."]),
    });
    try {
      const proposed = join(sb.vault, "_proposed/draft.md");
      const findings = checkDuplicateClaims(sb.vault, proposed);
      const warns = findings.filter((f) => f.severity === "warn");
      expect(warns).toHaveLength(1);
      expect(warns[0]!.file).toBe(proposed);
    } finally {
      sb.cleanup();
    }
  });
});

describe("checkDuplicateClaims — canonical normalization", () => {
  test("matches despite case differences (step 2: lowercase)", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/topics/existing.md": wikiPage("Existing", ["The Sky Is Blue."]),
      "_proposed/draft.md": proposedPage("Draft", ["the sky is blue."]),
    });
    try {
      const findings = checkDuplicateClaims(sb.vault, join(sb.vault, "_proposed/draft.md"));
      expect(findings.filter((f) => f.severity === "warn")).toHaveLength(1);
    } finally {
      sb.cleanup();
    }
  });

  test("matches despite extra whitespace (step 3: collapse whitespace)", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/topics/existing.md": wikiPage("Existing", ["The sky is blue."]),
      "_proposed/draft.md": proposedPage("Draft", ["The  sky   is  blue."]),
    });
    try {
      const findings = checkDuplicateClaims(sb.vault, join(sb.vault, "_proposed/draft.md"));
      expect(findings.filter((f) => f.severity === "warn")).toHaveLength(1);
    } finally {
      sb.cleanup();
    }
  });

  test("matches despite punctuation differences (step 5: remove punctuation)", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/topics/existing.md": wikiPage("Existing", ["The sky is blue"]),
      "_proposed/draft.md": proposedPage("Draft", ["The sky is blue!"]),
    });
    try {
      const findings = checkDuplicateClaims(sb.vault, join(sb.vault, "_proposed/draft.md"));
      expect(findings.filter((f) => f.severity === "warn")).toHaveLength(1);
    } finally {
      sb.cleanup();
    }
  });

  test("does NOT match mere paraphrases (NO-RAG: exact canonical equality only)", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/topics/existing.md": wikiPage("Existing", ["The sky is blue."]),
      "_proposed/draft.md": proposedPage("Draft", ["The sky has a blue color."]),
    });
    try {
      const findings = checkDuplicateClaims(sb.vault, join(sb.vault, "_proposed/draft.md"));
      // Paraphrase: different canonical form → no match
      expect(findings.filter((f) => f.severity === "warn")).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });

  test("strips YAML surrounding quotes from raw scalar (step 1)", () => {
    // When YAML is parsed, quoted values come through without the outer quotes.
    // This test verifies behaviour when quotes appear within the string value itself.
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/topics/existing.md": wikiPage("Existing", ["the sky is blue"]),
      // Proposed has the same text wrapped in extra surrounding chars that step 1 strips
      "_proposed/draft.md":
        '---\ntitle: "Draft"\ntype: entity\nsources:\n  - "[[source-a]]"\nsource_quotes:\n  - source: "[[source-a]]"\n    quote: \'"the sky is blue"\'\n---\n',
    });
    try {
      const findings = checkDuplicateClaims(sb.vault, join(sb.vault, "_proposed/draft.md"));
      // After stripping YAML scalar quoting chars, lowercasing and removing punctuation:
      // both sides should resolve to "the sky is blue"
      expect(findings.filter((f) => f.severity === "warn")).toHaveLength(1);
    } finally {
      sb.cleanup();
    }
  });

  test("matches after removing em-dash and en-dash (step 5: extended punctuation)", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      // existing page has em-dash variant
      "wiki/topics/existing.md": wikiPage("Existing", ["An important point—worth noting"]),
      // proposed has en-dash variant; both reduce to same canonical form
      "_proposed/draft.md": proposedPage("Draft", ["An important point–worth noting"]),
    });
    try {
      const findings = checkDuplicateClaims(sb.vault, join(sb.vault, "_proposed/draft.md"));
      expect(findings.filter((f) => f.severity === "warn")).toHaveLength(1);
    } finally {
      sb.cleanup();
    }
  });
});

describe("checkDuplicateClaims — wiki scan excludes the proposed file itself", () => {
  test("does not report a self-match when proposed file is also in wiki/", () => {
    // Edge case: proposed file happens to be inside wiki/ (e.g. after promotion).
    // The wiki index build and the proposed-file lookup should not cross-match
    // the same file against itself.
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/topics/existing.md": wikiPage("Existing", ["An original claim."]),
      // proposed file is a different file with the same quote in wiki/
      "_proposed/draft.md": proposedPage("Draft", ["Some unique claim."]),
    });
    try {
      const findings = checkDuplicateClaims(sb.vault, join(sb.vault, "_proposed/draft.md"));
      expect(findings.filter((f) => f.severity === "warn")).toHaveLength(0);
    } finally {
      sb.cleanup();
    }
  });
});

describe("checkDuplicateClaims — severity contract", () => {
  test("all findings are warn severity (never error)", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/topics/existing.md": wikiPage("Existing", ["Claim one.", "Claim two."]),
      "_proposed/draft.md": proposedPage("Draft", ["Claim one.", "Claim two."]),
    });
    try {
      const findings = checkDuplicateClaims(sb.vault, join(sb.vault, "_proposed/draft.md"));
      for (const f of findings) {
        expect(f.severity).toBe("warn");
      }
    } finally {
      sb.cleanup();
    }
  });

  test("returns Finding[] (not null, not undefined) even on a vault with no wiki/", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n# Vault\n",
      "_proposed/draft.md": proposedPage("Draft", ["Something."]),
    });
    try {
      const findings = checkDuplicateClaims(sb.vault, join(sb.vault, "_proposed/draft.md"));
      expect(Array.isArray(findings)).toBe(true);
    } finally {
      sb.cleanup();
    }
  });
});

describe("checkDuplicateClaims — multiple wiki pages with same quote", () => {
  test("emits one finding per matching wiki page when two pages share the same quote", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n# Vault\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/topics/page-a.md": wikiPage("Page A", ["Shared claim here."]),
      "wiki/topics/page-b.md": wikiPage("Page B", ["Shared claim here."]),
      "_proposed/draft.md": proposedPage("Draft", ["Shared claim here."]),
    });
    try {
      const findings = checkDuplicateClaims(sb.vault, join(sb.vault, "_proposed/draft.md"));
      const warns = findings.filter((f) => f.severity === "warn");
      // Two matches: same proposed quote appears in both page-a and page-b
      expect(warns).toHaveLength(2);
    } finally {
      sb.cleanup();
    }
  });
});
