import { test, expect, describe } from "bun:test";
import { context, type ContextReport } from "./context.ts";
import { makeVault } from "../../test-helpers/sandbox/vault.ts";

// ── Minimal vault fixture ──────────────────────────────────────────────────────

const MINIMAL_VAULT = {
  "CLAUDE.md": "---\nschema_version: 2\n---\n# Vault\n",
  "_vocabulary.md": "---\ntitle: Vault Vocabulary\ngroups: []\n---\n",
  "wiki/index.md": "---\ntitle: index\ntype: index\n---\n",
  "wiki/log.md": "---\ntitle: log\n---\n",
  "wiki/topics/topics.md": "---\ntitle: Topics\ntype: index\n---\n",
  "wiki/topics/ai.md": "---\ntitle: AI\ntype: concept\n---\nBody.\n",
  "wiki/topics/ml.md": "---\ntitle: Machine Learning\ntype: concept\n---\nBody.\n",
  "wiki/_sources/src-a.md": "---\ntitle: Source A\ntype: source\n---\n",
  "wiki/_sources/src-b.md": "---\ntitle: Source B\ntype: source\n---\n",
  "raw/note-a.md": "---\ntitle: Note A\n---\nRaw content.\n",
  "raw/note-b.md": "---\ntitle: Note B\n---\nRaw content.\n",
};

// ── Basic command tests ────────────────────────────────────────────────────────

describe("Feature: Engine › context verb", () => {
  test("command field is 'context'", () => {
    const sb = makeVault(MINIMAL_VAULT);
    const r = context({ target: sb.vault });
    expect(r.command).toBe("context");
    sb.cleanup();
  });

  test("vault field matches resolved vault path", () => {
    const sb = makeVault(MINIMAL_VAULT);
    const r = context({ target: sb.vault });
    expect(r.vault).toBe(sb.vault);
    sb.cleanup();
  });

  test("layers field is present and has all five layer keys", () => {
    const sb = makeVault(MINIMAL_VAULT);
    const r = context({ target: sb.vault });
    expect(r.layers).toBeDefined();
    expect(r.layers.l0).toBeDefined();
    expect(r.layers.l1).toBeDefined();
    expect(r.layers.l2).toBeDefined();
    expect(r.layers.l3).toBeDefined();
    expect(r.layers.l4).toBeDefined();
    sb.cleanup();
  });

  test("tokenEstimate is a positive integer", () => {
    const sb = makeVault(MINIMAL_VAULT);
    const r = context({ target: sb.vault });
    expect(typeof r.tokenEstimate).toBe("number");
    expect(r.tokenEstimate).toBeGreaterThan(0);
    sb.cleanup();
  });

  test("clean: no contract and an empty vault resolves without throwing", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
    });
    const r = context({ target: sb.vault });
    expect(r.command).toBe("context");
    expect(r.contractFound).toBe(false);
    sb.cleanup();
  });

  // ── Layer content assertions ───────────────────────────────────────────────

  test("L0 contains CLAUDE.md and _vocabulary.md when present", () => {
    const sb = makeVault(MINIMAL_VAULT);
    const r = context({ target: sb.vault });
    expect(r.layers.l0).toContain("CLAUDE.md");
    expect(r.layers.l0).toContain("_vocabulary.md");
    sb.cleanup();
  });

  test("L0 excludes missing files (only CLAUDE.md when _vocabulary.md absent)", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
    });
    const r = context({ target: sb.vault });
    expect(r.layers.l0).toContain("CLAUDE.md");
    expect(r.layers.l0).not.toContain("_vocabulary.md");
    sb.cleanup();
  });

  test("L1 contains wiki/index.md and the folder note", () => {
    const sb = makeVault(MINIMAL_VAULT);
    const r = context({ target: sb.vault });
    expect(r.layers.l1).toContain("wiki/index.md");
    expect(r.layers.l1).toContain("wiki/topics/topics.md");
    sb.cleanup();
  });

  test("L2 contains topic pages but not bookkeeping files (index, log)", () => {
    const sb = makeVault(MINIMAL_VAULT);
    const r = context({ target: sb.vault });
    expect(r.layers.l2).toContain("wiki/topics/ai.md");
    expect(r.layers.l2).toContain("wiki/topics/ml.md");
    // Bookkeeping files are excluded
    expect(r.layers.l2).not.toContain("wiki/index.md");
    expect(r.layers.l2).not.toContain("wiki/log.md");
    // Folder notes are excluded from L2
    expect(r.layers.l2).not.toContain("wiki/topics/topics.md");
    // _sources are excluded from L2
    expect(r.layers.l2).not.toContain("wiki/_sources/src-a.md");
    sb.cleanup();
  });

  test("L3 contains source summary pages under wiki/_sources/", () => {
    const sb = makeVault(MINIMAL_VAULT);
    const r = context({ target: sb.vault });
    expect(r.layers.l3).toContain("wiki/_sources/src-a.md");
    expect(r.layers.l3).toContain("wiki/_sources/src-b.md");
    sb.cleanup();
  });

  test("L4 contains raw source files under raw/", () => {
    const sb = makeVault(MINIMAL_VAULT);
    const r = context({ target: sb.vault });
    expect(r.layers.l4).toContain("raw/note-a.md");
    expect(r.layers.l4).toContain("raw/note-b.md");
    sb.cleanup();
  });

  // ── JSON has layers ────────────────────────────────────────────────────────

  test("JSON serialization includes layers and tokenEstimate", () => {
    const sb = makeVault(MINIMAL_VAULT);
    const r = context({ target: sb.vault });
    const json = JSON.parse(JSON.stringify(r)) as ContextReport;
    expect(json.layers).toBeDefined();
    expect(Array.isArray(json.layers.l0)).toBe(true);
    expect(typeof json.tokenEstimate).toBe("number");
    sb.cleanup();
  });

  // ── Determinism ───────────────────────────────────────────────────────────

  test("same query produces same result across two calls", () => {
    const sb = makeVault(MINIMAL_VAULT);
    const r1 = context({ target: sb.vault });
    const r2 = context({ target: sb.vault });
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
    sb.cleanup();
  });

  // ── No contract path ──────────────────────────────────────────────────────

  test("contractFound is false when skill is missing", () => {
    const sb = makeVault(MINIMAL_VAULT);
    const r = context({ target: sb.vault, skill: "nonexistent-skill-xyz" });
    expect(r.contractFound).toBe(false);
    sb.cleanup();
  });
});

// ── parseContextContract integration via context verb ─────────────────────────

describe("Feature: Engine › context verb — contract parsing integration", () => {
  // Vault with a realistic CLAUDE.md carrying a context contract in the body.
  // We inject the contract text via a fake skill resolved via the vault.
  // (The actual contract parsing is unit-tested in ontology-profile tests;
  //  here we confirm the context verb degrades gracefully when no skill is given.)

  test("context with no skill option → contractFound false, all layers populated", () => {
    const sb = makeVault(MINIMAL_VAULT);
    const r = context({ target: sb.vault });
    expect(r.contractFound).toBe(false);
    // Layers still populated from vault
    expect(r.layers.l0.length).toBeGreaterThan(0);
    expect(r.layers.l4.length).toBeGreaterThan(0);
    sb.cleanup();
  });

  test("empty vault (no raw/ no sources) → L3 and L4 are empty arrays", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 2\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "wiki/log.md": "---\ntitle: log\n---\n",
    });
    const r = context({ target: sb.vault });
    expect(r.layers.l3).toHaveLength(0);
    expect(r.layers.l4).toHaveLength(0);
    sb.cleanup();
  });
});
