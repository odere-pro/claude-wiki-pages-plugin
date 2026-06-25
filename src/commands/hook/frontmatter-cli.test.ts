/**
 * Colocated tests for src/commands/hook/frontmatter-cli.ts — the CLI batch
 * frontmatter validator that scripts/validate-frontmatter.sh ran inline in its
 * `--json` / human `--target` modes (the awk `validate_content` loop over
 * `<vault>/wiki/**.md`), now in the engine (frontmatter-cli-retire unit,
 * tmp/migration-plan.md "What is left" #2).
 *
 * Parity target — the bash CLI/JSON contract this replaces, verbatim:
 *   1. Missing `<vault>/wiki/` directory → missingWiki = true (CLI exit 2).
 *   2. A clean vault → zero findings (the `{"findings":[]}` envelope, exit 0).
 *   3. A dirty page → one error-severity `frontmatter` finding per failing file,
 *      keyed {severity, check, message, file} verbatim from report.ts (exit 1).
 *   4. Bundled-template fallback: a vault whose CLAUDE.md has no
 *      "### Required fields by type" table validates against the bundled
 *      skills/init/template/CLAUDE.md (eval fixtures / pre-table vaults), NOT
 *      fail-closed — mirroring the bash `_resolve_schema_file`.
 *
 * Schema resolution is single-sourced via resolveSchemaFile (frontmatter-gate.ts)
 * so the CLI path and the hook path agree on the fallback. No `any`; pure
 * deterministic: same vault + schema → same findings.
 */

import { describe, test, expect, afterEach } from "bun:test";
import { makeVault, type Sandbox } from "../../test-helpers/sandbox/vault.ts";
import { frontmatterCli } from "./frontmatter-cli.ts";

/** A schema CLAUDE.md carrying the required-fields table (vault-table path). */
const SCHEMA_WITH_TABLE = `---
schema_version: 2
---
# Vault schema

### Required fields by type

| Type | Required fields | Conditional |
| --- | --- | --- |
| \`entity\` | \`entity_type parent path sources created updated status confidence\` | — |
| \`topic\` | \`summary parent path sources created updated status confidence\` | — |
`;

/** A schema CLAUDE.md with NO required-fields table (triggers bundled fallback). */
const SCHEMA_NO_TABLE = `# Vault — no Required fields table here.

Nine allowed types: source, entity, concept, topic, project, synthesis, index, manifest, log.
`;

const CLEAN_ENTITY = `---
type: entity
title: Sample
entity_type: tool
parent: "[[Topics — Index]]"
path: topics
sources: ["[[Sample]]"]
created: 2026-04-18
updated: 2026-04-18
status: active
confidence: 0.9
---

# Sample
`;

const DIRTY_ENTITY = `---
title: "Bad"
type: entity
---

# Bad entity missing required fields
`;

let sandbox: Sandbox | undefined;
afterEach(() => {
  sandbox?.cleanup();
  sandbox = undefined;
});

