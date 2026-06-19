/**
 * TDD: lint scaffold + --check manifests integration.
 *
 * These tests assert:
 *   1. `lint()` returns an empty Report for a clean vault (no .claude-plugin/).
 *   2. The CLI dispatches `lint` correctly (no "Unknown command" error).
 *   3. `--concurrency <n>` is parsed and accepted without error.
 *   4. `--json` emits a parseable Report with command === "lint".
 *   5. `--check manifests` routes to the manifest check and reports errors
 *      when .claude-plugin/plugin.json is absent.
 *   6. `--check manifests` exits 0 for a valid plugin.json.
 *   7. `resolveLintCheck` normalises known/unknown values.
 */

import { test, expect, describe } from "bun:test";
import { join } from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { makeVault, CLEAN_VAULT } from "../../test-helpers/sandbox/vault.ts";
import { lint, resolveLintCheck } from "./lint.ts";
import { exitCode } from "../../core/report.ts";

const CLI = join(import.meta.dir, "../../cli/cli.ts");

interface RunResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

function run(...args: string[]): RunResult {
  const proc = Bun.spawnSync(["bun", CLI, ...args], { stdout: "pipe", stderr: "pipe" });
  return {
    code: proc.exitCode,
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
  };
}

// ---------------------------------------------------------------------------
// Unit: lint() returns an empty Report
// ---------------------------------------------------------------------------

