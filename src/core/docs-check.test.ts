/**
 * TDD — failing first (RED) for lint --check docs.
 *
 * Tests `checkDocs(repoRoot: string, opts?: DocsCheckOptions): readonly Finding[]`
 * from ./docs-check.ts.
 *
 * Mirrors the checks enforced by scripts/validate-docs.sh (Checks 0–4 only;
 * Check 5 design-drift is not ported — see tmp/migration-plan.md item 9).
 *
 * Check 0  — banned strings (retired glossary terms) do not appear outside exemptions.
 * Check 0b — retired skill name `llm-wiki` (backtick-wrapped or /claude-wiki-pages: form).
 * Check 1  — SEO-register terms do not leak into technical surfaces.
 * Check 2  — Layer references are capitalized ("Layer 1", not "layer 1").
 * Check 3  — Slash commands in markdown carry the /claude-wiki-pages: namespace prefix.
 * Check 4  — Every /claude-wiki-pages:<name> reference resolves to a real skill/agent/command.
 *
 * The fixture corpus lives at tests/fixtures/docs-check-corpus/ and is built by
 * makeDocCorpus() in this file (makeVault-style sandbox).
 */

import { test, expect, describe } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { checkDocs } from "./docs-check.ts";
import type { DocsCheckOptions } from "./docs-check.ts";
import type { Finding } from "./report.ts";
import { makeMemoryRepoIO } from "./repo-io.ts";

// ── Sandbox helper ────────────────────────────────────────────────────────────

interface DocsSandbox {
  readonly root: string;
  cleanup(): void;
}

/**
 * Materialise a flat set of files under a tmp dir, creating parent dirs as needed.
 * Returns the root and a cleanup function.
 */
