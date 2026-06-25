/**
 * TDD: manifest-check — written FIRST, before the implementation exists.
 *
 * Tests validate `.claude-plugin/plugin.json` (and optionally
 * `.claude-plugin/marketplace.json`) against the same rules that the bash
 * script `scripts/validate-manifests.sh` enforces. Native JSON.parse replaces
 * jq — no external dependency.
 *
 * Covers:
 *   - clean plugin.json → zero findings
 *   - missing plugin.json → error finding
 *   - malformed JSON → error finding
 *   - missing required fields (name, version, description, author, license)
 *   - wrong types (name not string, etc.)
 *   - pattern violations (name not kebab-case, version not semver, email invalid)
 *   - minLength violation (description < 10 chars)
 *   - optional fields: supported_schema_versions (array of positive integers)
 *   - optional fields: keywords (≤20, unique, kebab-case)
 *   - marketplace.json when present: required fields, plugin entry shape
 *   - marketplace.json absent: silently skipped (no error)
 *   - checkManifests(root) returns Finding[] — no throws on any valid/invalid input
 */

import { test, expect, describe } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { checkManifests } from "./manifest-check.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A minimal valid plugin.json. */
const VALID_PLUGIN = {
  name: "my-plugin",
  version: "1.0.0",
  description: "A valid plugin description longer than 10 chars.",
  author: { name: "Test Author", email: "test@example.com" },
  license: "MIT",
};

/** A minimal valid marketplace.json. */
const VALID_MARKETPLACE = {
  name: "my-marketplace",
  owner: { name: "Test Org", url: "https://example.com" },
  plugins: [{ name: "my-plugin", source: "https://example.com/plugin", version: "1.0.0" }],
};

interface TmpRoot {
  root: string;
  cleanup: () => void;
  writePlugin: (data: unknown) => void;
  writeMarketplace: (data: unknown) => void;
  writePluginRaw: (content: string) => void;
  deletePlugin: () => void;
}

function makeTmpRoot(): TmpRoot {
  const root = mkdtempSync(join(tmpdir(), "cwp-manifest-test-"));
  mkdirSync(join(root, ".claude-plugin"), { recursive: true });

  const pluginPath = join(root, ".claude-plugin", "plugin.json");
  const marketplacePath = join(root, ".claude-plugin", "marketplace.json");

  return {
    root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
    writePlugin: (data) => writeFileSync(pluginPath, JSON.stringify(data, null, 2)),
    writeMarketplace: (data) => writeFileSync(marketplacePath, JSON.stringify(data, null, 2)),
    writePluginRaw: (content) => writeFileSync(pluginPath, content),
    deletePlugin: () => {
      try {
        rmSync(pluginPath);
      } catch {
        // ignore
      }
    },
  };
}

// ---------------------------------------------------------------------------
// clean plugin.json — zero findings
// ---------------------------------------------------------------------------

describe("checkManifests — clean plugin.json", () => {
  test("valid plugin.json → no findings", () => {
    const tmp = makeTmpRoot();
    tmp.writePlugin(VALID_PLUGIN);
    const findings = checkManifests(tmp.root);
    expect(findings).toHaveLength(0);
    tmp.cleanup();
  });

  test("valid plugin.json with all optional fields → no findings", () => {
    const tmp = makeTmpRoot();
    tmp.writePlugin({
      ...VALID_PLUGIN,
      homepage: "https://example.com",
      repository: "https://example.com/repo",
      hooks: "./hooks/hooks.json",
      supported_schema_versions: [1, 2, 3],
      keywords: ["my-plugin", "test-keyword"],
    });
    const findings = checkManifests(tmp.root);
    expect(findings).toHaveLength(0);
    tmp.cleanup();
  });
});

// ---------------------------------------------------------------------------
// missing / malformed plugin.json
// ---------------------------------------------------------------------------

describe("checkManifests — missing/malformed plugin.json", () => {
  test("missing plugin.json → error finding", () => {
    const tmp = makeTmpRoot();
    tmp.deletePlugin();
    const findings = checkManifests(tmp.root);
    expect(findings.some((f) => f.severity === "error")).toBe(true);
    expect(findings.some((f) => f.message.includes("not found"))).toBe(true);
    tmp.cleanup();
  });

  test("malformed JSON → error finding", () => {
    const tmp = makeTmpRoot();
    tmp.writePluginRaw("{ not valid json }");
    const findings = checkManifests(tmp.root);
    expect(findings.some((f) => f.severity === "error")).toBe(true);
    expect(findings.some((f) => f.message.toLowerCase().includes("json"))).toBe(true);
    tmp.cleanup();
  });
});