describe("lint() — unit", () => {
  test("returns a clean Report (no errors/warnings) for a clean vault", async () => {
    const sb = makeVault(CLEAN_VAULT);
    const report = await lint({ target: sb.vault });
    expect(report.command).toBe("lint");
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
    // info-severity findings (e.g. vocabulary-absent) do not count as errors or
    // warnings — they are informational skips; clean === true and exitCode === 0
    // even when info findings are present.
    expect(report.clean).toBe(true);
    expect(exitCode(report)).toBe(0);
    sb.cleanup();
  });

  test("vault path is preserved in the report", async () => {
    const sb = makeVault(CLEAN_VAULT);
    const report = await lint({ target: sb.vault });
    expect(report.vault).toBe(sb.vault);
    sb.cleanup();
  });

  test("accepts concurrency option without error", async () => {
    const sb = makeVault(CLEAN_VAULT);
    // concurrency is parsed but currently unused — must not throw
    const report = await lint({ target: sb.vault, concurrency: 4 });
    expect(report.errors).toBe(0);
    sb.cleanup();
  });

  test("works without an explicit target (falls back to resolveVault)", async () => {
    // When called with no target the four-tier resolution runs; it may or may not
    // find a vault. Either way the call must not throw.
    await expect(lint({})).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// CLI dispatch: lint command is routed correctly
// ---------------------------------------------------------------------------

describe("lint — CLI dispatch", () => {
  test("lint --json returns a parseable Report with command === 'lint'", () => {
    const sb = makeVault(CLEAN_VAULT);
    const r = run("lint", "--target", sb.vault, "--json");
    expect(r.code).toBe(0);
    const report = JSON.parse(r.stdout);
    expect(report.command).toBe("lint");
    expect(report.clean).toBe(true);
    // errors and warnings must be 0; info findings (e.g. vocabulary-absent) are
    // allowed and do not affect clean or exitCode.
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
    sb.cleanup();
  });

  test("lint exits 0 and does not write to stderr for a clean vault", () => {
    const sb = makeVault(CLEAN_VAULT);
    const r = run("lint", "--target", sb.vault);
    expect(r.code).toBe(0);
    expect(r.stderr).toBe("");
    sb.cleanup();
  });

  test("lint is listed in the capabilities verb list", () => {
    const r = run("capabilities", "--json");
    expect(r.code).toBe(0);
    const manifest = JSON.parse(r.stdout);
    const names: string[] = manifest.manifest.verbs.map((v: { name: string }) => v.name);
    expect(names).toContain("lint");
  });

  test("lint appears in usage output", () => {
    const r = run("--help");
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("lint");
  });

  test("lint --concurrency 2 --json is accepted without error", () => {
    const sb = makeVault(CLEAN_VAULT);
    const r = run("lint", "--target", sb.vault, "--concurrency", "2", "--json");
    expect(r.code).toBe(0);
    const report = JSON.parse(r.stdout);
    expect(report.command).toBe("lint");
    sb.cleanup();
  });

  test("lint is NOT in the 'Unknown command' path", () => {
    const sb = makeVault(CLEAN_VAULT);
    const r = run("lint", "--target", sb.vault);
    expect(r.stderr).not.toContain("Unknown command");
    sb.cleanup();
  });
});

// ---------------------------------------------------------------------------
// --check manifests integration
// ---------------------------------------------------------------------------

/** Create a temporary repo root with a valid .claude-plugin/plugin.json. */
function makePluginRoot(): { root: string; vault: string; cleanup: () => void } {
  const root = mkdtempSync(join(tmpdir(), "cwp-lint-manifests-test-"));
  mkdirSync(join(root, ".claude-plugin"), { recursive: true });
  const vaultDir = join(root, "vault");
  mkdirSync(join(vaultDir, "wiki"), { recursive: true });
  writeFileSync(join(vaultDir, "CLAUDE.md"), "---\nschema_version: 1\n---\n# Vault\n");
  writeFileSync(join(vaultDir, "wiki", "index.md"), "---\ntitle: index\n---\n");
  writeFileSync(join(vaultDir, "wiki", "log.md"), "---\ntitle: log\n---\n");
  const validPlugin = {
    name: "my-plugin",
    version: "1.0.0",
    description: "A valid plugin description longer than 10 chars.",
    author: { name: "Test Author", email: "test@example.com" },
    license: "MIT",
  };
  writeFileSync(join(root, ".claude-plugin", "plugin.json"), JSON.stringify(validPlugin, null, 2));
  return {
    root,
    vault: vaultDir,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

describe("lint --check manifests — unit", () => {
  test("valid plugin.json → clean report (no findings)", async () => {
    const tmp = makePluginRoot();
    const report = await lint({ target: tmp.vault, check: "manifests" });
    expect(report.command).toBe("lint");
    expect(report.errors).toBe(0);
    expect(report.clean).toBe(true);
    tmp.cleanup();
  });

  test("missing .claude-plugin/plugin.json → error finding", async () => {
    const sb = makeVault(CLEAN_VAULT);
    // sandbox vault has no .claude-plugin/ in its ancestors
    const report = await lint({ target: sb.vault, check: "manifests" });
    expect(report.errors).toBeGreaterThan(0);
    expect(report.clean).toBe(false);
    sb.cleanup();
  });

  test("check=all does not error when .claude-plugin/ is absent", async () => {
    const sb = makeVault(CLEAN_VAULT);
    const report = await lint({ target: sb.vault, check: "all" });
    expect(report.errors).toBe(0);
    expect(report.clean).toBe(true);
    sb.cleanup();
  });

  test("check=all includes manifests check when .claude-plugin/ exists", async () => {
    const tmp = makePluginRoot();
    const report = await lint({ target: tmp.vault, check: "all" });
    // Valid plugin.json — should still be clean
    expect(report.errors).toBe(0);
    tmp.cleanup();
  });

  test("exitCode is 1 for invalid plugin.json", async () => {
    const sb = makeVault(CLEAN_VAULT);
    const report = await lint({ target: sb.vault, check: "manifests" });
    expect(exitCode(report)).toBe(1);
    sb.cleanup();
  });
});

describe("lint --check manifests — CLI", () => {
  test("lint --check manifests --json reports errors when plugin.json missing", () => {
    const sb = makeVault(CLEAN_VAULT);
    const r = run("lint", "--target", sb.vault, "--check", "manifests", "--json");
    expect(r.code).toBe(1);
    const report = JSON.parse(r.stdout);
    expect(report.command).toBe("lint");
    expect(report.errors).toBeGreaterThan(0);
    sb.cleanup();
  });

  test("lint --check manifests exits 0 for valid plugin repo", () => {
    const tmp = makePluginRoot();
    const r = run("lint", "--target", tmp.vault, "--check", "manifests", "--json");
    expect(r.code).toBe(0);
    const report = JSON.parse(r.stdout);
    expect(report.errors).toBe(0);
    tmp.cleanup();
  });
});

describe("lint --check vocabulary — dispatch", () => {
  test("runs the vocabulary check in isolation and returns a lint Report", async () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 1\n---\n",
      "_vocabulary.md": "---\ngroups: []\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
    });
    try {
      const report = await lint({ target: sb.vault, check: "vocabulary" });
      expect(report.command).toBe("lint");
      // Empty groups → no findings, clean.
      expect(report.findings).toHaveLength(0);
      expect(report.clean).toBe(true);
    } finally {
      sb.cleanup();
    }
  });

  test("--min-tag-usage flag is accepted via the CLI without error", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 1\n---\n",
      "_vocabulary.md": "---\ngroups: []\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
    });
    const r = run(
      "lint",
      "--target",
      sb.vault,
      "--check",
      "vocabulary",
      "--min-tag-usage",
      "3",
      "--json",
    );
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout).command).toBe("lint");
    sb.cleanup();
  });
});

