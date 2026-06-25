/**
 * Manifest check — validates `.claude-plugin/plugin.json` (and optionally
 * `.claude-plugin/marketplace.json`) against the same minimal rules that
 * `scripts/validate-manifests.sh` enforces. Replaces jq with native
 * JSON.parse; no external dependency.
 *
 * Hard-codes the same rules the schema files under
 * `.github/schemas/*.schema.json` assert:
 *   required keys, type, regex pattern, minLength, minItems, nested
 *   required+properties, array item shape.
 *
 * Returns a `Finding[]` — never throws. An empty array means clean.
 *
 * Consumed by `lint --check manifests` via `src/commands/lint/lint.ts`.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Finding } from "./report.ts";

// ── Patterns (mirrors validate-manifests.sh) ─────────────────────────────────

const NAME_PATTERN = /^[a-z][a-z0-9-]*$/;
const VERSION_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+/;
const EMAIL_PATTERN = /^[^@]+@[^@]+\.[^@]+$/;
const KEYWORD_PATTERN = /^[a-z][a-z0-9-]*$/;

const KEYWORDS_MAX_ITEMS = 20;
const DESCRIPTION_MIN_LENGTH = 10;
const SCHEMA_VERSIONS_MIN_ITEMS = 1;

// ── Type-guard helpers ────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

function isPositiveInteger(v: unknown): boolean {
  return typeof v === "number" && Number.isFinite(v) && v === Math.floor(v) && v >= 1;
}

// ── Low-level helpers ─────────────────────────────────────────────────────────

/**
 * Parse a JSON file and return [parsed, null] or [null, errorMessage].
 * Never throws.
 */
function parseJsonFile(filePath: string): [unknown, null] | [null, string] {
  if (!existsSync(filePath)) {
    return [null, `${filePath}: not found`];
  }
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return [null, `${filePath}: cannot read file — ${msg}`];
  }
  try {
    return [JSON.parse(raw) as unknown, null];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return [null, `${filePath}: not valid JSON — ${msg}`];
  }
}

/** Push an error-severity finding onto `out`. */
function fail(out: Finding[], file: string, check: string, message: string): void {
  out.push({ severity: "error", check, message, file });
}

// ── plugin.json validation ────────────────────────────────────────────────────

function validatePlugin(filePath: string, data: Record<string, unknown>): Finding[] {
  const out: Finding[] = [];
  const CHECK = "manifests-plugin";

  // ── required string fields ─────────────────────────────────────────────────
  const requiredStrings: Array<[keyof typeof data, string]> = [
    ["name", "name"],
    ["version", "version"],
    ["description", "description"],
    ["license", "license"],
  ];
  for (const [field, label] of requiredStrings) {
    const val = data[field];
    if (val === undefined || val === null) {
      fail(out, filePath, CHECK, `required field missing — ${label}`);
      continue;
    }
    if (!isString(val)) {
      fail(out, filePath, CHECK, `${label} must be a string`);
    }
  }

  // ── author object ──────────────────────────────────────────────────────────
  const author = data["author"];
  if (author === undefined || author === null) {
    fail(out, filePath, CHECK, `required field missing — author`);
  } else if (!isRecord(author)) {
    fail(out, filePath, CHECK, `author must be an object`);
  } else {
    if (!isString(author["name"])) {
      fail(out, filePath, CHECK, `required field missing — author.name`);
    }
    const email = author["email"];
    if (email === undefined || email === null) {
      fail(out, filePath, CHECK, `required field missing — author.email`);
    } else if (!isString(email)) {
      fail(out, filePath, CHECK, `author.email must be a string`);
    } else if (!EMAIL_PATTERN.test(email)) {
      fail(out, filePath, CHECK, `author.email (${email}) does not match expected email pattern`);
    }
  }

  // ── pattern checks (only when fields are valid strings) ───────────────────
  const name = data["name"];
  if (isString(name) && !NAME_PATTERN.test(name)) {
    fail(out, filePath, CHECK, `name (${name}) does not match pattern ^[a-z][a-z0-9-]*$`);
  }

  const version = data["version"];
  if (isString(version) && !VERSION_PATTERN.test(version)) {
    fail(
      out,
      filePath,
      CHECK,
      `version (${version}) does not match pattern ^[0-9]+\\.[0-9]+\\.[0-9]+`,
    );
  }

  const description = data["description"];
  if (isString(description) && description.length < DESCRIPTION_MIN_LENGTH) {
    fail(
      out,
      filePath,
      CHECK,
      `description length ${description.length} < minimum ${DESCRIPTION_MIN_LENGTH}`,
    );
  }

  // ── optional: supported_schema_versions ───────────────────────────────────
  const ssv = data["supported_schema_versions"];
  if (ssv !== undefined && ssv !== null) {
    if (!isArray(ssv)) {
      fail(out, filePath, CHECK, `supported_schema_versions must be an array`);
    } else {
      if (ssv.length < SCHEMA_VERSIONS_MIN_ITEMS) {
        fail(
          out,
          filePath,
          CHECK,
          `supported_schema_versions count ${ssv.length} < minItems ${SCHEMA_VERSIONS_MIN_ITEMS}`,
        );
      }
      const allPositiveInts = ssv.every(isPositiveInteger);
      if (!allPositiveInts) {
        fail(out, filePath, CHECK, `supported_schema_versions must be integers >= 1`);
      }
    }
  }

  // ── optional: keywords ────────────────────────────────────────────────────
  const kw = data["keywords"];
  if (kw !== undefined && kw !== null) {
    if (!isArray(kw)) {
      fail(out, filePath, CHECK, `keywords must be an array`);
    } else {
      if (kw.length > KEYWORDS_MAX_ITEMS) {
        fail(
          out,
          filePath,
          CHECK,
          `keywords exceeds maxItems ${KEYWORDS_MAX_ITEMS} (got ${kw.length})`,
        );
      }
      const unique = new Set(kw);
      if (unique.size !== kw.length) {
        fail(
          out,
          filePath,
          CHECK,
          `keywords contains duplicates (${kw.length} entries, ${unique.size} unique)`,
        );
      }
      const badKeyword = kw.find((k) => !isString(k) || !KEYWORD_PATTERN.test(k));
      if (badKeyword !== undefined) {
        fail(
          out,
          filePath,
          CHECK,
          `every keyword must match ^[a-z][a-z0-9-]*$ — got: ${String(badKeyword)}`,
        );
      }
    }
  }

  return out;
}