// ---------------------------------------------------------------------------
// required fields
// ---------------------------------------------------------------------------

describe("checkManifests — required field violations", () => {
  test("missing name → error finding", () => {
    const tmp = makeTmpRoot();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name: _name, ...rest } = VALID_PLUGIN;
    tmp.writePlugin(rest);
    const findings = checkManifests(tmp.root);
    expect(findings.some((f) => f.severity === "error" && f.message.includes("name"))).toBe(true);
    tmp.cleanup();
  });

  test("missing version → error finding", () => {
    const tmp = makeTmpRoot();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { version: _version, ...rest } = VALID_PLUGIN;
    tmp.writePlugin(rest);
    const findings = checkManifests(tmp.root);
    expect(findings.some((f) => f.severity === "error" && f.message.includes("version"))).toBe(
      true,
    );
    tmp.cleanup();
  });

  test("missing description → error finding", () => {
    const tmp = makeTmpRoot();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { description: _description, ...rest } = VALID_PLUGIN;
    tmp.writePlugin(rest);
    const findings = checkManifests(tmp.root);
    expect(findings.some((f) => f.severity === "error" && f.message.includes("description"))).toBe(
      true,
    );
    tmp.cleanup();
  });

  test("missing author → error finding", () => {
    const tmp = makeTmpRoot();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { author: _author, ...rest } = VALID_PLUGIN;
    tmp.writePlugin(rest);
    const findings = checkManifests(tmp.root);
    expect(findings.some((f) => f.severity === "error" && f.message.includes("author"))).toBe(true);
    tmp.cleanup();
  });

  test("missing license → error finding", () => {
    const tmp = makeTmpRoot();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { license: _license, ...rest } = VALID_PLUGIN;
    tmp.writePlugin(rest);
    const findings = checkManifests(tmp.root);
    expect(findings.some((f) => f.severity === "error" && f.message.includes("license"))).toBe(
      true,
    );
    tmp.cleanup();
  });

  test("missing author.name → error finding", () => {
    const tmp = makeTmpRoot();
    tmp.writePlugin({ ...VALID_PLUGIN, author: { email: "test@example.com" } });
    const findings = checkManifests(tmp.root);
    expect(findings.some((f) => f.severity === "error" && f.message.includes("author.name"))).toBe(
      true,
    );
    tmp.cleanup();
  });

  test("missing author.email → error finding", () => {
    const tmp = makeTmpRoot();
    tmp.writePlugin({ ...VALID_PLUGIN, author: { name: "Test" } });
    const findings = checkManifests(tmp.root);
    expect(findings.some((f) => f.severity === "error" && f.message.includes("author.email"))).toBe(
      true,
    );
    tmp.cleanup();
  });
});

// ---------------------------------------------------------------------------
// type violations
// ---------------------------------------------------------------------------

describe("checkManifests — type violations", () => {
  test("name not a string → error finding", () => {
    const tmp = makeTmpRoot();
    tmp.writePlugin({ ...VALID_PLUGIN, name: 42 });
    const findings = checkManifests(tmp.root);
    expect(findings.some((f) => f.severity === "error" && f.message.includes("name"))).toBe(true);
    tmp.cleanup();
  });

  test("author not an object → error finding", () => {
    const tmp = makeTmpRoot();
    tmp.writePlugin({ ...VALID_PLUGIN, author: "Not an object" });
    const findings = checkManifests(tmp.root);
    expect(findings.some((f) => f.severity === "error" && f.message.includes("author"))).toBe(true);
    tmp.cleanup();
  });
});

// ---------------------------------------------------------------------------
// pattern / minLength violations
// ---------------------------------------------------------------------------

