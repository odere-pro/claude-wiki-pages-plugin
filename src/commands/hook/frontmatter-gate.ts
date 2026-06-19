/**
 * frontmatter-gate — the hook-mode decision logic that
 * scripts/validate-frontmatter.sh ran inline (lines 408-447), now in the engine.
 *
 * This is the "firewall-adjacent engine entry" half of the gate: it consumes a
 * parsed HookInput plus the resolved vault and returns a HookDecision the CLI
 * serialises into the `{"decision":"block","reason":…}` contract. The pure
 * per-page rules live in src/core/frontmatter-validate.ts (validateContent);
 * this module adds only the hook-specific wrapping the bash hook performed:
 *
 *   1. Path filter — gate only markdown under `<vaultName>/wiki/`; else allow
 *      (the bash `exit 0` pass-through for non-wiki / non-markdown writes).
 *   2. Edit tool — block when old_string carried a required frontmatter field
 *      that new_string drops (the bash `for field in …` loop).
 *   3. Write tool — empty content → allow; else run validateContent and block on
 *      its first message (verbatim reason).
 *
 * Schema resolution mirrors the bash `_resolve_schema_file`: the vault's
 * CLAUDE.md table when it carries the "### Required fields by type" heading,
 * else the bundled runtime template skills/init/template/CLAUDE.md. Fail-closed
 * (a block) when neither carries a usable table — never silently allow.
 *
 * No `any`; the HookInput is already narrowed at the boundary
 * (src/core/hook-input.ts). Deterministic: same input + schema → same decision.
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { HookInput } from "../../core/hook-input.ts";
import { readFileSafe } from "../../core/fs.ts";
import { validateContent } from "../../core/frontmatter-validate.ts";

/** The decision a hook gate returns; the CLI maps `block` → the block JSON. */
export interface HookDecision {
  /** True → emit `{"decision":"block","reason":…}`; false → allow (exit 0). */
  readonly block: boolean;
  /** The block reason (validateContent message or the Edit-removal message). */
  readonly reason?: string;
}

/** Frozen allow decision (the bash `exit 0` with no stdout). */
const ALLOW: HookDecision = Object.freeze({ block: false });

/**
 * The required frontmatter fields an Edit must not silently drop. This mirrors
 * the bash hook's hardcoded `for field in …` list (validate-frontmatter.sh:427)
 * verbatim — the Edit path is a fast structural guard, not a full re-validation.
 */
const EDIT_GUARDED_FIELDS = [
  "type",
  "title",
  "source_type",
  "entity_type",
  "synthesis_type",
  "parent",
  "path",
  "sources",
  "status",
  "confidence",
  "created",
  "updated",
] as const;

export interface FrontmatterGateOptions {
  /** Absolute path to the resolved active vault root. */
  readonly vault: string;
  /** Basename of the resolved vault (the bash `$VAULT_NAME`), for the path filter. */
  readonly vaultName: string;
  /** The parsed, boundary-narrowed hook payload. */
  readonly input: HookInput;
  /**
   * Path to the bundled runtime template used as the fallback schema source.
   * Defaults to skills/init/template/CLAUDE.md relative to this file, matching
   * the bash `_BUNDLED_SCHEMA`. Injectable for tests.
   */
  readonly bundledSchemaPath?: string;
}

/** True when `<path>` is a markdown file under `…/<vaultName>/wiki/…`. */
function isGatedWikiPath(filePath: string, vaultName: string): boolean {
  if (!filePath.endsWith(".md")) return false;
  return filePath.includes(`/${vaultName}/wiki/`);
}

/**
 * Compute the wiki-relative path the bash hook derived by stripping everything
 * up to and including the LAST occurrence of `/<vaultName>/wiki/` (the bash
 * sed substitution), leaving the path validateContent's `path:` check uses.
 */
function wikiRelative(filePath: string, vaultName: string): string {
  const marker = `/${vaultName}/wiki/`;
  const idx = filePath.lastIndexOf(marker);
  if (idx === -1) return filePath;
  return filePath.slice(idx + marker.length);
}

/** True when `text` contains a `^<field>:` line (bash `grep -q "^${field}:"`). */
function hasFieldLine(text: string, field: string): boolean {
  return new RegExp(`(^|\\n)${escapeRegExp(field)}:`).test(text);
}