function makeDocCorpus(files: Record<string, string>): DocsSandbox {
  const root = mkdtempSync(join(tmpdir(), "cwp-docs-check-test-"));
  for (const [rel, content] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

/**
 * Build a corpus with an explicit skill directory tree.
 * opts.extraFiles are layered on top of the base skill stubs.
 */
function makeRepoWithSkills(
  extraFiles: Record<string, string> = {},
  skills: string[] = ["search", "query", "init", "lint", "ingest"],
): DocsSandbox {
  const base: Record<string, string> = {};
  for (const skill of skills) {
    base[`skills/${skill}/SKILL.md`] = `---\ntitle: ${skill}\n---\n# ${skill}\n`;
  }
  for (const [k, v] of Object.entries(extraFiles)) {
    base[k] = v;
  }
  return makeDocCorpus(base);
}

// ── Check 0: banned strings ───────────────────────────────────────────────────

describe("Feature: Glossary gate › docs check — Check 0: banned strings", () => {
  test("clean repo with no banned strings yields zero findings", () => {
    const sb = makeDocCorpus({
      "docs/intro.md": "# Introduction\n\nThis is a clean document.\n",
    });
    const findings = checkDocs(sb.root);
    const banFindings = findings.filter((f) => f.check === "docs-check-banned");
    expect(banFindings).toHaveLength(0);
    sb.cleanup();
  });

  test("file containing 'second-brain' yields a banned-string finding", () => {
    const sb = makeDocCorpus({
      "docs/bad.md": "# Intro\n\nThis is a second-brain approach.\n",
    });
    const findings = checkDocs(sb.root);
    const banFindings = findings.filter((f) => f.check === "docs-check-banned");
    expect(banFindings.length).toBeGreaterThanOrEqual(1);
    expect(banFindings[0]?.severity).toBe("error");
    sb.cleanup();
  });

  test("file containing 'second brain' (without hyphen) yields a banned-string finding", () => {
    const sb = makeDocCorpus({
      "docs/bad.md": "This uses a second brain concept.\n",
    });
    const findings = checkDocs(sb.root);
    const banFindings = findings.filter((f) => f.check === "docs-check-banned");
    expect(banFindings.length).toBeGreaterThanOrEqual(1);
    sb.cleanup();
  });

  test("file containing 'vault-synthesize' yields a banned-string finding", () => {
    const sb = makeDocCorpus({
      "docs/bad.md": "Use vault-synthesize to create pages.\n",
    });
    const findings = checkDocs(sb.root);
    const banFindings = findings.filter((f) => f.check === "docs-check-banned");
    expect(banFindings.length).toBeGreaterThanOrEqual(1);
    sb.cleanup();
  });

  test("file containing 'llm-wiki-stack' yields a banned-string finding", () => {
    const sb = makeDocCorpus({
      "docs/bad.md": "The llm-wiki-stack was renamed.\n",
    });
    const findings = checkDocs(sb.root);
    const banFindings = findings.filter((f) => f.check === "docs-check-banned");
    expect(banFindings.length).toBeGreaterThanOrEqual(1);
    sb.cleanup();
  });

  test("CHANGELOG.md with banned string is exempt", () => {
    const sb = makeDocCorpus({
      "CHANGELOG.md":
        "## 1.0.0\n\n- Renamed from llm-wiki-stack to claude-wiki-pages.\n- Retired second-brain term.\n",
    });
    const findings = checkDocs(sb.root);
    const banFindings = findings.filter((f) => f.check === "docs-check-banned");
    expect(banFindings).toHaveLength(0);
    sb.cleanup();
  });

  test("docs/GLOSSARY.md with banned string is exempt", () => {
    const sb = makeDocCorpus({
      "docs/GLOSSARY.md": "# Glossary\n\n**second-brain** — retired term; use wiki instead.\n",
    });
    const findings = checkDocs(sb.root);
    const banFindings = findings.filter((f) => f.check === "docs-check-banned");
    expect(banFindings).toHaveLength(0);
    sb.cleanup();
  });

  test("docs/adr/ files with banned strings are exempt", () => {
    const sb = makeDocCorpus({
      "docs/adr/ADR-0001.md": "# ADR-0001\n\nPreviously used llm-wiki-stack.\n",
    });
    const findings = checkDocs(sb.root);
    const banFindings = findings.filter((f) => f.check === "docs-check-banned");
    expect(banFindings).toHaveLength(0);
    sb.cleanup();
  });

  test("tests/ files with banned strings are exempt", () => {
    const sb = makeDocCorpus({
      "tests/some-test.md": "# Test\n\nThis tests second-brain detection.\n",
    });
    const findings = checkDocs(sb.root);
    const banFindings = findings.filter((f) => f.check === "docs-check-banned");
    expect(banFindings).toHaveLength(0);
    sb.cleanup();
  });

  test("scripts/validate-docs.sh with banned strings is exempt", () => {
    const sb = makeDocCorpus({
      "scripts/validate-docs.sh":
        "#!/bin/bash\n# Checks for second-brain etc.\necho 'llm-wiki-stack'\n",
    });
    const findings = checkDocs(sb.root);
    const banFindings = findings.filter((f) => f.check === "docs-check-banned");
    expect(banFindings).toHaveLength(0);
    sb.cleanup();
  });

  test("each banned variant triggers independently", () => {
    const variants = [
      "vault-index",
      "llm-wiki-ingest",
      "llm-wiki-query",
      "llm-wiki-lint",
      "llm-wiki-fix",
      "llm-wiki-status",
    ];
    for (const term of variants) {
      const sb = makeDocCorpus({
        "docs/check.md": `Using ${term} here.\n`,
      });
      const findings = checkDocs(sb.root);
      const banFindings = findings.filter((f) => f.check === "docs-check-banned");
      expect(banFindings.length).toBeGreaterThanOrEqual(1);
      sb.cleanup();
    }
  });
});

// ── Check 0b: retired skill name llm-wiki ────────────────────────────────────

describe("Feature: Glossary gate › docs check — Check 0b: retired skill name llm-wiki", () => {
  test("clean file with no retired skill references yields zero findings", () => {
    const sb = makeDocCorpus({
      "docs/page.md": "# Page\n\nUse the `init` skill.\n",
    });
    const findings = checkDocs(sb.root);
    const retiredFindings = findings.filter((f) => f.check === "docs-check-retired-skill");
    expect(retiredFindings).toHaveLength(0);
    sb.cleanup();
  });

  test("backtick-wrapped `llm-wiki` in markdown yields a retired-skill finding", () => {
    const sb = makeDocCorpus({
      "docs/page.md": "# Page\n\nRun `llm-wiki` to initialize.\n",
    });
    const findings = checkDocs(sb.root);
    const retiredFindings = findings.filter((f) => f.check === "docs-check-retired-skill");
    expect(retiredFindings.length).toBeGreaterThanOrEqual(1);
    expect(retiredFindings[0]?.severity).toBe("error");
    sb.cleanup();
  });

  test("/claude-wiki-pages:llm-wiki reference yields a retired-skill finding", () => {
    const sb = makeDocCorpus({
      "docs/page.md": "# Page\n\nSee `/claude-wiki-pages:llm-wiki` for more info.\n",
    });
    const findings = checkDocs(sb.root);
    const retiredFindings = findings.filter((f) => f.check === "docs-check-retired-skill");
    expect(retiredFindings.length).toBeGreaterThanOrEqual(1);
    sb.cleanup();
  });

  test("`llm-wiki-pattern` does NOT trigger the retired-skill check", () => {
    // The Karpathy llm-wiki-pattern is a kept concept
    const sb = makeDocCorpus({
      "docs/page.md": "# Page\n\nFollowing the llm-wiki-pattern approach.\n",
    });
    const findings = checkDocs(sb.root);
    const retiredFindings = findings.filter((f) => f.check === "docs-check-retired-skill");
    expect(retiredFindings).toHaveLength(0);
    sb.cleanup();
  });

  test("CHANGELOG.md with `llm-wiki` is exempt from retired-skill check", () => {
    const sb = makeDocCorpus({
      "CHANGELOG.md": "## 1.0.0\n\nRenamed `llm-wiki` to `init`.\n",
    });
    const findings = checkDocs(sb.root);
    const retiredFindings = findings.filter((f) => f.check === "docs-check-retired-skill");
    expect(retiredFindings).toHaveLength(0);
    sb.cleanup();
  });

  test("docs/adr/ files with `llm-wiki` are exempt from retired-skill check", () => {
    const sb = makeDocCorpus({
      "docs/adr/ADR-0002.md": "# ADR-0002\n\nPreviously `llm-wiki` was used.\n",
    });
    const findings = checkDocs(sb.root);
    const retiredFindings = findings.filter((f) => f.check === "docs-check-retired-skill");
    expect(retiredFindings).toHaveLength(0);
    sb.cleanup();
  });
});

// ── Check 1: SEO-register leaks ───────────────────────────────────────────────

describe("Feature: Glossary gate › docs check — Check 1: SEO-register leaks", () => {
  test("clean technical doc with no SEO terms yields zero findings", () => {
    const sb = makeDocCorpus({
      "docs/tech.md": "# Architecture\n\nThe four-layer stack is described here.\n",
    });
    const findings = checkDocs(sb.root);
    const seoFindings = findings.filter((f) => f.check === "docs-check-seo");
    expect(seoFindings).toHaveLength(0);
    sb.cleanup();
  });

  test("'knowledge management' in technical doc yields an SEO finding", () => {
    const sb = makeDocCorpus({
      "docs/tech.md": "# Tech\n\nThis is a knowledge management system.\n",
    });
    const findings = checkDocs(sb.root);
    const seoFindings = findings.filter((f) => f.check === "docs-check-seo");
    expect(seoFindings.length).toBeGreaterThanOrEqual(1);
    expect(seoFindings[0]?.severity).toBe("error");
    sb.cleanup();
  });

  test("'knowledge base' in technical doc yields an SEO finding", () => {
    const sb = makeDocCorpus({
      "docs/tech.md": "# Tech\n\nThis is a knowledge base.\n",
    });
    const findings = checkDocs(sb.root);
    const seoFindings = findings.filter((f) => f.check === "docs-check-seo");
    expect(seoFindings.length).toBeGreaterThanOrEqual(1);
    sb.cleanup();
  });

  test("'agent harness' in technical doc yields an SEO finding", () => {
    const sb = makeDocCorpus({
      "docs/tech.md": "The agent harness powers this.\n",
    });
    const findings = checkDocs(sb.root);
    const seoFindings = findings.filter((f) => f.check === "docs-check-seo");
    expect(seoFindings.length).toBeGreaterThanOrEqual(1);
    sb.cleanup();
  });

  test("'LLM Wiki Stack' in technical doc yields an SEO finding", () => {
    const sb = makeDocCorpus({
      "docs/tech.md": "The LLM Wiki Stack is deprecated.\n",
    });
    const findings = checkDocs(sb.root);
    const seoFindings = findings.filter((f) => f.check === "docs-check-seo");
    expect(seoFindings.length).toBeGreaterThanOrEqual(1);
    sb.cleanup();
  });

  test("'raw material' in technical doc yields an SEO finding", () => {
    const sb = makeDocCorpus({
      "docs/tech.md": "Source raw material for processing.\n",
    });
    const findings = checkDocs(sb.root);
    const seoFindings = findings.filter((f) => f.check === "docs-check-seo");
    expect(seoFindings.length).toBeGreaterThanOrEqual(1);
    sb.cleanup();
  });

  test("README.md with SEO terms is exempt", () => {
    const sb = makeDocCorpus({
      "README.md": "# claude-wiki-pages\n\nA knowledge management plugin for Claude Code.\n",
    });
    const findings = checkDocs(sb.root);
    const seoFindings = findings.filter((f) => f.check === "docs-check-seo");
    expect(seoFindings).toHaveLength(0);
    sb.cleanup();
  });

  test("docs/GLOSSARY.md with SEO terms is exempt", () => {
    const sb = makeDocCorpus({
      "docs/GLOSSARY.md":
        "**knowledge management** — SEO surface term; use 'wiki' in technical prose.\n",
    });
    const findings = checkDocs(sb.root);
    const seoFindings = findings.filter((f) => f.check === "docs-check-seo");
    expect(seoFindings).toHaveLength(0);
    sb.cleanup();
  });

  test("scripts/validate-docs.sh with SEO terms is exempt", () => {
    const sb = makeDocCorpus({
      "scripts/validate-docs.sh": "#!/bin/bash\nSEO_LEAK='\\bknowledge management\\b'\n",
    });
    const findings = checkDocs(sb.root);
    const seoFindings = findings.filter((f) => f.check === "docs-check-seo");
    expect(seoFindings).toHaveLength(0);
    sb.cleanup();
  });

  test("raw/ files within scanned paths are exempt from SEO check", () => {
    const sb = makeDocCorpus({
      "wiki/raw/external-source.md":
        "This raw material is from an external knowledge management system.\n",
    });
    const findings = checkDocs(sb.root);
    const seoFindings = findings.filter((f) => f.check === "docs-check-seo");
    expect(seoFindings).toHaveLength(0);
    sb.cleanup();
  });
});

// ── Check 2: layer capitalization ─────────────────────────────────────────────

describe("Feature: Glossary gate › docs check — Check 2: layer capitalization", () => {
  test("correct capitalization 'Layer 1' yields no finding", () => {
    const sb = makeDocCorpus({
      "docs/arch.md": "# Architecture\n\nLayer 1 is the Data layer.\n",
    });
    const findings = checkDocs(sb.root);
    const layerFindings = findings.filter((f) => f.check === "docs-check-layer-cap");
    expect(layerFindings).toHaveLength(0);
    sb.cleanup();
  });

  test("lowercase 'layer 1' yields a layer-capitalization finding", () => {
    const sb = makeDocCorpus({
      "docs/bad.md": "# Architecture\n\nThis is layer 1 of the stack.\n",
    });
    const findings = checkDocs(sb.root);
    const layerFindings = findings.filter((f) => f.check === "docs-check-layer-cap");
    expect(layerFindings.length).toBeGreaterThanOrEqual(1);
    expect(layerFindings[0]?.severity).toBe("error");
    sb.cleanup();
  });

  test("lowercase 'layer 4' yields a layer-capitalization finding", () => {
    const sb = makeDocCorpus({
      "docs/bad.md": "Orchestration lives in layer 4.\n",
    });
    const findings = checkDocs(sb.root);
    const layerFindings = findings.filter((f) => f.check === "docs-check-layer-cap");
    expect(layerFindings.length).toBeGreaterThanOrEqual(1);
    sb.cleanup();
  });

  test("'data layer' (lowercase) yields a layer-capitalization finding", () => {
    const sb = makeDocCorpus({
      "docs/bad.md": "The data layer holds raw content.\n",
    });
    const findings = checkDocs(sb.root);
    const layerFindings = findings.filter((f) => f.check === "docs-check-layer-cap");
    expect(layerFindings.length).toBeGreaterThanOrEqual(1);
    sb.cleanup();
  });

  test("'skills layer' (lowercase) yields a layer-capitalization finding", () => {
    const sb = makeDocCorpus({
      "docs/bad.md": "The skills layer provides capabilities.\n",
    });
    const findings = checkDocs(sb.root);
    const layerFindings = findings.filter((f) => f.check === "docs-check-layer-cap");
    expect(layerFindings.length).toBeGreaterThanOrEqual(1);
    sb.cleanup();
  });

  test("'Data layer' (Title Case) does NOT yield a finding", () => {
    // "Data layer" with capital D is acceptable; "Data Layer" also fine
    const sb = makeDocCorpus({
      "docs/ok.md": "The Data layer is Layer 1.\n",
    });
    const findings = checkDocs(sb.root);
    // "data layer" (all lowercase) is a violation; "Data layer" is Title Case — no violation
    const layerFindings = findings.filter(
      (f) => f.check === "docs-check-layer-cap" && (f.file ?? "").includes("ok.md"),
    );
    expect(layerFindings).toHaveLength(0);
    sb.cleanup();
  });

  test("layer-cap check only scans .md files", () => {
    const sb = makeDocCorpus({
      "scripts/setup.sh": "#!/bin/bash\n# Setup layer 1\necho 'data layer'\n",
    });
    const findings = checkDocs(sb.root);
    const layerFindings = findings.filter((f) => f.check === "docs-check-layer-cap");
    expect(layerFindings).toHaveLength(0);
    sb.cleanup();
  });

  test("docs/adr/ files are exempt from layer-cap check", () => {
    const sb = makeDocCorpus({
      "docs/adr/ADR-0001.md": "# ADR\n\nPreviously called layer 1.\n",
    });
    const findings = checkDocs(sb.root);
    const layerFindings = findings.filter((f) => f.check === "docs-check-layer-cap");
    expect(layerFindings).toHaveLength(0);
    sb.cleanup();
  });
});

// ── Check 3: bare slash commands ─────────────────────────────────────────────

describe("Feature: Glossary gate › docs check — Check 3: bare slash commands (missing namespace)", () => {
  test("properly-namespaced command yields no finding", () => {
    const sb = makeDocCorpus({
      "docs/usage.md": "# Usage\n\nRun `/claude-wiki-pages:wiki` to start.\n",
    });
    const findings = checkDocs(sb.root);
    const bareFindings = findings.filter((f) => f.check === "docs-check-bare-slash");
    expect(bareFindings).toHaveLength(0);
    sb.cleanup();
  });

  test("backtick-wrapped bare `/wiki` command yields a bare-slash finding", () => {
    const sb = makeDocCorpus({
      "docs/usage.md": "# Usage\n\nRun `/wiki` to start.\n",
    });
    const findings = checkDocs(sb.root);
    const bareFindings = findings.filter((f) => f.check === "docs-check-bare-slash");
    expect(bareFindings.length).toBeGreaterThanOrEqual(1);
    expect(bareFindings[0]?.severity).toBe("error");
    sb.cleanup();
  });

  test("backtick-wrapped bare `/ingest` yields a bare-slash finding", () => {
    const sb = makeDocCorpus({
      "docs/usage.md": "Run `/ingest` to add content.\n",
    });
    const findings = checkDocs(sb.root);
    const bareFindings = findings.filter((f) => f.check === "docs-check-bare-slash");
    expect(bareFindings.length).toBeGreaterThanOrEqual(1);
    sb.cleanup();
  });

  test("backtick-wrapped bare `/doctor` yields a bare-slash finding", () => {
    const sb = makeDocCorpus({
      "docs/usage.md": "Check with `/doctor` for health.\n",
    });
    const findings = checkDocs(sb.root);
    const bareFindings = findings.filter((f) => f.check === "docs-check-bare-slash");
    expect(bareFindings.length).toBeGreaterThanOrEqual(1);
    sb.cleanup();
  });

  test("file-path mention skills/obsidian-cli/ does NOT trigger bare-slash check", () => {
    // File paths are not slash commands; only backtick-wrapped /name patterns
    const sb = makeDocCorpus({
      "docs/usage.md": "The skill is at skills/obsidian-cli/SKILL.md.\n",
    });
    const findings = checkDocs(sb.root);
    const bareFindings = findings.filter((f) => f.check === "docs-check-bare-slash");
    expect(bareFindings).toHaveLength(0);
    sb.cleanup();
  });

  test("docs/adr/ files are exempt from bare-slash check", () => {
    const sb = makeDocCorpus({
      "docs/adr/ADR-0001.md": "# ADR\n\nPreviously `/wiki` was the command.\n",
    });
    const findings = checkDocs(sb.root);
    const bareFindings = findings.filter((f) => f.check === "docs-check-bare-slash");
    expect(bareFindings).toHaveLength(0);
    sb.cleanup();
  });

  test("tests/ files are exempt from bare-slash check", () => {
    const sb = makeDocCorpus({
      "tests/test.md": "# Test\n\nRun `/doctor` to check.\n",
    });
    const findings = checkDocs(sb.root);
    const bareFindings = findings.filter((f) => f.check === "docs-check-bare-slash");
    expect(bareFindings).toHaveLength(0);
    sb.cleanup();
  });
});

// ── Check 4: slash-command resolution ────────────────────────────────────────

describe("Feature: Glossary gate › docs check — Check 4: slash-command references resolve", () => {
  test("reference to existing skill resolves cleanly", () => {
    const sb = makeRepoWithSkills(
      { "docs/page.md": "# Page\n\nUse `/claude-wiki-pages:search` here.\n" },
      ["search"],
    );
    const findings = checkDocs(sb.root);
    const resolveFindings = findings.filter((f) => f.check === "docs-check-resolve");
    expect(resolveFindings).toHaveLength(0);
    sb.cleanup();
  });

  test("reference to non-existent skill yields a resolve finding", () => {
    const sb = makeDocCorpus({
      "docs/page.md": "# Page\n\nUse `/claude-wiki-pages:nonexistent-skill` here.\n",
    });
    const findings = checkDocs(sb.root);
    const resolveFindings = findings.filter((f) => f.check === "docs-check-resolve");
    expect(resolveFindings.length).toBeGreaterThanOrEqual(1);
    expect(resolveFindings[0]?.severity).toBe("error");
    sb.cleanup();
  });

  test("reference to existing agent file resolves cleanly", () => {
    const sb = makeDocCorpus({
      "agents/claude-wiki-pages-orchestrator-agent.md": "---\ntitle: orchestrator\n---\n",
      "docs/page.md": "Use `/claude-wiki-pages:claude-wiki-pages-orchestrator-agent` here.\n",
    });
    const findings = checkDocs(sb.root);
    const resolveFindings = findings.filter((f) => f.check === "docs-check-resolve");
    expect(resolveFindings).toHaveLength(0);
    sb.cleanup();
  });

  test("reference to existing command file resolves cleanly", () => {
    const sb = makeDocCorpus({
      "commands/wiki.md": "# wiki command\n",
      "docs/page.md": "Use `/claude-wiki-pages:wiki` here.\n",
    });
    const findings = checkDocs(sb.root);
    const resolveFindings = findings.filter((f) => f.check === "docs-check-resolve");
    expect(resolveFindings).toHaveLength(0);
    sb.cleanup();
  });

  test("multiple unresolved references each yield a finding", () => {
    const sb = makeDocCorpus({
      "docs/page.md":
        "# Page\n\nUse `/claude-wiki-pages:ghost-a` and `/claude-wiki-pages:ghost-b`.\n",
    });
    const findings = checkDocs(sb.root);
    const resolveFindings = findings.filter((f) => f.check === "docs-check-resolve");
    expect(resolveFindings.length).toBeGreaterThanOrEqual(2);
    sb.cleanup();
  });

  test("same unresolved reference in multiple files yields one finding per unique name", () => {
    const sb = makeDocCorpus({
      "docs/page-a.md": "Use `/claude-wiki-pages:ghost-skill`.\n",
      "docs/page-b.md": "Also `/claude-wiki-pages:ghost-skill`.\n",
    });
    const findings = checkDocs(sb.root);
    const resolveFindings = findings.filter(
      (f) => f.check === "docs-check-resolve" && f.message.includes("ghost-skill"),
    );
    // Should be one finding for the unique unresolved name (not two — dedup by name)
    expect(resolveFindings).toHaveLength(1);
    sb.cleanup();
  });

  test("no /claude-wiki-pages: references in files yields zero resolve findings", () => {
    const sb = makeDocCorpus({
      "docs/page.md": "# Page\n\nNo commands referenced here.\n",
    });
    const findings = checkDocs(sb.root);
    const resolveFindings = findings.filter((f) => f.check === "docs-check-resolve");
    expect(resolveFindings).toHaveLength(0);
    sb.cleanup();
  });
});

// ── Determinism and output contract ──────────────────────────────────────────

describe("Feature: Glossary gate › docs check — determinism and output contract", () => {
  test("identical calls produce identical output", () => {
    const sb = makeDocCorpus({
      "docs/bad.md": "The second-brain approach with layer 1 concepts.\n",
    });
    const run1 = checkDocs(sb.root);
    const run2 = checkDocs(sb.root);
    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
    sb.cleanup();
  });

  test("findings carry file and check fields", () => {
    const sb = makeDocCorpus({
      "docs/bad.md": "Using second-brain here.\n",
    });
    const findings = checkDocs(sb.root);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    for (const f of findings) {
      expect(f.check).toBeTruthy();
      expect(f.severity).toMatch(/^(error|warn|info)$/);
    }
    sb.cleanup();
  });

  test("empty repo yields zero findings", () => {
    const sb = makeDocCorpus({});
    const findings = checkDocs(sb.root);
    expect(findings).toHaveLength(0);
    sb.cleanup();
  });

  test("returns a frozen (readonly) array", () => {
    const sb = makeDocCorpus({
      "docs/clean.md": "# Clean\n\nNo issues here.\n",
    });
    const findings = checkDocs(sb.root);
    expect(() => {
      // Attempting to push on a frozen array throws in strict mode
      (findings as Finding[]).push({
        severity: "error",
        check: "test",
        message: "test",
      });
    }).toThrow();
    sb.cleanup();
  });

  test("opts.onlyChecks limits which checks run", () => {
    // A file with both a banned string and a layer-cap violation:
    const sb = makeDocCorpus({
      "docs/bad.md": "The second-brain approach with layer 1 concepts.\n",
    });
    const opts: DocsCheckOptions = { onlyChecks: ["layer-cap"] };
    const findings = checkDocs(sb.root, opts);
    // Only layer-cap should appear; banned-string findings should be absent
    const banFindings = findings.filter((f) => f.check === "docs-check-banned");
    const layerFindings = findings.filter((f) => f.check === "docs-check-layer-cap");
    expect(banFindings).toHaveLength(0);
    expect(layerFindings.length).toBeGreaterThanOrEqual(1);
    sb.cleanup();
  });

  test("opts.extensions can restrict file types scanned", () => {
    // Default scans .md; adding .sh means shell scripts are also checked
    const sb = makeDocCorpus({
      "docs/ok.md": "# Clean\n",
      "scripts/bad.sh": "#!/bin/bash\n# second-brain\n",
    });
    // Without extension override (default = md+json+sh+yml), sh files ARE scanned
    const findings = checkDocs(sb.root);
    // scripts/validate-docs.sh is exempt, but scripts/bad.sh is not
    // (validate-docs.sh is not present here — check it fires on bad.sh)
    const banFindings = findings.filter(
      (f) => f.check === "docs-check-banned" && (f.file ?? "").includes("bad.sh"),
    );
    expect(banFindings.length).toBeGreaterThanOrEqual(1);
    sb.cleanup();
  });

  test("does not touch files outside the repo root", () => {
    // Sanity: the function should never throw on a real (empty) tmp dir
    const root = mkdtempSync(join(tmpdir(), "cwp-empty-"));
    let threw = false;
    try {
      checkDocs(root);
    } catch {
      threw = true;
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
    expect(threw).toBe(false);
  });
});

// ── Multi-violation files ─────────────────────────────────────────────────────

describe("Feature: Glossary gate › docs check — multi-violation files", () => {
  test("file with banned string + SEO term yields findings for both", () => {
    const sb = makeDocCorpus({
      "docs/multi.md": "The second-brain is a knowledge management concept.\n",
    });
    const findings = checkDocs(sb.root);
    const banFindings = findings.filter((f) => f.check === "docs-check-banned");
    const seoFindings = findings.filter((f) => f.check === "docs-check-seo");
    expect(banFindings.length).toBeGreaterThanOrEqual(1);
    expect(seoFindings.length).toBeGreaterThanOrEqual(1);
    sb.cleanup();
  });

  test("file with layer-cap + bare-slash yields findings for both", () => {
    const sb = makeDocCorpus({
      "docs/multi.md": "Use `/wiki` in layer 1.\n",
    });
    const findings = checkDocs(sb.root);
    const layerFindings = findings.filter((f) => f.check === "docs-check-layer-cap");
    const bareFindings = findings.filter((f) => f.check === "docs-check-bare-slash");
    expect(layerFindings.length).toBeGreaterThanOrEqual(1);
    expect(bareFindings.length).toBeGreaterThanOrEqual(1);
    sb.cleanup();
  });
});

// ── Checked-in fixture corpus integration tests ───────────────────────────────

describe("Feature: Glossary gate › docs check — fixture corpus (tests/fixtures/docs-check-corpus)", () => {
  // Path relative to worktree root; join with import.meta.dir to get absolute path.
  const CORPUS_ROOT = join(dirname(dirname(import.meta.dir)), "tests/fixtures/docs-check-corpus");

  test("corpus root exists", () => {
    expect(existsSync(CORPUS_ROOT)).toBe(true);
  });

  test("dirty/banned-string.md produces a docs-check-banned finding", () => {
    const findings = checkDocs(CORPUS_ROOT, { onlyChecks: ["banned"] });
    const hit = findings.find(
      (f) => f.check === "docs-check-banned" && (f.file ?? "").includes("banned-string.md"),
    );
    expect(hit).toBeDefined();
    expect(hit?.severity).toBe("error");
  });

  test("dirty/retired-skill.md produces a docs-check-retired-skill finding", () => {
    const findings = checkDocs(CORPUS_ROOT, { onlyChecks: ["retired-skill"] });
    const hit = findings.find(
      (f) => f.check === "docs-check-retired-skill" && (f.file ?? "").includes("retired-skill.md"),
    );
    expect(hit).toBeDefined();
    expect(hit?.severity).toBe("error");
  });

  test("dirty/seo-leak.md produces a docs-check-seo finding", () => {
    const findings = checkDocs(CORPUS_ROOT, { onlyChecks: ["seo"] });
    const hit = findings.find(
      (f) => f.check === "docs-check-seo" && (f.file ?? "").includes("seo-leak.md"),
    );
    expect(hit).toBeDefined();
    expect(hit?.severity).toBe("error");
  });

  test("dirty/layer-cap.md produces a docs-check-layer-cap finding", () => {
    const findings = checkDocs(CORPUS_ROOT, { onlyChecks: ["layer-cap"] });
    const hit = findings.find(
      (f) => f.check === "docs-check-layer-cap" && (f.file ?? "").includes("layer-cap.md"),
    );
    expect(hit).toBeDefined();
    expect(hit?.severity).toBe("error");
  });

  test("dirty/bare-slash.md produces a docs-check-bare-slash finding", () => {
    const findings = checkDocs(CORPUS_ROOT, { onlyChecks: ["bare-slash"] });
    const hit = findings.find(
      (f) => f.check === "docs-check-bare-slash" && (f.file ?? "").includes("bare-slash.md"),
    );
    expect(hit).toBeDefined();
    expect(hit?.severity).toBe("error");
  });

  test("dirty/unresolved-ref.md produces a docs-check-resolve finding", () => {
    const findings = checkDocs(CORPUS_ROOT, { onlyChecks: ["resolve"] });
    const hit = findings.find(
      (f) => f.check === "docs-check-resolve" && f.message.includes("nonexistent-skill"),
    );
    expect(hit).toBeDefined();
    expect(hit?.severity).toBe("error");
  });

  test("clean/architecture.md produces zero findings", () => {
    // The clean file references properly-namespaced commands that resolve to
    // skills/init/ and commands/wiki.md which exist in the corpus.
    const findings = checkDocs(CORPUS_ROOT);
    const cleanFindings = findings.filter((f) => (f.file ?? "").includes("architecture.md"));
    expect(cleanFindings).toHaveLength(0);
  });

  test("CHANGELOG.md (root-level) produces zero findings for banned/retired-skill checks", () => {
    // Root-level CHANGELOG.md is on the BAN_EXEMPT list and must not produce banned or retired-skill findings
    const findings = checkDocs(CORPUS_ROOT, { onlyChecks: ["banned", "retired-skill"] });
    const changelogFindings = findings.filter(
      (f) =>
        f.file === "CHANGELOG.md" &&
        (f.check === "docs-check-banned" || f.check === "docs-check-retired-skill"),
    );
    expect(changelogFindings).toHaveLength(0);
  });
});

// ── RepoIO seam: git-tracked scope + Check 5 dispatch ─────────────────────────

describe("Feature: Glossary gate › docs check — RepoIO seam (git-tracked scope)", () => {
  test("with a RepoIO, checks 0–4 scan ONLY tracked files (untracked files skipped)", () => {
    // banned.md exists on disk but is NOT in the tracked set → must NOT be flagged.
    const files = {
      "docs/clean.md": "# Clean\n",
      "docs/banned.md": "# Bad\n\nThis is a second-brain note.\n",
    };
    const sb = makeDocCorpus(files);
    const io = makeMemoryRepoIO({ root: sb.root, files, tracked: ["docs/clean.md"] });
    const findings = checkDocs(sb.root, { io, onlyChecks: ["banned"] });
    expect(findings.filter((f) => f.check === "docs-check-banned")).toHaveLength(0);
    sb.cleanup();
  });

  test("with a RepoIO, a banned string IN a tracked file is still flagged", () => {
    const files = { "docs/banned.md": "# Bad\n\nThis is a second-brain note.\n" };
    const sb = makeDocCorpus(files);
    const io = makeMemoryRepoIO({ root: sb.root, files, tracked: ["docs/banned.md"] });
    const findings = checkDocs(sb.root, { io, onlyChecks: ["banned"] });
    expect(findings.filter((f) => f.check === "docs-check-banned").length).toBeGreaterThanOrEqual(
      1,
    );
    sb.cleanup();
  });

  test("without a RepoIO, the design-drift (Check 5) family does not run", () => {
    const sb = makeDocCorpus({ "hooks/hooks.json": "{}\n" });
    const findings = checkDocs(sb.root);
    expect(findings.filter((f) => f.check.startsWith("docs-check-design-drift"))).toHaveLength(0);
    sb.cleanup();
  });

  test("with a RepoIO but no tracked hooks/hooks.json, Check 5 is gated off", () => {
    const files = { "docs/design/01-system-context.md": "# Context\n" };
    const sb = makeDocCorpus(files);
    const io = makeMemoryRepoIO({ root: sb.root, files, tracked: Object.keys(files) });
    const findings = checkDocs(sb.root, { io });
    expect(findings.filter((f) => f.check.startsWith("docs-check-design-drift"))).toHaveLength(0);
    sb.cleanup();
  });
});