describe("checkManifests — pattern and length violations", () => {
  test("name not kebab-case → error finding", () => {
    const tmp = makeTmpRoot();
    tmp.writePlugin({ ...VALID_PLUGIN, name: "My_Plugin!" });
    const findings = checkManifests(tmp.root);
    expect(
      findings.some((f) => f.severity === "error" && f.message.toLowerCase().includes("name")),
    ).toBe(true);
    tmp.cleanup();
  });

  test("version not semver → error finding", () => {
    const tmp = makeTmpRoot();
    tmp.writePlugin({ ...VALID_PLUGIN, version: "not-a-version" });
    const findings = checkManifests(tmp.root);
    expect(findings.some((f) => f.severity === "error" && f.message.includes("version"))).toBe(
      true,
    );
    tmp.cleanup();
  });

  test("description too short (< 10 chars) → error finding", () => {
    const tmp = makeTmpRoot();
    tmp.writePlugin({ ...VALID_PLUGIN, description: "Short" });
    const findings = checkManifests(tmp.root);
    expect(findings.some((f) => f.severity === "error" && f.message.includes("description"))).toBe(
      true,
    );
    tmp.cleanup();
  });

  test("invalid author email → error finding", () => {
    const tmp = makeTmpRoot();
    tmp.writePlugin({ ...VALID_PLUGIN, author: { name: "Test", email: "not-an-email" } });
    const findings = checkManifests(tmp.root);
    expect(
      findings.some(
        (f) =>
          f.severity === "error" &&
          (f.message.includes("email") || f.message.includes("author.email")),
      ),
    ).toBe(true);
    tmp.cleanup();
  });
});

// ---------------------------------------------------------------------------
// optional fields: supported_schema_versions
// ---------------------------------------------------------------------------

describe("checkManifests — supported_schema_versions", () => {
  test("valid array of positive integers → no extra findings", () => {
    const tmp = makeTmpRoot();
    tmp.writePlugin({ ...VALID_PLUGIN, supported_schema_versions: [1, 2, 3] });
    const findings = checkManifests(tmp.root);
    expect(findings).toHaveLength(0);
    tmp.cleanup();
  });

  test("empty array → error finding", () => {
    const tmp = makeTmpRoot();
    tmp.writePlugin({ ...VALID_PLUGIN, supported_schema_versions: [] });
    const findings = checkManifests(tmp.root);
    expect(
      findings.some(
        (f) => f.severity === "error" && f.message.includes("supported_schema_versions"),
      ),
    ).toBe(true);
    tmp.cleanup();
  });

  test("non-array → error finding", () => {
    const tmp = makeTmpRoot();
    tmp.writePlugin({ ...VALID_PLUGIN, supported_schema_versions: "1,2,3" });
    const findings = checkManifests(tmp.root);
    expect(
      findings.some(
        (f) => f.severity === "error" && f.message.includes("supported_schema_versions"),
      ),
    ).toBe(true);
    tmp.cleanup();
  });

  test("array with non-integer values → error finding", () => {
    const tmp = makeTmpRoot();
    tmp.writePlugin({ ...VALID_PLUGIN, supported_schema_versions: [1.5, "two"] });
    const findings = checkManifests(tmp.root);
    expect(
      findings.some(
        (f) => f.severity === "error" && f.message.includes("supported_schema_versions"),
      ),
    ).toBe(true);
    tmp.cleanup();
  });
});

// ---------------------------------------------------------------------------
// optional fields: keywords
// ---------------------------------------------------------------------------

describe("checkManifests — keywords", () => {
  test("valid keywords array → no findings", () => {
    const tmp = makeTmpRoot();
    tmp.writePlugin({ ...VALID_PLUGIN, keywords: ["my-plugin", "test-kw"] });
    const findings = checkManifests(tmp.root);
    expect(findings).toHaveLength(0);
    tmp.cleanup();
  });

  test("too many keywords (> 20) → error finding", () => {
    const tmp = makeTmpRoot();
    const keywords = Array.from({ length: 21 }, (_, i) => `keyword-${i}`);
    tmp.writePlugin({ ...VALID_PLUGIN, keywords });
    const findings = checkManifests(tmp.root);
    expect(findings.some((f) => f.severity === "error" && f.message.includes("keywords"))).toBe(
      true,
    );
    tmp.cleanup();
  });

  test("duplicate keywords → error finding", () => {
    const tmp = makeTmpRoot();
    tmp.writePlugin({ ...VALID_PLUGIN, keywords: ["my-plugin", "my-plugin"] });
    const findings = checkManifests(tmp.root);
    expect(findings.some((f) => f.severity === "error" && f.message.includes("keywords"))).toBe(
      true,
    );
    tmp.cleanup();
  });

  test("keyword not kebab-case → error finding", () => {
    const tmp = makeTmpRoot();
    tmp.writePlugin({ ...VALID_PLUGIN, keywords: ["ValidPlugin"] });
    const findings = checkManifests(tmp.root);
    expect(findings.some((f) => f.severity === "error" && f.message.includes("keyword"))).toBe(
      true,
    );
    tmp.cleanup();
  });
});