describe("Feature: Hook gates › frontmatter CLI", () => {
  test("missing wiki/ directory reports missingWiki = true with no findings", () => {
    sandbox = makeVault({ "CLAUDE.md": SCHEMA_WITH_TABLE });
    const result = frontmatterCli({ vault: sandbox.vault });
    expect(result.missingWiki).toBe(true);
    expect(result.findings).toEqual([]);
  });

  test("clean vault (vault table) → no findings", () => {
    sandbox = makeVault({
      "CLAUDE.md": SCHEMA_WITH_TABLE,
      "wiki/topics/sample.md": CLEAN_ENTITY,
    });
    const result = frontmatterCli({ vault: sandbox.vault });
    expect(result.missingWiki).toBe(false);
    expect(result.findings).toEqual([]);
  });

  test("dirty page → one error finding keyed {severity, check, message, file}", () => {
    sandbox = makeVault({
      "CLAUDE.md": SCHEMA_WITH_TABLE,
      "wiki/topics/bad.md": DIRTY_ENTITY,
    });
    const result = frontmatterCli({ vault: sandbox.vault });
    expect(result.missingWiki).toBe(false);
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0]!;
    expect(f.severity).toBe("error");
    expect(f.check).toBe("frontmatter");
    expect(f.file).toBe("topics/bad.md");
    expect(f.message).toContain("entity note missing required field(s):");
    expect(f.message).toContain("entity_type");
    // Only the four allowed keys — no extras (json-envelope.bats conformance).
    expect(Object.keys(f).sort()).toEqual(["check", "file", "message", "severity"]);
  });

  test("bundled-template fallback: no-table vault validates clean (not fail-closed)", () => {
    // A valid entity page must PASS when the vault CLAUDE.md has no table — the
    // bundled skills/init/template/CLAUDE.md table is used (bash parity).
    sandbox = makeVault({
      "CLAUDE.md": SCHEMA_NO_TABLE,
      "wiki/topics/sample.md": CLEAN_ENTITY,
    });
    const result = frontmatterCli({ vault: sandbox.vault });
    expect(result.missingWiki).toBe(false);
    expect(result.findings).toEqual([]);
  });

  test("bundled-template fallback: missing field still blocked (no vault table)", () => {
    sandbox = makeVault({
      "CLAUDE.md": SCHEMA_NO_TABLE,
      "wiki/topics/bad.md": DIRTY_ENTITY,
    });
    const result = frontmatterCli({ vault: sandbox.vault });
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.message).toContain("entity_type");
  });

  test("deterministic: same vault → identical findings on repeat runs", () => {
    sandbox = makeVault({
      "CLAUDE.md": SCHEMA_WITH_TABLE,
      "wiki/topics/bad.md": DIRTY_ENTITY,
      "wiki/topics/sample.md": CLEAN_ENTITY,
    });
    const a = frontmatterCli({ vault: sandbox.vault });
    const b = frontmatterCli({ vault: sandbox.vault });
    expect(a.findings).toEqual(b.findings);
  });

  // ── Per-file list (the bash CLI plain-text contract) ────────────────────────
  // The bash `--target` human mode printed one `OK:`/`ERROR:` line per wiki page
  // (validate-frontmatter.sh green/red loop). Consumers count those lines —
  // scripts/eval-ingest-extract.sh:_score_schema requires one ".md" line per page
  // (frontmatter-cli-retire regression). frontmatterCli must surface EVERY
  // validated page (pass and fail), not just the failing findings, so the CLI
  // renderer can reproduce that per-file output.

  test("files lists every validated wiki page with pass/fail status (sorted)", () => {
    sandbox = makeVault({
      "CLAUDE.md": SCHEMA_WITH_TABLE,
      "wiki/topics/bad.md": DIRTY_ENTITY,
      "wiki/topics/sample.md": CLEAN_ENTITY,
    });
    const result = frontmatterCli({ vault: sandbox.vault });
    expect(result.files.map((f) => f.file)).toEqual(["topics/bad.md", "topics/sample.md"]);
    const bad = result.files.find((f) => f.file === "topics/bad.md")!;
    const ok = result.files.find((f) => f.file === "topics/sample.md")!;
    expect(bad.ok).toBe(false);
    expect(bad.message).toContain("entity_type");
    expect(ok.ok).toBe(true);
    expect(ok.message).toBeNull();
  });

  test("clean vault → files lists the page as ok with no findings", () => {
    sandbox = makeVault({
      "CLAUDE.md": SCHEMA_WITH_TABLE,
      "wiki/topics/sample.md": CLEAN_ENTITY,
    });
    const result = frontmatterCli({ vault: sandbox.vault });
    expect(result.findings).toEqual([]);
    expect(result.files).toHaveLength(1);
    expect(result.files[0]!.ok).toBe(true);
    expect(result.files[0]!.file).toBe("topics/sample.md");
  });

  test("files and findings stay consistent (one finding per failing file)", () => {
    sandbox = makeVault({
      "CLAUDE.md": SCHEMA_WITH_TABLE,
      "wiki/topics/bad.md": DIRTY_ENTITY,
      "wiki/topics/sample.md": CLEAN_ENTITY,
    });
    const result = frontmatterCli({ vault: sandbox.vault });
    const failingFiles = result.files.filter((f) => !f.ok).map((f) => f.file);
    const findingFiles = result.findings.map((f) => f.file ?? "");
    expect(failingFiles).toEqual(findingFiles);
  });

  test("missing wiki/ → files is empty", () => {
    sandbox = makeVault({ "CLAUDE.md": SCHEMA_WITH_TABLE });
    const result = frontmatterCli({ vault: sandbox.vault });
    expect(result.missingWiki).toBe(true);
    expect(result.files).toEqual([]);
  });
});