describe("lint --check dup-claims — dispatch", () => {
  test("is a no-op (clean) without --file", async () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 1\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
    });
    try {
      const report = await lint({ target: sb.vault, check: "dup-claims" });
      expect(report.command).toBe("lint");
      expect(report.findings).toHaveLength(0);
      expect(report.clean).toBe(true);
    } finally {
      sb.cleanup();
    }
  });

  test("--check dup-claims --file is accepted via the CLI without error", () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 1\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
      "_proposed/draft.md": "---\ntitle: draft\n---\n",
    });
    const r = run(
      "lint",
      "--target",
      sb.vault,
      "--check",
      "dup-claims",
      "--file",
      `${sb.vault}/_proposed/draft.md`,
      "--json",
    );
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout).command).toBe("lint");
    sb.cleanup();
  });
});

describe("lint --check output — dispatch", () => {
  test("clean (no findings) when output/ is absent", async () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 1\n---\n",
      "wiki/index.md": "---\ntitle: index\n---\n",
    });
    try {
      const report = await lint({ target: sb.vault, check: "output" });
      expect(report.command).toBe("lint");
      expect(report.findings).toHaveLength(0);
      expect(report.clean).toBe(true);
    } finally {
      sb.cleanup();
    }
  });

  test("flags a non-portable output file (warn)", async () => {
    const sb = makeVault({
      "CLAUDE.md": "---\nschema_version: 1\n---\n",
      // A [[wikilink]] is not portable markdown — the contract forbids it.
      "output/brief.md": "# Brief\n\nSee [[Some Page]] for details.\n",
    });
    try {
      const report = await lint({ target: sb.vault, check: "output" });
      expect(report.warnings).toBeGreaterThan(0);
    } finally {
      sb.cleanup();
    }
  });
});

describe("resolveLintCheck", () => {
  test("undefined → all", () => {
    expect(resolveLintCheck(undefined)).toBe("all");
  });

  test("'vocabulary' → vocabulary", () => {
    expect(resolveLintCheck("vocabulary")).toBe("vocabulary");
  });

  test("'dup-claims' → dup-claims", () => {
    expect(resolveLintCheck("dup-claims")).toBe("dup-claims");
  });

  test("'output' → output", () => {
    expect(resolveLintCheck("output")).toBe("output");
  });

  test("'manifests' → manifests", () => {
    expect(resolveLintCheck("manifests")).toBe("manifests");
  });

  test("'all' → all", () => {
    expect(resolveLintCheck("all")).toBe("all");
  });

  test("unknown value → all (safe default)", () => {
    expect(resolveLintCheck("unknown-check")).toBe("all");
  });
});