// ---------------------------------------------------------------------------
// marketplace.json
// ---------------------------------------------------------------------------

describe("checkManifests — marketplace.json", () => {
  test("marketplace absent → silently skipped (no extra findings)", () => {
    const tmp = makeTmpRoot();
    tmp.writePlugin(VALID_PLUGIN);
    // marketplace not written
    const findings = checkManifests(tmp.root);
    expect(findings).toHaveLength(0);
    tmp.cleanup();
  });

  test("valid marketplace.json → no extra findings", () => {
    const tmp = makeTmpRoot();
    tmp.writePlugin(VALID_PLUGIN);
    tmp.writeMarketplace(VALID_MARKETPLACE);
    const findings = checkManifests(tmp.root);
    expect(findings).toHaveLength(0);
    tmp.cleanup();
  });

  test("malformed marketplace.json → error finding", () => {
    const tmp = makeTmpRoot();
    tmp.writePlugin(VALID_PLUGIN);
    writeFileSync(join(tmp.root, ".claude-plugin", "marketplace.json"), "{ bad json }");
    const findings = checkManifests(tmp.root);
    expect(
      findings.some((f) => f.severity === "error" && f.message.toLowerCase().includes("json")),
    ).toBe(true);
    tmp.cleanup();
  });

  test("marketplace missing plugins array → error finding", () => {
    const tmp = makeTmpRoot();
    tmp.writePlugin(VALID_PLUGIN);
    tmp.writeMarketplace({
      name: "my-marketplace",
      owner: { name: "Test", url: "https://example.com" },
    });
    const findings = checkManifests(tmp.root);
    expect(findings.some((f) => f.severity === "error" && f.message.includes("plugins"))).toBe(
      true,
    );
    tmp.cleanup();
  });

  test("marketplace plugin entry missing name → error finding", () => {
    const tmp = makeTmpRoot();
    tmp.writePlugin(VALID_PLUGIN);
    tmp.writeMarketplace({
      ...VALID_MARKETPLACE,
      plugins: [{ source: "https://example.com", version: "1.0.0" }],
    });
    const findings = checkManifests(tmp.root);
    expect(
      findings.some((f) => f.severity === "error" && f.message.includes("plugins[0].name")),
    ).toBe(true);
    tmp.cleanup();
  });

  test("marketplace plugin entry missing source → error finding", () => {
    const tmp = makeTmpRoot();
    tmp.writePlugin(VALID_PLUGIN);
    tmp.writeMarketplace({
      ...VALID_MARKETPLACE,
      plugins: [{ name: "my-plugin", version: "1.0.0" }],
    });
    const findings = checkManifests(tmp.root);
    expect(
      findings.some((f) => f.severity === "error" && f.message.includes("plugins[0].source")),
    ).toBe(true);
    tmp.cleanup();
  });

  test("empty plugins array → error finding", () => {
    const tmp = makeTmpRoot();
    tmp.writePlugin(VALID_PLUGIN);
    tmp.writeMarketplace({ ...VALID_MARKETPLACE, plugins: [] });
    const findings = checkManifests(tmp.root);
    expect(findings.some((f) => f.severity === "error" && f.message.includes("plugins"))).toBe(
      true,
    );
    tmp.cleanup();
  });
});

// ---------------------------------------------------------------------------
// no throws
// ---------------------------------------------------------------------------

describe("checkManifests — robustness", () => {
  test("does not throw on any input (always returns Finding[])", () => {
    const tmp = makeTmpRoot();
    // Various invalid states — should never throw
    expect(() => checkManifests(tmp.root)).not.toThrow();
    expect(() => checkManifests("/does/not/exist")).not.toThrow();
    tmp.cleanup();
  });

  test("returns an array (not undefined/null) for missing root", () => {
    const result = checkManifests("/does/not/exist");
    expect(Array.isArray(result)).toBe(true);
  });
});