/** Escape a literal field name for safe embedding in a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Default bundled-template path (mirrors the bash `_BUNDLED_SCHEMA`).
 *
 * Must resolve correctly whether the engine runs from source
 * (src/commands/hook/frontmatter-gate.ts) or from the bundled artifact
 * (dist/cli.js) — a fixed `../../../` relative path would break under the
 * bundle. Resolution order:
 *   1. $CLAUDE_PLUGIN_ROOT/skills/init/template/CLAUDE.md (set by the hook env).
 *   2. Walk up from this module's directory until a
 *      skills/init/template/CLAUDE.md is found (works from src/ and dist/).
 * Returns the best candidate even if absent; the caller's existsSync guard then
 * falls through to fail-closed, matching the bash "bundled template unreadable"
 * branch.
 */
function defaultBundledSchema(): string {
  const rel = join("skills", "init", "template", "CLAUDE.md");
  const fromEnv = process.env["CLAUDE_PLUGIN_ROOT"];
  if (fromEnv !== undefined && fromEnv !== "") {
    const candidate = join(fromEnv, rel);
    if (existsSync(candidate)) return candidate;
  }
  let dir = import.meta.dir;
  // Walk up to the filesystem root looking for the shipped template.
  for (let i = 0; i < 12; i++) {
    const candidate = join(dir, rel);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Last resort: the env-root candidate (may not exist → caller fails closed).
  return fromEnv !== undefined && fromEnv !== "" ? join(fromEnv, rel) : join(import.meta.dir, rel);
}

/** True when `schemaFile` carries the "### Required fields by type" heading. */
function hasRequiredFieldsHeading(schemaFile: string): boolean {
  if (!existsSync(schemaFile)) return false;
  const content = readFileSafe(schemaFile);
  if (content === null) return false;
  return /^### Required fields by type\s*$/m.test(content);
}

/**
 * Resolve the schema document to validate against, mirroring the bash
 * `_resolve_schema_file`: the vault's CLAUDE.md when it carries the heading,
 * else the bundled template. Returns null when neither does (caller fails
 * closed — validateContent itself also fails closed on an absent table).
 *
 * Exported so the CLI batch validator (frontmatter-cli.ts) reuses the exact
 * same resolution + bundled-template fallback as the hook gate — one mechanism,
 * no second copy of the fallback logic (TEAM-BRIEF §5 DRY / single-sourcing).
 */
export function resolveSchemaFile(vault: string, bundled: string): string | null {
  const vaultSchema = `${vault.replace(/\/+$/, "")}/CLAUDE.md`;
  if (hasRequiredFieldsHeading(vaultSchema)) return vaultSchema;
  if (hasRequiredFieldsHeading(bundled)) return bundled;
  return null;
}

/**
 * The hook-mode frontmatter gate decision.
 *
 * Returns an allow/block decision matching scripts/validate-frontmatter.sh's
 * hook mode exactly. The reason string, when blocking, is the validateContent
 * message (or the Edit-removal message) verbatim, so the user-facing copy is
 * unchanged from the bash hook.
 */
export function frontmatterGate(opts: FrontmatterGateOptions): HookDecision {
  const { vault, vaultName, input } = opts;

  // Rule 1: path filter — only gate markdown under <vaultName>/wiki/.
  if (!isGatedWikiPath(input.filePath, vaultName)) return ALLOW;

  // Rule 2: Edit tool — block a drop of a required field; never re-validate body.
  if (input.toolName === "Edit") {
    if (input.oldString === "") return ALLOW;
    for (const field of EDIT_GUARDED_FIELDS) {
      if (hasFieldLine(input.oldString, field) && !hasFieldLine(input.newString, field)) {
        return Object.freeze({
          block: true,
          reason: `Edit removes required frontmatter field: ${field}. Preserve all required fields.`,
        });
      }
    }
    return ALLOW;
  }

  // Rule 3: Write tool — empty content → allow (bash empty-content guard).
  if (input.content === "") return ALLOW;

  // Resolve the schema document (vault table, else bundled template).
  const bundled = opts.bundledSchemaPath ?? defaultBundledSchema();
  const schemaFile = resolveSchemaFile(vault, bundled);
  // validateContent is fail-closed when the schema/table is absent; passing a
  // nonexistent path makes it emit the "cannot validate" block message.
  const schemaPath = schemaFile ?? `${vault.replace(/\/+$/, "")}/CLAUDE.md`;

  const wikiRel = wikiRelative(input.filePath, vaultName);
  const message = validateContent(wikiRel, input.content, schemaPath);
  if (message !== null) return Object.freeze({ block: true, reason: message });

  return ALLOW;
}

export { defaultBundledSchema };