// ── marketplace.json validation ───────────────────────────────────────────────

function validateMarketplace(filePath: string, data: Record<string, unknown>): Finding[] {
  const out: Finding[] = [];
  const CHECK = "manifests-marketplace";

  // ── required fields ────────────────────────────────────────────────────────
  const name = data["name"];
  if (name === undefined || name === null) {
    fail(out, filePath, CHECK, `required field missing — name`);
  } else if (!isString(name)) {
    fail(out, filePath, CHECK, `name must be a string`);
  } else if (!NAME_PATTERN.test(name)) {
    fail(out, filePath, CHECK, `name (${name}) does not match pattern ^[a-z][a-z0-9-]*$`);
  }

  const owner = data["owner"];
  if (owner === undefined || owner === null) {
    fail(out, filePath, CHECK, `required field missing — owner`);
  } else if (!isRecord(owner)) {
    fail(out, filePath, CHECK, `owner must be an object`);
  } else {
    if (!isString(owner["name"])) {
      fail(out, filePath, CHECK, `required field missing — owner.name`);
    }
    if (!isString(owner["url"])) {
      fail(out, filePath, CHECK, `required field missing — owner.url`);
    }
  }

  // ── plugins array ──────────────────────────────────────────────────────────
  const plugins = data["plugins"];
  if (plugins === undefined || plugins === null) {
    fail(out, filePath, CHECK, `required field missing — plugins`);
  } else if (!isArray(plugins)) {
    fail(out, filePath, CHECK, `plugins must be an array`);
  } else {
    if (plugins.length < 1) {
      fail(out, filePath, CHECK, `plugins count ${plugins.length} < minItems 1`);
    }
    for (let i = 0; i < plugins.length; i++) {
      const p = plugins[i];
      if (!isRecord(p)) {
        fail(out, filePath, CHECK, `plugins[${i}] must be an object`);
        continue;
      }
      for (const field of ["name", "source", "version"] as const) {
        const val = p[field];
        if (val === undefined || val === null) {
          fail(out, filePath, CHECK, `required field missing — plugins[${i}].${field}`);
        } else if (!isString(val)) {
          fail(out, filePath, CHECK, `plugins[${i}].${field} must be a string`);
        }
      }
    }
  }

  return out;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Validate `.claude-plugin/plugin.json` (and optionally
 * `.claude-plugin/marketplace.json`) under `root`.
 *
 * Returns all findings (severity "error" for violations). An empty array
 * means both files are valid. Never throws.
 *
 * `root` is the repository/plugin root — the directory that contains
 * `.claude-plugin/`. For the engine integration this is resolved before
 * the call; for the CLI it defaults to the resolved vault's parent repo.
 */
export function checkManifests(root: string): Finding[] {
  const out: Finding[] = [];

  const pluginPath = join(root, ".claude-plugin", "plugin.json");
  const [pluginData, pluginErr] = parseJsonFile(pluginPath);

  if (pluginErr !== null) {
    out.push({
      severity: "error",
      check: "manifests-plugin",
      message: pluginErr,
      file: pluginPath,
    });
    // Even if plugin.json is broken, still try marketplace.json below.
  } else if (isRecord(pluginData)) {
    out.push(...validatePlugin(pluginPath, pluginData));
  } else {
    out.push({
      severity: "error",
      check: "manifests-plugin",
      message: `${pluginPath}: root must be a JSON object`,
      file: pluginPath,
    });
  }

  const marketplacePath = join(root, ".claude-plugin", "marketplace.json");
  if (existsSync(marketplacePath)) {
    const [marketplaceData, marketplaceErr] = parseJsonFile(marketplacePath);
    if (marketplaceErr !== null) {
      out.push({
        severity: "error",
        check: "manifests-marketplace",
        message: marketplaceErr,
        file: marketplacePath,
      });
    } else if (isRecord(marketplaceData)) {
      out.push(...validateMarketplace(marketplacePath, marketplaceData));
    } else {
      out.push({
        severity: "error",
        check: "manifests-marketplace",
        message: `${marketplacePath}: root must be a JSON object`,
        file: marketplacePath,
      });
    }
  }

  return out;
}
